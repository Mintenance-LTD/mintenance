'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { ContractConsentChoices, emptyConsent } from './ContractConsentChoices';

export function ContractStartChoices({
  contract,
  homeowner,
}: {
  contract: {
    id: string;
    status: string;
    cancellation_deadline?: string | null;
    start_date?: string | null;
    updated_at: string;
    review_token: string;
  };
  homeowner: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<
    'loading' | 'ready' | 'requested' | 'closed' | 'error'
  >('loading');
  const [consent, setConsent] = useState(emptyConsent);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setState('loading');
    setConsent(emptyConsent);
    setOpen(false);
    fetch(`/api/contracts/${contract.id}/consent`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load start choices');
        const data = await response.json();
        if (!active) return;
        const requested =
          data.records?.some(
            (r: { signer_role: string; early_start_requested: boolean }) =>
              r.signer_role === 'homeowner' && r.early_start_requested
          ) || data.earlyStartRequest;
        setState(
          data.agreement?.cancellation_requested_at
            ? 'closed'
            : requested
              ? 'requested'
              : data.earlyStartEligible
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
  }, [contract.id, contract.updated_at]);
  const deadline = contract.cancellation_deadline
    ? Date.parse(contract.cancellation_deadline)
    : NaN;
  if (!Number.isFinite(deadline)) return null;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(deadline);
  const clash =
    contract.start_date && Date.parse(contract.start_date) < deadline;
  const save = async () => {
    if (saving || !consent.termsAccepted || !consent.earlyStartRequested)
      return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/contracts/${contract.id}/early-start`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            legalConsent: {
              ...consent,
              termsVersion: CUSTOMER_TERMS_VERSION,
              expectedUpdatedAt: contract.updated_at,
              expectedReviewToken: contract.review_token,
            },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
                'Could not record request. Reload and try again.'
        );
      setState('requested');
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not record request'
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className='rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3'
      aria-label='Work start and cancellation period'
    >
      <h3 className='font-semibold'>Work start and cancellation period</h3>
      <p>
        Cancellation period ends: <strong>{formatted} UK time</strong>.
      </p>
      {state === 'loading' && (
        <p role='status'>Checking recorded start choices…</p>
      )}
      {state === 'error' && (
        <p role='alert'>
          Could not check start choices. Reload before arranging work.
        </p>
      )}
      {state === 'requested' && (
        <p role='status'>
          The homeowner has expressly requested an early start. Work can start
          once all other job requirements are met. The original agreement and
          cancellation deadline are unchanged.
        </p>
      )}
      {state === 'ready' && (
        <>
          <p>
            {clash ? 'The scheduled start is before this deadline. ' : ''}Work
            must wait until the deadline unless the homeowner expressly requests
            an early start. A scheduled date alone is not consent.
          </p>
          {homeowner ? (
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => setOpen(!open)}
            >
              {open
                ? 'Close early-start choices'
                : 'Review early-start request'}
            </button>
          ) : (
            <p>
              The homeowner can review early-start choices in this job’s
              contract, or agree a later schedule with you.
            </p>
          )}
        </>
      )}
      {state === 'closed' && (
        <p>
          Review the job’s current requirements before arranging work. If the
          cancellation period is still open, agree a later schedule or contact
          support.
        </p>
      )}
      {open && state === 'ready' && homeowner && (
        <div className='space-y-3'>
          <p>
            This records a separate request and sends a receipt to both parties.
            It does not change the signed contract, price or cancellation
            deadline.
          </p>
          <ContractConsentChoices
            value={consent}
            onChange={setConsent}
            homeowner
            supplemental
          />
          <button
            type='button'
            className='btn btn-primary'
            disabled={
              saving || !consent.termsAccepted || !consent.earlyStartRequested
            }
            onClick={save}
          >
            {saving ? 'Recording…' : 'Record my early-start request'}
          </button>
        </div>
      )}
      {error && <p role='alert'>{error}</p>}
    </section>
  );
}
