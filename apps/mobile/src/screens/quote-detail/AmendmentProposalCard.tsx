import React, { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { publishQuoteAmendment } from '../../services/quotes/QuoteAmendmentPreparation';
import type { QuoteRevision } from '../../services/quotes/types';
import type { AmendmentPricing } from '../../services/quotes/QuoteAmendments';
import { PreparationAction } from './AmendmentPriceEditor';
import { amendmentStyles as s } from './amendmentPreparationStyles';

const money = (value: unknown) =>
  value == null || !Number.isFinite(Number(value))
    ? 'Not recorded'
    : `£${Number(value).toFixed(2)}`;
function Prices({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null;
}) {
  const snapshot = value as AmendmentPricing | null;
  return (
    <View style={s.section}>
      <Text style={s.heading}>{title}</Text>
      {Array.isArray(snapshot?.line_items) &&
        snapshot.line_items.map((item, index) => (
          <Text key={index} style={s.text}>
            {item.description || 'Description not recorded'}:{' '}
            {item.quantity ?? 'Not recorded'} ×{' '}
            {money(item.unitPrice ?? item.unit_price)} = {money(item.total)}
          </Text>
        ))}
      <Text style={s.text}>Subtotal: {money(snapshot?.subtotal)}</Text>
      <Text style={s.text}>
        Tax: {money(snapshot?.tax_amount)} (
        {snapshot?.tax_rate ?? 'Not recorded'}%)
      </Text>
      <Text style={s.heading}>Total: {money(snapshot?.total_amount)}</Text>
      <Text style={s.text}>Terms: {snapshot?.terms || 'None recorded'}</Text>
    </View>
  );
}
export function AmendmentProposalCard({
  revision,
  jobId,
  canPublish,
  onReview,
  onPublished,
}: {
  revision: QuoteRevision;
  jobId: string | null;
  canPublish: boolean;
  onReview: () => void;
  onPublished: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  const publish = () => {
    if (!jobId || !canPublish || lock.current || done || blocked) return;
    lock.current = true;
    setBusy(true);
    Alert.alert(
      'Submit for customer review?',
      'Check the full pricing and reason above. This publishes the proposal; the accepted price changes only after customer approval and eligible application.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            lock.current = false;
            setBusy(false);
          },
        },
        {
          text: 'Submit for review',
          onPress: async () => {
            setError('');
            try {
              await publishQuoteAmendment(jobId, revision.id);
              setDone(true);
              onPublished();
            } catch (err) {
              if (
                [400, 401, 403, 404, 409].includes(
                  (err as { statusCode?: number })?.statusCode ?? 0
                )
              )
                setBlocked(true);
              setError(
                err instanceof Error
                  ? err.message
                  : 'Could not confirm publication. Retry or refresh customer review.'
              );
            } finally {
              lock.current = false;
              setBusy(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };
  return (
    <View style={s.card}>
      <Text style={s.heading}>
        Revision {revision.revision_number}:{' '}
        {revision.kind === 'amendment_proposed'
          ? 'Prepared proposal'
          : revision.kind}
      </Text>
      <Text style={s.text}>
        {new Date(revision.created_at).toLocaleString('en-GB')}
      </Text>
      {!!revision.reason && <Text style={s.text}>{revision.reason}</Text>}
      {revision.kind === 'amendment_proposed' && (
        <>
          <Prices
            title='Previously accepted pricing'
            value={revision.before_snapshot}
          />
          <Prices title='Proposed pricing' value={revision.after_snapshot} />
          <Text style={s.text}>
            Customer review:{' '}
            {done
              ? 'published'
              : (revision.amendment?.status ?? 'not submitted')}
          </Text>
          {!revision.amendment && !done && jobId && canPublish && (
            <PreparationAction
              title={busy ? 'Submitting…' : 'Submit for customer review'}
              disabled={busy || blocked}
              onPress={publish}
            />
          )}
          {done && (
            <Text accessibilityLiveRegion='polite' style={s.text}>
              Proposal published. In-app/push delivery depends on notification
              preferences and delivery; no email is sent.
            </Text>
          )}
          {blocked && (
            <Text style={s.text}>
              Refresh history or customer review before continuing.
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole='alert' style={s.error}>
              {error}
            </Text>
          )}
          {jobId ? (
            <PreparationAction
              title='View customer review'
              disabled={busy}
              onPress={onReview}
            />
          ) : (
            <Text style={s.text}>
              Publication requires a quote linked to a job with a matching
              accepted bid.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
