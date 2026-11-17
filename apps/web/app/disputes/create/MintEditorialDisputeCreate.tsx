'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { formatMoney } from '@/lib/utils/currency';

const REASONS = [
  ['poor_quality', 'Quality of work'],
  ['incomplete_work', 'Job not finished'],
  ['not_as_described', 'Wrong scope or extras charged'],
  ['damage', 'Damage to property'],
  ['other', 'Something else'],
] as const;
const OUTCOMES = [
  'Redo the work, no extra cost',
  'Partial refund',
  'Full refund',
  'Different contractor finishes it',
  'Other — explain in my statement',
];
interface Context {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  status: string;
}
interface Props {
  escrowId: string | null;
  jobTitle?: string;
  escrowAmount?: number;
  jobId?: string;
}
const errorMessage = (data: unknown, fallback: string) => {
  if (!data || typeof data !== 'object' || !('error' in data)) return fallback;
  const error = data.error;
  return typeof error === 'string'
    ? error
    : error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : fallback;
};

export function MintEditorialDisputeCreate({ escrowId }: Props) {
  const router = useRouter();
  const [context, setContext] = useState<Context | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const uploaded = useRef(new Map<File, string>());
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setContext(null);
    setLoadError('');
    if (!escrowId) {
      setLoadError(
        'Open this form from the payment or job you want to dispute.'
      );
      return;
    }
    fetch('/api/disputes/context?escrowId=' + encodeURIComponent(escrowId), {
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (
          !response.ok ||
          data?.id !== escrowId ||
          typeof data?.jobId !== 'string' ||
          !Number.isFinite(data?.amount)
        )
          throw new Error(
            errorMessage(
              data,
              'Unable to load the job and payment. Please retry.'
            )
          );
        if (active) setContext(data);
      })
      .catch((cause) => {
        if (active)
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load this payment.'
          );
      });
    return () => {
      active = false;
    };
  }, [escrowId, reload]);

  async function submit() {
    if (!context || inFlight.current) return;
    if (!reason || !outcome || description.trim().length < 10) {
      setError(
        'Choose a reason and requested outcome, and write a statement of at least 10 characters.'
      );
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const evidence: string[] = [];
      for (const file of files) {
        let reference = uploaded.current.get(file);
        if (!reference) {
          const form = new FormData();
          form.set('escrowId', context.id);
          form.set('file', file);
          const response = await fetchWithCsrf('/api/disputes/evidence', {
            method: 'POST',
            body: form,
          });
          const data = await response.json().catch(() => null);
          if (!response.ok || typeof data?.reference !== 'string')
            throw new Error(
              errorMessage(
                data,
                'Photo upload failed. Your dispute has not been submitted. Please retry.'
              )
            );
          reference = data.reference as string;
          uploaded.current.set(file, reference);
        }
        evidence.push(reference);
      }
      const response = await fetchWithCsrf('/api/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId: context.id,
          reason,
          description:
            '[Outcome wanted: ' + outcome + ']\n\n' + description.trim(),
          evidence,
          priority: 'medium',
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.disputeId !== context.id)
        throw new Error(
          errorMessage(
            data,
            'The dispute could not be confirmed. Please retry.'
          )
        );
      router.push('/disputes/' + encodeURIComponent(data.disputeId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to submit the dispute.'
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }
  if (loadError)
    return (
      <div role='alert' className='card card-pad'>
        <p>{loadError}</p>
        <button onClick={() => setReload((n) => n + 1)}>
          Retry loading payment
        </button>
        <Link href='/jobs'>Back to jobs</Link>
      </div>
    );
  if (!context) return <p role='status'>Loading job and payment…</p>;
  if (context.status === 'disputed')
    return (
      <section className='card card-pad'>
        <h1>A dispute is already open</h1>
        <Link href={'/disputes/' + context.id}>View this payment’s case</Link>
        <p>
          <Link href={'/jobs/' + context.jobId}>
            Back to {context.jobTitle}
          </Link>
        </p>
      </section>
    );
  if (context.status !== 'held')
    return (
      <section className='card card-pad'>
        <h1>This payment cannot be disputed here</h1>
        <p>
          Current payment state: {context.status}. Contact support if you need
          help.
        </p>
        <Link href={'/jobs/' + context.jobId}>Back to {context.jobTitle}</Link>
      </section>
    );
  return (
    <main className='mx-auto max-w-3xl space-y-6 p-4 sm:p-6'>
      <Link href={'/jobs/' + context.jobId} className='underline'>
        Back to {context.jobTitle}
      </Link>
      <header>
        <h1 className='text-3xl font-bold'>Open a dispute</h1>
        <p className='mt-2'>
          {context.jobTitle} ·{' '}
          <strong>{formatMoney(context.amount, 'GBP')}</strong> held
        </p>
        <p>
          Opening a case pauses release for review. Your requested outcome is
          not a settlement decision. No refund or payout happens when you submit
          this form.
        </p>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className='card card-pad space-y-6'
      >
        <fieldset disabled={submitting}>
          <legend className='font-semibold'>What happened?</legend>
          <div className='mt-3 space-y-2'>
            {REASONS.map(([value, title]) => (
              <label
                key={value}
                className='flex items-center gap-3 rounded-lg border p-3'
              >
                <input
                  type='radio'
                  name='reason'
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  required
                />
                {title}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor='dispute-statement' className='font-semibold'>
            Your statement
          </label>
          <textarea
            id='dispute-statement'
            rows={6}
            minLength={10}
            maxLength={9000}
            required
            disabled={submitting}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='field mt-2 w-full'
            placeholder='Describe what happened, dates, and what you would like us to review.'
          />
        </div>
        <fieldset disabled={submitting}>
          <legend className='font-semibold'>What outcome do you want?</legend>
          <p>You must choose; none is selected for you.</p>
          <div className='mt-3 space-y-2'>
            {OUTCOMES.map((value) => (
              <label className='flex items-center gap-3' key={value}>
                <input
                  type='radio'
                  name='outcome'
                  checked={outcome === value}
                  onChange={() => setOutcome(value)}
                  required
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor='dispute-evidence' className='font-semibold'>
            Photo evidence (optional)
          </label>
          <p id='evidence-guidance'>
            Up to 10 photos, maximum 3 MB each. Files upload individually when
            you submit. If an upload fails, your statement stays here for retry.
          </p>
          <input
            id='dispute-evidence'
            aria-describedby='evidence-guidance'
            type='file'
            accept='image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/bmp'
            multiple
            disabled={submitting}
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (
                selected.length + files.length > 10 ||
                selected.some((f) => f.size > 3 * 1024 * 1024 || !f.size)
              ) {
                setError('Choose up to 10 photos, each no larger than 3 MB.');
                e.target.value = '';
                return;
              }
              setFiles((previous) => [...previous, ...selected]);
              setError('');
              e.target.value = '';
            }}
          />
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name}{' '}
                <button
                  type='button'
                  disabled={submitting}
                  aria-label={'Remove ' + file.name}
                  onClick={() =>
                    setFiles((previous) =>
                      previous.filter((_, i) => i !== index)
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p>
          The review target is shown on the case after submission. Keep your
          evidence; bank settlement and provider delivery are tracked
          separately.
        </p>
        {error && <p role='alert'>{error}</p>}
        <button
          type='submit'
          className='btn btn-primary'
          disabled={
            submitting || !reason || !outcome || description.trim().length < 10
          }
        >
          {submitting ? 'Submitting evidence and case…' : 'Open dispute'}
        </button>
      </form>
    </main>
  );
}
