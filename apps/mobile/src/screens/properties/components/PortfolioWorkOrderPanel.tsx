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
  inboxError,
  inboxStatusCode,
  ticketDetailKey,
} from './portfolioInboxModel';
import {
  amountLabel,
  workOrderDraft,
  workOrderInput,
  type WorkOrder,
  type WorkOrderDraft,
} from './portfolioWorkOrderModel';

type Props = { userId: string; workspaceId: string; ticketId: string };
type Response = { workOrder: WorkOrder | null };

const costs = [
  { key: 'quotedPence', label: 'Quoted cost' },
  {
    key: 'approvedPence',
    label: 'Approved cost',
    reference: 'approvalReference',
    referenceLabel: 'Approval reference',
  },
  {
    key: 'invoicedPence',
    label: 'Invoiced cost',
    reference: 'invoiceReference',
    referenceLabel: 'Invoice reference',
  },
  {
    key: 'paidPence',
    label: 'Recorded as paid',
    reference: 'paymentReference',
    referenceLabel: 'Payment reference',
  },
] as const;

const arrangements = [
  { key: 'agency_contractor', label: 'Use agency contractor' },
  { key: 'arranged_outside', label: 'Already arranged outside Mintenance' },
] as const;

function checkScope(response: Response, ticketId: string) {
  if (response.workOrder && response.workOrder.ticketId !== ticketId) {
    throw Object.assign(new Error('Work order mismatch'), { statusCode: 403 });
  }
  return response;
}

/** Staff-only ledger for a single Portfolio ticket, not a dispatch or payment tool. */
export function PortfolioWorkOrderPanel(props: Props) {
  const [opened, setOpened] = useState(false);
  return (
    <View style={styles.item}>
      <Text accessibilityRole='header' style={styles.heading}>
        Private work order
      </Text>
      <Text style={styles.muted}>
        Record your contractor, agreed costs and completion. This does not send
        a job, post to the marketplace or move money.
      </Text>
      {opened ? (
        <WorkOrderRecord {...props} />
      ) : (
        <InboxButton
          label='Open private work order'
          onPress={() => setOpened(true)}
        />
      )}
    </View>
  );
}

function WorkOrderRecord({ userId, workspaceId, ticketId }: Props) {
  const client = useQueryClient();
  const queryKey = [
    ...ticketDetailKey(userId, workspaceId, ticketId),
    'private-work-order',
  ] as const;
  const endpoint =
    '/api/portfolio/tickets/' + encodeURIComponent(ticketId) + '/work-order';
  const order = useQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      checkScope(
        await mobileApiClient.get<Response>(endpoint, { signal }),
        ticketId
      ),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const [draft, setDraft] = useState<WorkOrderDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const running = useRef(false);

  const setField = <K extends keyof WorkOrderDraft>(
    field: K,
    value: WorkOrderDraft[K]
  ) =>
    setDraft((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );

  const save = async () => {
    if (running.current || !draft || conflict) return;
    setError('');
    setMessage('');
    let input;
    try {
      input = workOrderInput(draft);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Check work order details.'
      );
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      await client.cancelQueries({ queryKey, exact: true });
      const result = checkScope(
        await mobileApiClient.put<Response>(endpoint, input),
        ticketId
      );
      if (!result.workOrder)
        throw new Error('Save result did not include the work order');
      client.setQueryData(queryKey, result);
      setDraft(null);
      setMessage('Private work order saved.');
    } catch (failure) {
      const code = inboxStatusCode(failure);
      if (code === 409) {
        setConflict(true);
        setError(
          'This work order changed. Reload the latest version before saving.'
        );
      } else if (code === 401 || code === 402 || code === 403 || code === 404) {
        setDraft(null);
        setAccessDenied(true);
        setError(
          inboxError(failure, 'Private work order access is unavailable.')
        );
      } else {
        setError(
          inboxError(
            failure,
            'Could not confirm the save. Your changes are still here.'
          )
        );
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  const reload = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const result = await order.refetch();
      if (result.isSuccess) {
        setDraft(workOrderDraft(result.data.workOrder));
        setConflict(false);
        setError('');
        setMessage('Latest version loaded.');
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  if (accessDenied) return <InboxError message={error} />;
  if (order.isError)
    return (
      <InboxError
        message={inboxError(
          order.error,
          'Could not load the private work order.'
        )}
        retry={() => void order.refetch()}
      />
    );
  if (!order.isFetchedAfterMount || !order.data)
    return <InboxLoading message='Loading private work order' />;

  const saved = order.data.workOrder;
  const olderDraft = !!draft && draft.revision !== (saved?.revision ?? 0);
  const needsReload = conflict || olderDraft;

  return (
    <>
      {error && (
        <Text accessibilityRole='alert' style={styles.error}>
          {error}
        </Text>
      )}
      {message && (
        <Text accessibilityLiveRegion='polite' style={styles.muted}>
          {message}
        </Text>
      )}
      {!draft ? (
        <>
          {saved ? (
            <>
              <Text style={styles.text}>{saved.contractorName}</Text>
              <Text style={styles.muted}>
                {saved.arrangement === 'agency_contractor'
                  ? 'Agency contractor'
                  : 'Arranged outside Mintenance'}
              </Text>
              {costs.map((cost) => (
                <View key={cost.key}>
                  <Text style={styles.text}>
                    {cost.label}: {amountLabel(saved[cost.key])}
                  </Text>
                  {'reference' in cost && saved[cost.reference] && (
                    <Text style={styles.muted}>
                      {cost.referenceLabel}: {saved[cost.reference]}
                    </Text>
                  )}
                </View>
              ))}
              {saved.completionNote && (
                <Text style={styles.muted}>
                  Completion: {saved.completionNote}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.muted}>No private work order recorded.</Text>
          )}
          {conflict && (
            <InboxButton
              label='Reload latest work order'
              onPress={() => void reload()}
              disabled={busy}
            />
          )}
          <InboxButton
            label={
              saved ? 'Edit private work order' : 'Record private work order'
            }
            onPress={() => {
              setMessage('');
              setDraft(workOrderDraft(saved));
            }}
            disabled={conflict}
          />
        </>
      ) : (
        <>
          <Text style={styles.text}>Arrangement</Text>
          <View style={styles.buttons}>
            {arrangements.map(({ key, label }) => (
              <InboxButton
                key={key}
                label={label}
                selected={draft.arrangement === key}
                onPress={() => setField('arrangement', key)}
                disabled={busy || needsReload}
              />
            ))}
          </View>
          <InboxField
            label='Contractor or company name'
            value={draft.contractorName}
            onChange={(value) => setField('contractorName', value)}
            maxLength={160}
            disabled={busy || needsReload}
          />
          {costs.map((cost) => (
            <React.Fragment key={cost.key}>
              <Text style={styles.text}>{cost.label} (£)</Text>
              <TextInput
                accessibilityLabel={cost.label + ' (£)'}
                value={draft[cost.key]}
                onChangeText={(value) => setField(cost.key, value)}
                keyboardType='decimal-pad'
                maxLength={10}
                style={styles.input}
                editable={!busy && !needsReload}
              />
              {'reference' in cost && draft[cost.key].trim() !== '' && (
                <InboxField
                  label={cost.referenceLabel}
                  value={draft[cost.reference] ?? ''}
                  onChange={(value) => setField(cost.reference, value)}
                  maxLength={120}
                  disabled={busy || needsReload}
                />
              )}
            </React.Fragment>
          ))}
          <InboxField
            label='Private completion note'
            value={draft.completionNote ?? ''}
            onChange={(value) => setField('completionNote', value)}
            maxLength={3000}
            disabled={busy || needsReload}
            multiline
          />
          {needsReload && (
            <>
              {olderDraft && !conflict && (
                <Text accessibilityRole='alert' style={styles.error}>
                  A newer version is available.
                </Text>
              )}
              <Text style={styles.muted}>
                Loading the latest version will discard these unsaved changes.
              </Text>
              <InboxButton
                label='Discard changes and reload'
                onPress={() => void reload()}
                disabled={busy}
              />
            </>
          )}
          <View style={styles.buttons}>
            <InboxButton
              label={busy ? 'Working…' : 'Save private work order'}
              onPress={() => {
                if (!needsReload) void save();
              }}
              disabled={busy || needsReload}
              primary
            />
            <InboxButton
              label='Cancel work order edit'
              disabled={busy}
              onPress={() => {
                setDraft(null);
                if (!conflict) setError('');
              }}
            />
          </View>
        </>
      )}
    </>
  );
}
