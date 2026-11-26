import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { goBackSafe } from '../../navigation/hooks';
import type { ProfileStackParamList } from '../../navigation/types';
import { mobileApiClient } from '../../utils/mobileApiClient';
import {
  InboxButton,
  InboxError,
  InboxField,
  InboxLoading,
  inboxStyles as styles,
} from './components/PortfolioInboxControls';
import {
  canManageInbox,
  inboxError,
  inboxLabel,
  isPortfolioStaff,
  listKey,
  portfolioInboxKey,
  PROPERTIES_PAGE_SIZE,
  propertyLabel,
  ticketDetailKey,
  ticketPriorities,
  ticketStatuses,
  TICKET_LIMIT,
} from './components/portfolioInboxModel';
import type {
  InboxProperties,
  PortfolioAccess,
  Ticket,
  TicketDetail,
  TicketPriority,
  TicketStatus,
  Workspace,
  WorkspaceAccess,
} from './components/portfolioInboxModel';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PortfolioInbox'>;
type Entry = { ticketId?: string; orgId?: string };
type ViewMode = 'inbox' | 'create' | 'detail';
type TicketFilter = 'all' | TicketStatus;
const PORTFOLIO_PATH = '/portfolio';
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

function getWebPortfolioUrl() {
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (configured) {
    try {
      const base = new URL(configured);
      if (base.protocol === 'https:' && !base.username && !base.password) {
        return new URL(PORTFOLIO_PATH, base.origin).toString();
      }
    } catch {
      // Fall back to the canonical website if no valid web origin is set.
    }
  }
  return 'https://www.mintenance.co.uk' + PORTFOLIO_PATH;
}

export function PortfolioInboxScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const leave = () => goBackSafe(navigation, 'Properties');
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <InboxButton label='Back to properties' onPress={leave} back />
      </View>
      {user?.id ? (
        <PortfolioInbox
          key={user.id}
          userId={user.id}
          entry={route.params}
          openAssessment={(assessmentId, propertyId) =>
            navigation.navigate('AssessmentDetail', {
              assessmentId,
              propertyId,
            })
          }
        />
      ) : (
        <InboxError message='Sign in to open your Portfolio Inbox.' />
      )}
    </SafeAreaView>
  );
}

type OpenAssessment = (assessmentId: string, propertyId: string) => void;

function PortfolioInbox({
  userId,
  entry,
  openAssessment,
}: {
  userId: string;
  entry?: Entry;
  openAssessment: OpenAssessment;
}) {
  const client = useQueryClient();
  const scroll = useRef<ScrollView>(null);
  const resetScroll = useCallback(() => {
    scroll.current?.scrollTo?.({ y: 0, animated: false });
  }, []);
  const [selection, setSelection] = useState<string>();
  const [showSetup, setShowSetup] = useState(false);
  const [webError, setWebError] = useState(false);
  const access = useQuery({
    queryKey: [...portfolioInboxKey(userId), 'access'],
    queryFn: ({ signal }) =>
      mobileApiClient.get<PortfolioAccess>('/api/portfolio/access', { signal }),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const workspaces = useQuery({
    queryKey: [...portfolioInboxKey(userId), 'workspace'],
    enabled:
      access.isFetchedAfterMount &&
      access.data?.allowed === true &&
      !access.isError,
    queryFn: ({ signal }) =>
      mobileApiClient.get<WorkspaceAccess>('/api/portfolio/workspace', {
        signal,
      }),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const staffSpaces =
    workspaces.data?.workspaces.filter((space) =>
      isPortfolioStaff(space.role)
    ) ?? [];
  const availableEntryWorkspace = staffSpaces.find(
    (space) => space.id === entry?.orgId
  );
  const workspace =
    staffSpaces.find((space) => space.id === selection) ??
    availableEntryWorkspace ??
    staffSpaces[0];
  const entryTicket =
    !showSetup && workspace && (!entry?.orgId || workspace.id === entry.orgId)
      ? entry?.ticketId
      : undefined;
  const canSetup =
    !!workspaces.data?.canSetUp && (!workspace || workspace.role === 'owner');
  const refresh = async () => {
    const result = await access.refetch();
    if (result.isSuccess && result.data.allowed) {
      await client.invalidateQueries({
        queryKey: portfolioInboxKey(userId),
        predicate: (query) => query.queryKey[2] !== 'access',
      });
    }
  };
  const onWebSettings = () => {
    setWebError(false);
    void Linking.openURL(getWebPortfolioUrl()).catch(() => setWebError(true));
  };

  useEffect(() => {
    setSelection(undefined);
    setShowSetup(false);
  }, [entry?.orgId, entry?.ticketId]);

  useEffect(() => {
    resetScroll();
  }, [resetScroll, showSetup]);

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
        refreshControl={
          <RefreshControl
            refreshing={access.isRefetching || workspaces.isRefetching}
            onRefresh={() => void refresh()}
          />
        }
      >
        <View>
          <Text style={styles.eyebrow}>PROPERTY MANAGEMENT</Text>
          <Text accessibilityRole='header' style={styles.title}>
            Portfolio Inbox
          </Text>
          <Text style={styles.muted}>
            Track internal maintenance tickets with your team. These are
            separate from the Maintenance action queue and marketplace jobs.
          </Text>
        </View>
        {access.isError ? (
          <InboxError
            message={inboxError(
              access.error,
              'Could not check Portfolio access.'
            )}
            retry={() => void refresh()}
          />
        ) : access.isPending || !access.isFetchedAfterMount ? (
          <InboxLoading message='Checking Portfolio access' />
        ) : !access.data.allowed ? (
          <View style={styles.panel}>
            <Text style={styles.heading}>Portfolio access needed</Text>
            <Text style={styles.muted}>
              If you were invited, accept the workspace invitation with this
              account and ask the owner to confirm your access.
            </Text>
            <InboxButton
              label='Check access on the website'
              onPress={onWebSettings}
            />
          </View>
        ) : workspaces.isError ? (
          <InboxError
            message={inboxError(
              workspaces.error,
              'Could not load your workspaces.'
            )}
            retry={() => void refresh()}
          />
        ) : !workspaces.isFetchedAfterMount || !workspaces.data ? (
          <InboxLoading message='Loading workspaces' />
        ) : (
          <>
            {staffSpaces.length > 0 && (
              <View style={styles.panel}>
                <Text accessibilityRole='header' style={styles.heading}>
                  Workspace
                </Text>
                <View style={styles.buttons}>
                  {staffSpaces.map((space) => (
                    <InboxButton
                      key={space.id}
                      label={space.name}
                      selected={workspace?.id === space.id}
                      onPress={() => {
                        setSelection(space.id);
                        setShowSetup(false);
                      }}
                    />
                  ))}
                </View>
                {workspace && (
                  <Text style={styles.muted}>
                    Role: {inboxLabel(workspace.role)}
                  </Text>
                )}
                {workspace?.role === 'owner' && (
                  <View style={styles.buttons}>
                    {canSetup && (
                      <InboxButton
                        label={showSetup ? 'Return to inbox' : 'Add a property'}
                        onPress={() => setShowSetup((value) => !value)}
                      />
                    )}
                    <InboxButton
                      label='Manage teammates on the website'
                      onPress={onWebSettings}
                    />
                  </View>
                )}
              </View>
            )}

            {entry?.ticketId && entry.orgId && !availableEntryWorkspace && (
              <InboxError message="This ticket's workspace is not available to this account." />
            )}

            {canSetup && (showSetup || !workspace) ? (
              <WorkspaceSetup
                key={workspace?.id ?? 'new'}
                data={workspaces.data}
                workspace={workspace}
                onComplete={(orgId) => {
                  setSelection(orgId);
                  setShowSetup(false);
                  void client.invalidateQueries({
                    queryKey: [...portfolioInboxKey(userId), 'workspace'],
                  });
                  void client.invalidateQueries({
                    queryKey: [
                      ...portfolioInboxKey(userId),
                      'properties',
                      orgId,
                    ],
                  });
                }}
              />
            ) : workspace ? (
              <WorkspaceInbox
                key={workspace.id}
                userId={userId}
                workspace={workspace}
                entryTicket={entryTicket}
                resetScroll={resetScroll}
                openAssessment={openAssessment}
              />
            ) : (
              <View style={styles.panel}>
                <Text style={styles.heading}>No staff workspace yet</Text>
                <Text style={styles.muted}>
                  Ask a workspace owner to invite you, then accept that
                  invitation and refresh this page.
                </Text>
                <InboxButton
                  label='Refresh workspace access'
                  onPress={() => void refresh()}
                />
              </View>
            )}
          </>
        )}
        {webError && (
          <InboxError message='Could not open the website. Sign in at mintenance.co.uk and open Portfolio.' />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function WorkspaceSetup({
  data,
  workspace,
  onComplete,
}: {
  data: WorkspaceAccess;
  workspace?: Workspace;
  onComplete: (orgId: string) => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'create' | 'link'>(
    workspace ? 'link' : 'create'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const selectedProperty = data.unlinkedProperties.find(
    (property) => property.id === propertyId
  );
  const valid =
    !!selectedProperty &&
    (mode === 'link' ? workspace?.role === 'owner' : name.trim().length >= 2);
  const submit = async () => {
    if (running.current || !valid || !data.canSetUp) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await mobileApiClient.post<{ orgId: string }>(
        '/api/portfolio/workspace',
        {
          propertyId,
          workspace:
            mode === 'link' && workspace
              ? { action: 'link', orgId: workspace.id }
              : { action: 'create', name: name.trim() },
        }
      );
      onComplete(result.orgId);
    } catch (failure) {
      setError(
        inboxError(
          failure,
          'Could not confirm the workspace change. Refresh before trying again.'
        )
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={styles.panel}>
      <Text accessibilityRole='header' style={styles.heading}>
        {workspace ? 'Set up a property' : 'Set up Portfolio'}
      </Text>
      <Text style={styles.muted}>
        Link a property you own to a staff workspace so the team can use it for
        internal tickets.
      </Text>
      {!data.unlinkedProperties.length ? (
        <Text style={styles.muted}>
          No unlinked owned properties. Add a property in Properties, then
          return here.
        </Text>
      ) : (
        <>
          {workspace?.role === 'owner' && (
            <View style={styles.buttons}>
              <InboxButton
                label='Use this workspace'
                selected={mode === 'link'}
                onPress={() => setMode('link')}
                disabled={busy}
              />
              <InboxButton
                label='Create a workspace'
                selected={mode === 'create'}
                onPress={() => setMode('create')}
                disabled={busy}
              />
            </View>
          )}
          {mode === 'create' && (
            <InboxField
              label='Workspace name'
              value={name}
              onChange={setName}
              maxLength={100}
              disabled={busy}
            />
          )}
          <Text style={styles.text}>Property to add</Text>
          <View style={styles.buttons}>
            {data.unlinkedProperties.map((property) => (
              <InboxButton
                key={property.id}
                label={propertyLabel(property)}
                selected={property.id === propertyId}
                onPress={() => setPropertyId(property.id)}
                disabled={busy}
              />
            ))}
          </View>
          {error ? (
            <Text accessibilityRole='alert' style={styles.error}>
              {error}
            </Text>
          ) : null}
          <InboxButton
            label={
              busy
                ? 'Saving workspace…'
                : mode === 'create'
                  ? 'Create workspace and add property'
                  : 'Add to this workspace'
            }
            onPress={() => void submit()}
            disabled={busy || !valid}
            primary
          />
        </>
      )}
    </View>
  );
}

function WorkspaceInbox({
  userId,
  workspace,
  entryTicket,
  resetScroll,
  openAssessment,
}: {
  userId: string;
  workspace: Workspace;
  entryTicket?: string;
  resetScroll: () => void;
  openAssessment: OpenAssessment;
}) {
  const client = useQueryClient();
  const [mode, setMode] = useState<ViewMode>(entryTicket ? 'detail' : 'inbox');
  const [ticketId, setTicketId] = useState(entryTicket ?? '');
  const [filter, setFilter] = useState<TicketFilter>('all');
  const canManage = canManageInbox(workspace.role);
  const key = listKey(userId, workspace.id);

  useEffect(() => {
    if (entryTicket) {
      setTicketId(entryTicket);
      setMode('detail');
    }
  }, [entryTicket]);

  useEffect(() => {
    resetScroll();
  }, [mode, resetScroll, ticketId]);

  const ticketList = useQuery({
    queryKey: [...key, filter],
    enabled: mode === 'inbox',
    queryFn: ({ signal }) =>
      mobileApiClient.get<{ tickets: Ticket[] }>(
        '/api/portfolio/tickets?orgId=' +
          encodeURIComponent(workspace.id) +
          '&limit=' +
          TICKET_LIMIT +
          (filter !== 'all' ? '&status=' + filter : ''),
        { signal }
      ),
    retry: false,
  });

  if (mode === 'create' && canManage) {
    return (
      <CreateTicket
        userId={userId}
        workspace={workspace}
        onBack={() => setMode('inbox')}
        onSaved={(ticket) => {
          void client.invalidateQueries({ queryKey: key });
          setTicketId(ticket.id);
          setMode('detail');
        }}
      />
    );
  }
  if (mode === 'detail' && ticketId) {
    return (
      <TicketScreen
        key={ticketId}
        userId={userId}
        workspace={workspace}
        ticketId={ticketId}
        onBack={() => setMode('inbox')}
        openAssessment={openAssessment}
      />
    );
  }

  return (
    <View style={styles.panel}>
      <Text accessibilityRole='header' style={styles.heading}>
        Internal tickets
      </Text>
      {canManage ? (
        <InboxButton
          label='New internal ticket'
          primary
          onPress={() => setMode('create')}
        />
      ) : (
        <Text style={styles.muted}>
          Read-only access. Workspace managers can create or update tickets.
        </Text>
      )}
      <Text style={styles.text}>Filter by status</Text>
      <View style={styles.buttons}>
        {(['all', ...ticketStatuses] as const).map((value) => (
          <InboxButton
            key={value}
            label={value === 'all' ? 'All statuses' : inboxLabel(value)}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>
      {ticketList.isError ? (
        <InboxError
          message={inboxError(ticketList.error, 'Could not load tickets.')}
          retry={() => void ticketList.refetch()}
        />
      ) : ticketList.isPending ? (
        <InboxLoading message='Loading tickets' />
      ) : ticketList.data.tickets.length === 0 ? (
        <Text accessibilityLiveRegion='polite' style={styles.muted}>
          {filter === 'all'
            ? 'No internal tickets in this workspace yet.'
            : 'No internal tickets match this status.'}
        </Text>
      ) : (
        <>
          {ticketList.data.tickets.map((ticket) => (
            <Pressable
              key={ticket.id}
              accessibilityRole='button'
              onPress={() => {
                setTicketId(ticket.id);
                setMode('detail');
              }}
              style={styles.item}
            >
              <Text style={styles.heading}>{ticket.title}</Text>
              <Text style={styles.muted}>
                {inboxLabel(ticket.status)} · {inboxLabel(ticket.priority)}{' '}
                priority
              </Text>
              <Text numberOfLines={2} style={styles.muted}>
                {ticket.description}
              </Text>
            </Pressable>
          ))}
          {ticketList.data.tickets.length === TICKET_LIMIT && (
            <Text style={styles.muted}>
              Showing the newest {TICKET_LIMIT} matching tickets. Use a status
              filter to narrow this list.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

function CreateTicket({
  userId,
  workspace,
  onBack,
  onSaved,
}: {
  userId: string;
  workspace: Workspace;
  onBack: () => void;
  onSaved: (ticket: Ticket) => void;
}) {
  const [page, setPage] = useState(1);
  const [property, setProperty] = useState<{ id: string; label: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const properties = useQuery({
    queryKey: [...portfolioInboxKey(userId), 'properties', workspace.id, page],
    queryFn: ({ signal }) =>
      mobileApiClient.get<InboxProperties>(
        '/api/portfolio/properties?orgId=' +
          encodeURIComponent(workspace.id) +
          '&page=' +
          page +
          '&limit=' +
          PROPERTIES_PAGE_SIZE,
        { signal }
      ),
    retry: false,
  });
  const valid =
    !!property && title.trim().length >= 3 && description.trim().length >= 10;
  const submit = async () => {
    if (
      running.current ||
      !valid ||
      !property ||
      !canManageInbox(workspace.role)
    )
      return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await mobileApiClient.post<{ ticket: Ticket }>(
        '/api/portfolio/tickets',
        {
          orgId: workspace.id,
          propertyId: property.id,
          title: title.trim(),
          description: description.trim(),
          category: category.trim() || 'general',
          priority,
        }
      );
      onSaved(result.ticket);
    } catch (failure) {
      setError(
        inboxError(
          failure,
          'Could not confirm ticket creation. Check the inbox before trying again.'
        )
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={styles.panel}>
      <InboxButton
        label='Back to tickets'
        onPress={onBack}
        disabled={busy}
        back
      />
      <Text accessibilityRole='header' style={styles.heading}>
        New internal ticket
      </Text>
      <Text style={styles.muted}>
        This does not post a marketplace job or move any money.
      </Text>
      <Text style={styles.text}>Property</Text>
      {property && <Text style={styles.muted}>Selected: {property.label}</Text>}
      {properties.isError ? (
        <InboxError
          message={inboxError(
            properties.error,
            'Could not load workspace properties.'
          )}
          retry={() => void properties.refetch()}
        />
      ) : properties.isPending ? (
        <InboxLoading message='Loading workspace properties' />
      ) : properties.data.properties.length === 0 ? (
        <Text style={styles.muted}>
          No properties on this page. Ask the workspace owner to add one if
          needed.
        </Text>
      ) : (
        <View style={styles.buttons}>
          {properties.data.properties.map((item) => (
            <InboxButton
              key={item.id}
              label={propertyLabel(item)}
              selected={property?.id === item.id}
              onPress={() =>
                setProperty({ id: item.id, label: propertyLabel(item) })
              }
              disabled={busy}
            />
          ))}
        </View>
      )}
      <View style={styles.buttons}>
        {page > 1 && (
          <InboxButton
            label='Previous properties'
            onPress={() => setPage(page - 1)}
            disabled={busy}
          />
        )}
        {!properties.isError && properties.data?.pagination.hasMore && (
          <InboxButton
            label='More properties'
            onPress={() => setPage(page + 1)}
            disabled={busy}
          />
        )}
      </View>
      <InboxField
        label='Ticket title'
        value={title}
        onChange={setTitle}
        maxLength={200}
        disabled={busy}
      />
      <InboxField
        label='Description (at least 10 characters)'
        value={description}
        onChange={setDescription}
        maxLength={5000}
        multiline
        disabled={busy}
      />
      <InboxField
        label='Category (optional)'
        value={category}
        onChange={setCategory}
        maxLength={100}
        disabled={busy}
      />
      <PriorityButtons
        priority={priority}
        onChange={setPriority}
        disabled={busy}
      />
      {error ? (
        <Text accessibilityRole='alert' style={styles.error}>
          {error}
        </Text>
      ) : null}
      <InboxButton
        label={busy ? 'Creating ticket…' : 'Create internal ticket'}
        onPress={() => void submit()}
        disabled={!valid || busy || properties.isError}
        primary
      />
    </View>
  );
}

function PriorityButtons({
  priority,
  onChange,
  disabled,
}: {
  priority: TicketPriority;
  onChange: (value: TicketPriority) => void;
  disabled: boolean;
}) {
  return (
    <>
      <Text style={styles.text}>Priority</Text>
      <View style={styles.buttons}>
        {ticketPriorities.map((value) => (
          <InboxButton
            key={value}
            label={inboxLabel(value)}
            selected={priority === value}
            onPress={() => onChange(value)}
            disabled={disabled}
          />
        ))}
      </View>
    </>
  );
}

function TicketScreen({
  userId,
  workspace,
  ticketId,
  onBack,
  openAssessment,
}: {
  userId: string;
  workspace: Workspace;
  ticketId: string;
  onBack: () => void;
  openAssessment: OpenAssessment;
}) {
  const detail = useQuery({
    queryKey: ticketDetailKey(userId, workspace.id, ticketId),
    queryFn: async ({ signal }) => {
      const result = await mobileApiClient.get<TicketDetail>(
        '/api/portfolio/tickets/' + encodeURIComponent(ticketId),
        { signal }
      );
      if (
        result.ticket.org_id !== workspace.id ||
        result.ticket.id !== ticketId
      ) {
        throw Object.assign(new Error('Workspace mismatch'), {
          statusCode: 403,
        });
      }
      return result;
    },
    retry: false,
  });
  const sourceAssessmentId = detail.data?.assessmentSource?.id;
  const sourcePropertyId = detail.data?.ticket.property_id;
  return (
    <View style={styles.panel}>
      <InboxButton label='Back to tickets' onPress={onBack} back />
      {detail.isError ? (
        <InboxError
          message={inboxError(detail.error, 'Could not load this ticket.')}
          retry={() => void detail.refetch()}
        />
      ) : detail.isPending ? (
        <InboxLoading message='Loading ticket' />
      ) : (
        <>
          <Text accessibilityRole='header' style={styles.heading}>
            {detail.data.ticket.title}
          </Text>
          <Text style={styles.muted}>
            {inboxLabel(detail.data.ticket.status)} ·{' '}
            {inboxLabel(detail.data.ticket.priority)} priority ·{' '}
            {inboxLabel(detail.data.ticket.category)}
          </Text>
          <Text style={styles.text}>{detail.data.ticket.description}</Text>
          {sourceAssessmentId &&
            sourcePropertyId &&
            UUID.test(sourceAssessmentId) &&
            UUID.test(sourcePropertyId) && (
              <InboxButton
                label='Open source assessment'
                onPress={() =>
                  openAssessment(sourceAssessmentId, sourcePropertyId)
                }
              />
            )}
          {canManageInbox(workspace.role) && (
            <TicketEditor
              userId={userId}
              workspace={workspace}
              ticket={detail.data.ticket}
            />
          )}
          <Text accessibilityRole='header' style={styles.heading}>
            History
          </Text>
          {detail.data.updates.length ? (
            detail.data.updates.map((update) => (
              <View style={styles.item} key={update.id}>
                <Text style={styles.text}>
                  {inboxLabel(update.update_type)} ·{' '}
                  {update.visibility === 'internal'
                    ? 'Internal'
                    : 'Tenant visible'}
                </Text>
                {update.body && <Text style={styles.muted}>{update.body}</Text>}
                <Text style={styles.muted}>
                  {new Date(update.created_at).toLocaleDateString('en-GB')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No updates yet.</Text>
          )}
        </>
      )}
    </View>
  );
}

function TicketEditor({
  userId,
  workspace,
  ticket,
}: {
  userId: string;
  workspace: Workspace;
  ticket: Ticket;
}) {
  const client = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>();
  const [priority, setPriority] = useState<TicketPriority>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const running = useRef(false);
  const change = {
    ...(status && status !== ticket.status ? { status } : {}),
    ...(priority && priority !== ticket.priority ? { priority } : {}),
    ...(note.trim() ? { resolutionNote: note.trim() } : {}),
  };
  const valid = Object.keys(change).length > 0;
  const submit = async () => {
    if (!valid || running.current || !canManageInbox(workspace.role)) return;
    running.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await mobileApiClient.patch<{ ticket: Ticket }>(
        '/api/portfolio/tickets/' + encodeURIComponent(ticket.id),
        change
      );
      const detailKey = ticketDetailKey(userId, workspace.id, ticket.id);
      client.setQueryData<TicketDetail>(detailKey, (current) =>
        current ? { ...current, ticket: result.ticket } : undefined
      );
      setStatus(undefined);
      setPriority(undefined);
      setNote('');
      setMessage('Ticket updated.');
      void client.invalidateQueries({ queryKey: detailKey });
      void client.invalidateQueries({
        queryKey: listKey(userId, workspace.id),
      });
    } catch (failure) {
      setError(
        inboxError(
          failure,
          'Could not confirm the update. Refresh the ticket before trying again.'
        )
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <Text style={styles.text}>Status</Text>
      <View style={styles.buttons}>
        {ticketStatuses.map((value) => (
          <InboxButton
            key={value}
            label={inboxLabel(value)}
            selected={(status ?? ticket.status) === value}
            onPress={() => setStatus(value)}
            disabled={busy}
          />
        ))}
      </View>
      <PriorityButtons
        priority={priority ?? ticket.priority}
        onChange={setPriority}
        disabled={busy}
      />
      <InboxField
        label='Internal note (optional)'
        value={note}
        onChange={setNote}
        maxLength={5000}
        disabled={busy}
        multiline
      />
      {error ? (
        <Text accessibilityRole='alert' style={styles.error}>
          {error}
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion='polite' style={styles.muted}>
          {message}
        </Text>
      ) : null}
      <InboxButton
        label={busy ? 'Saving ticket…' : 'Save ticket changes'}
        onPress={() => void submit()}
        disabled={!valid || busy}
        primary
      />
    </>
  );
}
