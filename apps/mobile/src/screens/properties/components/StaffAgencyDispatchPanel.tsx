import React, { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import {
  InboxButton,
  InboxError,
  InboxField,
  InboxLoading,
  inboxStyles as styles,
} from './PortfolioInboxControls';
import {
  isClosedRepair,
  privateDispatchPath,
  requireDispatchScope,
  type DispatchResponse,
  type PrivateDispatch,
} from './agencyPrivateDispatchModel';
import {
  inboxError,
  inboxStatusCode,
  ticketDetailKey,
} from './portfolioInboxModel';
import {
  amountLabel,
  parsePounds,
  type WorkOrder,
} from './portfolioWorkOrderModel';

type Props = {
  userId: string;
  workspaceId: string;
  ticketId: string;
  arrangement: WorkOrder['arrangement'];
};
type StaffAction = 'quote' | 'dispatch' | 'revoke';
type StaffCommand =
  | {
      action: 'quote';
      revision: number;
      quotePence: number;
      quoteScope: string;
    }
  | {
      action: 'dispatch';
      revision: number;
      quoteVersion: number;
      contractorEmail: string;
    }
  | { action: 'revoke'; revision: number; quoteVersion: number };

function canDispatch(item: PrivateDispatch) {
  return (
    item.decision !== 'rejected' &&
    (item.authorization === 'within_limit' ||
      item.authorization === 'landlord_approved')
  );
}
function authorizationNote(item: PrivateDispatch) {
  if (item.dispatchedAt)
    return item.acceptedAt
      ? 'Contractor accepted'
      : 'Assigned privately · awaiting acceptance';
  if (item.decision === 'rejected')
    return 'Landlord rejected this version. Record a revised quote before assigning work.';
  if (item.authorization === 'within_limit')
    return 'Within the landlord’s works authorisation limit.';
  if (item.authorization === 'landlord_approved')
    return 'The landlord approved this exact quote.';
  if (item.authorization === 'approval_required')
    return 'Waiting for the landlord to approve this exact quote.';
  if (item.authorization === 'no_landlord')
    return 'Link a verified landlord account under Agency CRM on the web before dispatch.';
  return 'No quote recorded for private dispatch.';
}

export function StaffAgencyDispatchPanel(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.item}>
      <Text accessibilityRole='header' style={styles.heading}>
        Private dispatch
      </Text>
      <Text style={styles.muted}>
        Versioned quotes and direct assignments. No marketplace listing or
        payment is created.
      </Text>
      {open ? (
        <DispatchDetails {...props} />
      ) : (
        <InboxButton
          label='Open private dispatch'
          onPress={() => setOpen(true)}
        />
      )}
    </View>
  );
}

function DispatchDetails({
  userId,
  workspaceId,
  ticketId,
  arrangement,
}: Props) {
  const client = useQueryClient();
  const endpoint = privateDispatchPath(ticketId);
  const key = [
    ...ticketDetailKey(userId, workspaceId, ticketId),
    'private-dispatch',
  ] as const;
  const data = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) =>
      requireDispatchScope(
        await mobileApiClient.get<DispatchResponse>(endpoint, { signal }),
        ticketId,
        'staff'
      ),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const [action, setAction] = useState<StaffAction | null>(null);
  const [selected, setSelected] = useState<PrivateDispatch | null>(null);
  const [amount, setAmount] = useState('');
  const [scope, setScope] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [mustReload, setMustReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const running = useRef(false);

  function start(next: StaffAction, item: PrivateDispatch) {
    setAction(next);
    setSelected(item);
    setAmount(
      item.quotePence == null ? '' : (item.quotePence / 100).toFixed(2)
    );
    setScope(item.quoteScope ?? '');
    setEmail('');
    setError('');
    setNotice('');
  }

  async function reload() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setAction(null);
    setSelected(null);
    setEmail('');
    try {
      const response = await data.refetch();
      if (response.isSuccess) {
        setMustReload(false);
        setError('');
        setNotice('Latest private dispatch loaded.');
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  const item = data.data;
  const stillCurrent =
    !!item &&
    !!selected &&
    item.revision === selected.revision &&
    item.quoteVersion === selected.quoteVersion;
  const invalidated = !!action && !stillCurrent;
  const active = arrangement === 'agency_contractor';

  async function save() {
    if (
      running.current ||
      !selected ||
      !item ||
      !action ||
      !stillCurrent ||
      mustReload ||
      data.isFetching
    )
      return;
    let command: StaffCommand;
    setError('');
    try {
      if (action === 'quote') {
        if (!active || isClosedRepair(item) || item.dispatchedAt) return;
        const quotePence = parsePounds(amount, 'Quote amount');
        if (quotePence == null || !scope.trim())
          throw new Error('Enter a quote amount and scope of work.');
        command = {
          action,
          revision: selected.revision,
          quotePence,
          quoteScope: scope.trim(),
        };
      } else {
        if (selected.quoteVersion === null) return;
        if (action === 'dispatch') {
          if (
            !active ||
            isClosedRepair(item) ||
            item.dispatchedAt ||
            !canDispatch(item)
          )
            return;
          const contractorEmail = email.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contractorEmail))
            throw new Error(
              'Enter the email of the contractor’s verified Mintenance account.'
            );
          command = {
            action,
            revision: selected.revision,
            quoteVersion: selected.quoteVersion,
            contractorEmail,
          };
        } else {
          if (!item.dispatchedAt) return;
          command = {
            action,
            revision: selected.revision,
            quoteVersion: selected.quoteVersion,
          };
        }
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Check the details.'
      );
      return;
    }
    running.current = true;
    setBusy(true);
    setNotice('');
    try {
      await client.cancelQueries({ queryKey: key, exact: true });
      const result = requireDispatchScope(
        await mobileApiClient.post<DispatchResponse>(endpoint, command),
        ticketId,
        'staff'
      );
      if (
        !result ||
        result.revision <= command.revision ||
        (action === 'quote' &&
          (result.quoteVersion == null ||
            result.quoteVersion <= (selected.quoteVersion ?? 0))) ||
        (action === 'dispatch' && !result.dispatchedAt) ||
        (action === 'revoke' && result.dispatchedAt)
      ) {
        throw new Error('Could not verify the saved private dispatch.');
      }
      client.setQueryData(key, result);
      setAction(null);
      setSelected(null);
      setEmail('');
      setNotice(
        action === 'quote'
          ? 'Versioned quote saved.'
          : action === 'dispatch'
            ? 'Assigned privately. No payment was taken.'
            : 'The private assignment was revoked.'
      );
    } catch (failure) {
      const status = inboxStatusCode(failure);
      if (status === 409) {
        setMustReload(true);
        setError(
          'Private dispatch changed. Reload and review the latest version before trying again.'
        );
      } else if (
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 404
      ) {
        setUnavailable(true);
        setEmail('');
        setError('Private dispatch is no longer available to this account.');
      } else if (status === 400) {
        setError(
          inboxError(failure, 'Check the details. No assignment was confirmed.')
        );
      } else {
        setMustReload(true);
        setError('Could not confirm the action. Reload before trying again.');
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  if (unavailable) return <InboxError message={error} />;
  if (data.isError)
    return (
      <InboxError
        message={inboxError(data.error, 'Could not load private dispatch.')}
        retry={() => void reload()}
      />
    );
  if (!data.isFetchedAfterMount || data.isPending)
    return <InboxLoading message='Loading private dispatch' />;
  if (!item)
    return (
      <Text style={styles.muted}>
        Private dispatch is not available for this repair.
      </Text>
    );

  const disabled = busy || data.isFetching;
  const canPrepareOrAssign =
    active && !isClosedRepair(item) && !item.dispatchedAt;
  return (
    <>
      <Text style={styles.text}>{authorizationNote(item)}</Text>
      {isClosedRepair(item) && (
        <Text style={styles.muted}>
          Reopen this repair before preparing or assigning new work.
        </Text>
      )}
      {item.quoteVersion !== null && (
        <Text style={styles.muted}>
          Quote version {item.quoteVersion} · {amountLabel(item.quotePence)}
        </Text>
      )}
      {item.quoteScope && <Text style={styles.muted}>{item.quoteScope}</Text>}
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
      {mustReload || invalidated ? (
        <>
          <Text style={styles.muted}>
            Reloading discards any unsaved changes.
          </Text>
          <InboxButton
            label='Reload private dispatch'
            disabled={disabled}
            onPress={() => void reload()}
          />
        </>
      ) : !action ? (
        <View style={styles.buttons}>
          {canPrepareOrAssign && (
            <InboxButton
              label={
                item.quoteVersion === null
                  ? 'Prepare versioned quote'
                  : 'Revise versioned quote'
              }
              disabled={disabled}
              onPress={() => start('quote', item)}
            />
          )}
          {canPrepareOrAssign &&
            item.quoteVersion !== null &&
            canDispatch(item) && (
              <InboxButton
                label='Assign to verified contractor'
                primary
                disabled={disabled}
                onPress={() => start('dispatch', item)}
              />
            )}
          {!!item.dispatchedAt && (
            <InboxButton
              label='Revoke private assignment'
              disabled={disabled}
              onPress={() => start('revoke', item)}
            />
          )}
        </View>
      ) : (
        <>
          {action === 'quote' && (
            <>
              <Text style={styles.text}>Quote amount (£)</Text>
              <TextInput
                accessibilityLabel='Quote amount (£)'
                keyboardType='decimal-pad'
                maxLength={10}
                value={amount}
                onChangeText={setAmount}
                editable={!disabled}
                style={styles.input}
              />
              <InboxField
                label='Quote scope of work'
                maxLength={2000}
                value={scope}
                onChange={setScope}
                disabled={disabled}
                multiline
              />
              <Text style={styles.muted}>
                The linked landlord can see this quote in their inbox. Saving a
                revision replaces the previous version for future approvals.
              </Text>
            </>
          )}
          {action === 'dispatch' && (
            <>
              <InboxField
                label='Verified contractor email'
                maxLength={254}
                value={email}
                onChange={setEmail}
                disabled={disabled}
              />
              <Text style={styles.muted}>
                Only that verified Mintenance contractor account can see and
                accept this work. This does not send an email or take payment.
              </Text>
            </>
          )}
          {action === 'revoke' && (
            <Text style={styles.muted}>
              The contractor will lose access to this assignment.
            </Text>
          )}
          <View style={styles.buttons}>
            <InboxButton
              label={
                busy
                  ? 'Working…'
                  : action === 'quote'
                    ? 'Save versioned quote'
                    : action === 'dispatch'
                      ? 'Confirm private assignment'
                      : 'Confirm revoke'
              }
              primary
              disabled={disabled}
              onPress={() => void save()}
            />
            <InboxButton
              label='Cancel'
              disabled={disabled}
              onPress={() => {
                setAction(null);
                setSelected(null);
                setEmail('');
                setError('');
              }}
            />
          </View>
        </>
      )}
    </>
  );
}
