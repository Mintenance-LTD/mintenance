import React, { useState } from 'react';
import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
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
  type PortfolioAccess,
  type Workspace,
  type WorkspaceAccess,
} from './components/portfolioInboxModel';
import { amountLabel } from './components/portfolioWorkOrderModel';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AgencyCrm'>;
type Landlord = {
  id: string;
  displayName: string;
  approvalLimitPence: number | null;
  primaryManagerId: string | null;
  backupManagerId: string | null;
  propertyIds: string[];
};
type Directory = {
  landlords: Landlord[];
  staff: { id: string; name: string }[];
  properties: { id: string; name: string; landlordId: string | null }[];
  canEdit: boolean;
};

const PAGE_SIZE = 20;
const PRODUCTION_WEB_HOST = 'www.mintenance.co.uk';

function crmWebUrl(workspaceId: string) {
  const production = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  const rawUrl =
    configured || (production ? 'https://' + PRODUCTION_WEB_HOST : undefined);
  if (!rawUrl) return null;
  try {
    const base = new URL(rawUrl);
    if (
      base.protocol !== 'https:' ||
      !base.hostname ||
      base.username ||
      base.password
    )
      return null;
    const hostname = base.hostname.replace(/\.$/, '');
    if (!production && /(^|\.)mintenance\.co\.uk$/i.test(hostname)) return null;
    return (
      'https://' +
      base.host +
      '/portfolio?orgId=' +
      encodeURIComponent(workspaceId) +
      '&view=crm'
    );
  } catch {
    return null;
  }
}

export function AgencyCrmScreen({ navigation }: Props) {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <InboxButton
          label='Back from Agency CRM'
          back
          onPress={() => goBackSafe(navigation, 'Properties')}
        />
      </View>
      {user?.id && user.role === 'homeowner' ? (
        <AgencyCrm key={user.id} userId={user.id} />
      ) : (
        <InboxError message='Sign in with your agency staff account to open Agency CRM.' />
      )}
    </SafeAreaView>
  );
}

const crmKey = (userId: string) => ['agency-crm', userId] as const;

function AgencyCrm({ userId }: { userId: string }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const access = useQuery({
    queryKey: [...crmKey(userId), 'access'],
    queryFn: ({ signal }) =>
      mobileApiClient.get<PortfolioAccess>('/api/portfolio/access', { signal }),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const allowed =
    access.isFetchedAfterMount &&
    !access.isError &&
    access.data?.allowed === true;
  const workspaces = useQuery({
    queryKey: [...crmKey(userId), 'workspace'],
    queryFn: ({ signal }) =>
      mobileApiClient.get<WorkspaceAccess>('/api/portfolio/workspace', {
        signal,
      }),
    enabled: allowed,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const eligible =
    workspaces.data?.workspaces.filter(({ role }) => canManageInbox(role)) ??
    [];
  const workspace = eligible.find(({ id }) => selected === id) ?? eligible[0];

  async function refresh() {
    setRefreshing(true);
    try {
      const permission = await access.refetch();
      if (!permission.isSuccess || !permission.data.allowed) return;
      const verified = await workspaces.refetch();
      if (
        !verified.isSuccess ||
        !workspace ||
        !verified.data.workspaces.some(
          ({ id, role }) => id === workspace.id && canManageInbox(role)
        )
      )
        return;
      await client.invalidateQueries({
        queryKey: [...crmKey(userId), 'directory', workspace.id],
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps='handled'
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />
      }
    >
      <View>
        <Text style={styles.eyebrow}>PROPERTY MANAGEMENT</Text>
        <Text accessibilityRole='header' style={styles.title}>
          Agency CRM
        </Text>
        <Text style={styles.muted}>
          Find the landlord, their properties and who looks after them.
        </Text>
      </View>
      {access.isError ? (
        <InboxError
          message={inboxError(access.error, 'Could not check agency access.')}
          retry={() => void refresh()}
        />
      ) : !access.isFetchedAfterMount || access.isPending ? (
        <InboxLoading message='Checking agency access' />
      ) : !allowed ? (
        <InboxError message='Agency workspace access is required. Ask the workspace owner to confirm your access.' />
      ) : workspaces.isError ? (
        <InboxError
          message={inboxError(
            workspaces.error,
            'Could not load your workspaces.'
          )}
          retry={() => void refresh()}
        />
      ) : !workspaces.isFetchedAfterMount || !workspaces.data ? (
        <InboxLoading message='Loading agency workspaces' />
      ) : !workspace ? (
        <InboxError message='The landlord directory is only available to agency owners, managers and maintenance coordinators.' />
      ) : (
        <>
          {eligible.length > 1 && (
            <View style={styles.panel}>
              <Text accessibilityRole='header' style={styles.heading}>
                Workspace
              </Text>
              <View style={styles.buttons}>
                {eligible.map((item) => (
                  <InboxButton
                    key={item.id}
                    label={item.name}
                    selected={item.id === workspace.id}
                    onPress={() => setSelected(item.id)}
                  />
                ))}
              </View>
            </View>
          )}
          <LandlordDirectory
            key={workspace.id}
            userId={userId}
            workspace={workspace}
          />
        </>
      )}
    </ScrollView>
  );
}

function LandlordDirectory({
  userId,
  workspace,
}: {
  userId: string;
  workspace: Workspace;
}) {
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [webError, setWebError] = useState(false);
  const query = useQuery({
    queryKey: [...crmKey(userId), 'directory', workspace.id],
    queryFn: ({ signal }) =>
      mobileApiClient.get<Directory>(
        '/api/organizations/' +
          encodeURIComponent(workspace.id) +
          '/agency-landlords',
        { signal }
      ),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (query.isError)
    return (
      <InboxError
        message={inboxError(
          query.error,
          'Could not load the landlord directory.'
        )}
        retry={() => void query.refetch()}
      />
    );
  if (!query.isFetchedAfterMount || !query.data)
    return <InboxLoading message='Loading landlord directory' />;

  const data = query.data;
  const staff = new Map(data.staff.map(({ id, name }) => [id, name]));
  const properties = new Map(data.properties.map(({ id, name }) => [id, name]));
  const labels = (ids: string[]) =>
    ids.map((id) => properties.get(id) ?? 'Property unavailable');
  const manager = (id: string | null) =>
    id ? (staff.get(id) ?? 'No longer active') : 'Unassigned';
  const needle = search.trim().toLocaleLowerCase('en-GB');
  const records = data.landlords.filter(
    (landlord) =>
      !needle ||
      [landlord.displayName, ...labels(landlord.propertyIds)].some((text) =>
        text.toLocaleLowerCase('en-GB').includes(needle)
      )
  );
  const editUrl =
    data.canEdit && ['owner', 'manager'].includes(workspace.role)
      ? crmWebUrl(workspace.id)
      : null;

  return (
    <View style={styles.panel}>
      <Text accessibilityRole='header' style={styles.heading}>
        Landlord directory
      </Text>
      <Text style={styles.muted}>
        {workspace.name} · Staff only · Read-only on mobile
      </Text>
      {editUrl && (
        <InboxButton
          label='Edit directory on the web'
          onPress={() => {
            setWebError(false);
            void Linking.openURL(editUrl).catch(() => setWebError(true));
          }}
        />
      )}
      {webError && <InboxError message='Could not open the web directory.' />}
      {data.landlords.length > 0 && (
        <InboxField
          label='Search by landlord or property'
          value={search}
          maxLength={160}
          onChange={(text) => {
            setSearch(text);
            setVisible(PAGE_SIZE);
          }}
        />
      )}
      {records.length === 0 && (
        <Text style={styles.muted}>
          {data.landlords.length
            ? 'No landlords match your search.'
            : 'No landlords have been recorded for this workspace yet.'}
        </Text>
      )}
      {records.slice(0, visible).map((landlord) => (
        <View key={landlord.id} style={styles.item}>
          <Text accessibilityRole='header' style={styles.heading}>
            {landlord.displayName}
          </Text>
          <Text style={styles.text}>
            Primary manager: {manager(landlord.primaryManagerId)}
          </Text>
          <Text style={styles.text}>
            Backup manager: {manager(landlord.backupManagerId)}
          </Text>
          <Text style={styles.text}>
            Works authorisation limit:{' '}
            {amountLabel(landlord.approvalLimitPence)}
          </Text>
          <Text style={styles.muted}>
            {landlord.propertyIds.length
              ? 'Properties: ' + labels(landlord.propertyIds).join(', ')
              : 'No properties linked'}
          </Text>
        </View>
      ))}
      {visible < records.length && (
        <InboxButton
          label='Show more landlords'
          onPress={() => setVisible((prev) => prev + PAGE_SIZE)}
        />
      )}
    </View>
  );
}
