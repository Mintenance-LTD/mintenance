import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
import { Button } from '../../../components/ui/Button';
import { me } from '../../../design-system/mint-editorial';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import type { Contract } from '../contract-view/contractViewModel';
import { CustomerConsent, emptyConsent } from './CustomerConsent';

interface StartReceipt {
  agreement?: { cancellation_requested_at?: string | null };
  records?: { signer_role: string; early_start_requested: boolean }[];
  earlyStartRequest?: { requested_at: string } | null;
  earlyStartEligible: boolean;
}

/** Mount with the agreement revision as key so unsaved choices cannot cross revisions. */
export function ContractStartChoices({
  contract,
  homeowner,
  onSaved,
}: {
  contract: Contract;
  homeowner: boolean;
  onSaved: () => void;
}) {
  const [state, setState] = useState<
    'loading' | 'ready' | 'requested' | 'closed' | 'error'
  >('loading');
  const [consent, setConsent] = useState(emptyConsent);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const deadline = Date.parse(contract.cancellation_deadline ?? '');
  const visible = contract.status === 'accepted' && Number.isFinite(deadline);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setState('loading');
    setOpen(false);
    setConsent(emptyConsent);
    mobileApiClient
      .get<StartReceipt>(`/api/contracts/${contract.id}/consent`)
      .then((receipt) => {
        if (!active) return;
        const requested =
          receipt.earlyStartRequest ||
          receipt.records?.some(
            (r) => r.signer_role === 'homeowner' && r.early_start_requested
          );
        setState(
          receipt.agreement?.cancellation_requested_at
            ? 'closed'
            : requested
              ? 'requested'
              : receipt.earlyStartEligible
                ? 'ready'
                : 'closed'
        );
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [contract.id, contract.updated_at, attempt, visible]);

  if (!visible) return null;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(deadline);
  const clash =
    contract.start_date && Date.parse(contract.start_date) < deadline;

  const save = async () => {
    if (
      busy.current ||
      !homeowner ||
      state !== 'ready' ||
      !consent.termsAccepted ||
      !consent.earlyStartRequested
    )
      return;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await mobileApiClient.post(`/api/contracts/${contract.id}/early-start`, {
        legalConsent: {
          ...consent,
          termsVersion: CUSTOMER_TERMS_VERSION,
          expectedUpdatedAt: contract.updated_at,
          expectedReviewToken: contract.review_token,
        },
      });
      if (!mounted.current) return;
      setState('requested');
      setOpen(false);
      onSaved();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not record request. Reload and try again.'
        );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text accessibilityRole='header' style={styles.heading}>
        Work start and cancellation period
      </Text>
      <Text style={styles.text}>
        Cancellation period ends: {formatted} UK time.
      </Text>
      {state === 'loading' && (
        <Text accessibilityLiveRegion='polite'>
          Checking recorded start choices…
        </Text>
      )}
      {state === 'error' && (
        <>
          <Text accessibilityRole='alert'>
            Could not check start choices. Retry before arranging work.
          </Text>
          <Button
            title='Retry start choices'
            variant='secondary'
            onPress={() => setAttempt((value) => value + 1)}
          />
        </>
      )}
      {state === 'requested' && (
        <Text accessibilityLiveRegion='polite' style={styles.text}>
          The homeowner has expressly requested an early start. Work can start
          once all other job requirements are met. The original agreement and
          cancellation deadline are unchanged.
        </Text>
      )}
      {state === 'closed' && (
        <Text style={styles.text}>
          Review the job’s current requirements before arranging work. If the
          cancellation period is still open, agree a later schedule or contact
          support.
        </Text>
      )}
      {state === 'ready' && (
        <>
          <Text style={styles.text}>
            {clash ? 'The scheduled start is before this deadline. ' : ''}Work
            must wait until the deadline unless the homeowner expressly requests
            an early start. A scheduled date alone is not consent.
          </Text>
          {homeowner ? (
            <Button
              title={
                open
                  ? 'Close early-start choices'
                  : 'Review early-start request'
              }
              variant='secondary'
              disabled={saving}
              onPress={() => {
                setOpen(!open);
                setConsent(emptyConsent);
                setError('');
              }}
            />
          ) : (
            <Text style={styles.text}>
              The homeowner can review early-start choices in this job’s
              contract, or agree a later schedule with you.
            </Text>
          )}
        </>
      )}
      {open && state === 'ready' && homeowner && (
        <>
          <Text style={styles.text}>
            This records a separate request and sends a receipt to both parties.
            It does not change the signed contract, price or cancellation
            deadline.
          </Text>
          <View
            pointerEvents={saving ? 'none' : 'auto'}
            accessibilityElementsHidden={saving}
            importantForAccessibility={saving ? 'no-hide-descendants' : 'auto'}
          >
            <CustomerConsent
              value={consent}
              onChange={setConsent}
              homeowner
              supplemental
            />
          </View>
          <Button
            title='Record my early-start request'
            loading={saving}
            disabled={
              saving || !consent.termsAccepted || !consent.earlyStartRequested
            }
            onPress={() => {
              void save();
            }}
          />
        </>
      )}
      {!!error && (
        <Text accessibilityRole='alert' style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 12,
    borderRadius: 14,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  heading: { fontSize: 18, fontWeight: '600', color: me.ink },
  text: { fontSize: 15, lineHeight: 22, color: me.ink },
  error: { color: me.errFg, fontSize: 15, lineHeight: 22 },
});
