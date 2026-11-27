import React, { useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
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
  InboxLoading,
  inboxStyles as styles,
} from './components/PortfolioInboxControls';
import { inboxError, inboxStatusCode } from './components/portfolioInboxModel';
import { amountLabel } from './components/portfolioWorkOrderModel';
import {
  availableActions,
  privateDispatchPath,
  privateWorkPath,
  privateWorkKey,
  requireDispatchScope,
  validTicketId,
  type AgencyPrivateWorkViewer,
  type DispatchAction,
  type DispatchResponse,
  type PrivateDispatch,
} from './components/agencyPrivateDispatchModel';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AgencyPrivateWork'>;
const labels = {
  landlord: {
    heading: 'Agency quote approvals',
    description:
      'Review quotes shared with you by your property manager. Approving a quote does not pay it.',
    empty: 'No agency quotes have been shared with you.',
    button: 'Open quote',
  },
  contractor: {
    heading: 'Direct agency work',
    description:
      'Private assignments sent to your account by an agency. These are separate from marketplace jobs.',
    empty: 'No private agency work has been assigned to you.',
    button: 'Open assignment',
  },
};
const verbs: Record<DispatchAction, string> = {
  approve: 'Approve quote',
  reject: 'Reject quote',
  accept: 'Accept assignment',
};
const resultLabels: Record<DispatchAction, string> = {
  approve: 'Quote approved. No payment was taken.',
  reject: 'Quote rejected.',
  accept: 'Assignment accepted. No payment was taken.',
};

function statusLabel(item: PrivateDispatch) {
  if (item.viewer === 'contractor')
    return item.acceptedAt ? 'Accepted' : 'Awaiting acceptance';
  if (item.decision === 'approved') return 'Approved';
  if (item.decision === 'rejected') return 'Rejected';
  if (item.authorization === 'approval_required')
    return 'Awaiting your decision';
  if (item.authorization === 'within_limit')
    return 'Within agency authorisation limit';
  return 'For your records';
}

export function AgencyPrivateWorkScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const viewer = route.params?.viewer;
  const matched =
    viewer === 'landlord'
      ? user?.role === 'homeowner'
      : viewer === 'contractor' && user?.role === 'contractor';
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <InboxButton
          label='Go back'
          back
          onPress={() => goBackSafe(navigation)}
        />
      </View>
      {matched && user?.id && viewer ? (
        <PrivateWorkInbox
          key={user.id + ':' + viewer}
          userId={user.id}
          viewer={viewer}
        />
      ) : (
        <InboxError message='Sign in with the account the agency shared this work with.' />
      )}
    </SafeAreaView>
  );
}

function PrivateWorkInbox({
  userId,
  viewer,
}: {
  userId: string;
  viewer: AgencyPrivateWorkViewer;
}) {
  const [selected, setSelected] = useState<string>();
  const scroll = useRef<ScrollView>(null);
  const list = useQuery({
    queryKey: [...privateWorkKey(userId, viewer), 'inbox'],
    queryFn: ({ signal }) =>
      mobileApiClient.get<{ items: PrivateDispatch[] }>(privateWorkPath, {
        signal,
      }),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const strings = labels[viewer];
  const items =
    list.data?.items.filter(
      (item) => item.viewer === viewer && validTicketId(item.ticketId)
    ) ?? [];
  const backToInbox = () => {
    setSelected(undefined);
    scroll.current?.scrollTo?.({ y: 0, animated: false });
  };
  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps='handled'
      refreshControl={
        !selected ? (
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
          />
        ) : undefined
      }
    >
      <View>
        <Text style={styles.eyebrow}>AGENCY PROPERTY MANAGEMENT</Text>
        <Text accessibilityRole='header' style={styles.title}>
          {strings.heading}
        </Text>
        <Text style={styles.muted}>{strings.description}</Text>
      </View>
      {selected ? (
        <PrivateWorkDetail
          key={selected}
          userId={userId}
          viewer={viewer}
          ticketId={selected}
          back={backToInbox}
        />
      ) : list.isError ? (
        <InboxError
          message={inboxError(
            list.error,
            'Could not load your private agency work.'
          )}
          retry={() => void list.refetch()}
        />
      ) : !list.isFetchedAfterMount || !list.data ? (
        <InboxLoading message='Loading private agency work' />
      ) : items.length ? (
        items.map((item) => (
          <View key={item.ticketId} style={styles.panel}>
            <Text accessibilityRole='header' style={styles.heading}>
              {item.title}
            </Text>
            <Text style={styles.muted}>
              {statusLabel(item)} · {amountLabel(item.quotePence)}
            </Text>
            <InboxButton
              label={strings.button + ': ' + item.title}
              onPress={() => {
                setSelected(item.ticketId);
                scroll.current?.scrollTo?.({ y: 0, animated: false });
              }}
            />
          </View>
        ))
      ) : (
        <View style={styles.panel}>
          <Text style={styles.text}>{strings.empty}</Text>
        </View>
      )}
    </ScrollView>
  );
}

type Confirmation = {
  action: DispatchAction;
  revision: number;
  quoteVersion: number;
};

function PrivateWorkDetail({
  userId,
  viewer,
  ticketId,
  back,
}: {
  userId: string;
  viewer: AgencyPrivateWorkViewer;
  ticketId: string;
  back: () => void;
}) {
  const client = useQueryClient();
  const endpoint = privateDispatchPath(ticketId);
  const prefix = privateWorkKey(userId, viewer);
  const queryKey = [...prefix, 'detail', ticketId] as const;
  const detail = useQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      requireDispatchScope(
        await mobileApiClient.get<DispatchResponse>(endpoint, { signal }),
        ticketId,
        viewer
      ),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadRequired, setReloadRequired] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const running = useRef(false);
  const item = detail.data;

  const reload = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setConfirm(null);
    setNotice('');
    try {
      const response = await detail.refetch();
      if (response.isSuccess) {
        setReloadRequired(false);
        setError('');
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  const confirmMatches =
    !!item &&
    !!confirm &&
    confirm.revision === item.revision &&
    confirm.quoteVersion === item.quoteVersion &&
    availableActions(item).includes(confirm.action);

  async function send() {
    if (
      !confirm ||
      !confirmMatches ||
      running.current ||
      reloadRequired ||
      detail.isFetching
    )
      return;
    running.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const action = confirm.action;
    try {
      await client.cancelQueries({ queryKey, exact: true });
      const result = requireDispatchScope(
        await mobileApiClient.post<DispatchResponse>(endpoint, confirm),
        ticketId,
        viewer
      );
      if (
        !result ||
        result.quoteVersion !== confirm.quoteVersion ||
        result.revision <= confirm.revision ||
        (action === 'accept' && !result.acceptedAt) ||
        (action === 'approve' && result.decision !== 'approved') ||
        (action === 'reject' && result.decision !== 'rejected')
      )
        throw new Error('The action could not be confirmed.');
      client.setQueryData(queryKey, result);
      setNotice(resultLabels[action]);
      void client.invalidateQueries({
        queryKey: [...prefix, 'inbox'],
        exact: true,
      });
    } catch (failure) {
      const status = inboxStatusCode(failure);
      if (status === 409) {
        setReloadRequired(true);
        setError(
          'This quote or assignment changed. Reload it and review the latest version before deciding.'
        );
      } else if ([401, 402, 403, 404].some((value) => value === status)) {
        setUnavailable(true);
        setError(
          'This private agency record is no longer available to this account.'
        );
      } else {
        setReloadRequired(true);
        setError(
          'Could not confirm your decision. Reload the record before trying again.'
        );
      }
    } finally {
      setConfirm(null);
      setBusy(false);
      running.current = false;
    }
  }

  return (
    <View style={styles.panel}>
      <InboxButton
        label='Back to agency inbox'
        onPress={back}
        disabled={busy}
      />
      {unavailable ? (
        <InboxError message={error} />
      ) : detail.isError ? (
        <InboxError
          message={inboxError(
            detail.error,
            'Could not load this private record.'
          )}
          retry={() => void reload()}
        />
      ) : !detail.isFetchedAfterMount || detail.isPending ? (
        <InboxLoading message='Loading the latest record' />
      ) : !item ? (
        <Text style={styles.text}>
          This private record is no longer available.
        </Text>
      ) : (
        <>
          <Text accessibilityRole='header' style={styles.heading}>
            {item.title}
          </Text>
          <Text style={styles.muted}>{statusLabel(item)}</Text>
          <Text style={styles.text}>
            Quote version {item.quoteVersion} · {amountLabel(item.quotePence)}
          </Text>
          {item.quoteScope && (
            <Text style={styles.text}>{item.quoteScope}</Text>
          )}
          {viewer === 'landlord' && (
            <Text style={styles.muted}>
              Works authorisation limit: {amountLabel(item.approvalLimitPence)}
            </Text>
          )}
          {error ? (
            <Text accessibilityRole='alert' style={styles.error}>
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text accessibilityLiveRegion='polite' style={styles.text}>
              {notice}
            </Text>
          ) : null}
          {reloadRequired || (confirm && !confirmMatches) ? (
            <InboxButton
              label='Reload latest version'
              disabled={busy}
              onPress={() => void reload()}
            />
          ) : confirm ? (
            <>
              <Text style={styles.text}>
                Confirm {verbs[confirm.action].toLowerCase()} for quote version{' '}
                {confirm.quoteVersion} ({amountLabel(item.quotePence)}).
              </Text>
              <View style={styles.buttons}>
                <InboxButton
                  label={
                    busy
                      ? 'Confirming…'
                      : 'Confirm ' + verbs[confirm.action].toLowerCase()
                  }
                  primary
                  disabled={busy || detail.isFetching}
                  onPress={() => void send()}
                />
                <InboxButton
                  label='Cancel'
                  disabled={busy}
                  onPress={() => setConfirm(null)}
                />
              </View>
            </>
          ) : (
            <View style={styles.buttons}>
              {item.quoteVersion !== null &&
                availableActions(item).map((action) => (
                  <InboxButton
                    key={action}
                    label={verbs[action]}
                    primary={action !== 'reject'}
                    disabled={busy || detail.isFetching}
                    onPress={() =>
                      setConfirm({
                        action,
                        revision: item.revision,
                        quoteVersion: item.quoteVersion!,
                      })
                    }
                  />
                ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
