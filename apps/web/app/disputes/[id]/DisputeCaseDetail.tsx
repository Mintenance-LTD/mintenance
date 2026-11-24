'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
import { Button } from '@/components/ui';
import {
  formatDisputeDate,
  type DisputeHistoryEntry,
} from '@/lib/disputes/history';
import {
  describeDispute,
  type DisputeState,
} from '@/lib/disputes/presentation';
import { useMediationRequest } from '../components/useMediationRequest';

export interface DisputeCase extends DisputeState {
  job_id?: string | null;
  archived?: boolean;
  description?: string | null;
  dispute_reason?: string | null;
  dispute_evidence?: unknown[];
  history?: DisputeHistoryEntry[];
  history_incomplete?: boolean;
  mediation_scheduled_at?: string | null;
  resolution?: string | null;
  sla_deadline?: string | null;
}

interface Props {
  disputeId: string;
  dispute: DisputeCase;
  contractor: boolean;
  onRefresh: () => void;
}

const cardClass =
  'rounded-2xl border border-[var(--me-line,#dbe3de)] bg-[var(--me-surface,#fff)] p-5 sm:p-6';

export function DisputeCaseDetail({
  disputeId,
  dispute,
  contractor,
  onRefresh,
}: Props) {
  const state = describeDispute(dispute);
  const mediation = useMediationRequest(disputeId, onRefresh);
  const history = dispute.history ?? [];
  const jobHref = dispute.job_id
    ? `${contractor ? '/contractor/jobs/' : '/jobs/'}${encodeURIComponent(dispute.job_id)}`
    : null;

  return (
    <main className='mx-auto max-w-6xl space-y-6 px-4 py-6 text-[var(--me-ink,#17251f)] sm:px-6'>
      <header className='space-y-3'>
        <Link
          href={jobHref ?? '/disputes'}
          className='inline-flex items-center gap-2 text-sm underline underline-offset-4'
        >
          <ArrowLeft size={16} aria-hidden='true' />
          {jobHref ? 'Back to job' : 'All disputes'}
        </Link>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span className='text-sm font-medium tracking-wide text-[var(--me-ink-2,#40564b)]'>
            DSP-{disputeId.slice(0, 8).toUpperCase()}
          </span>
          {state.paymentPaused && (
            <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900'>
              <ShieldAlert size={15} aria-hidden='true' />
              Payment paused
            </span>
          )}
        </div>
        <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
          {state.title}
        </h1>
      </header>
      <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
        <section className={cardClass} aria-labelledby='dispute-next-step'>
          <h2 id='dispute-next-step' className='text-lg font-semibold'>
            Next step
          </h2>
          <p className='mt-2 text-sm leading-relaxed'>{state.nextStep}</p>
          <dl className='mt-4 space-y-3 border-t border-[var(--me-line,#dbe3de)] pt-4 text-sm'>
            <div>
              <dt className='font-medium'>Mediation</dt>
              <dd className='mt-0.5'>{state.mediation}</dd>
              {!state.finished &&
                state.mediation === 'Scheduled' &&
                dispute.mediation_scheduled_at && (
                  <dd>
                    <time dateTime={dispute.mediation_scheduled_at}>
                      {formatDisputeDate(dispute.mediation_scheduled_at)} UK
                      time
                    </time>
                  </dd>
                )}
            </div>
            {!state.finished && dispute.sla_deadline && (
              <div>
                <dt className='font-medium'>Decision target</dt>
                <dd className='mt-0.5'>
                  <time dateTime={dispute.sla_deadline}>
                    {formatDisputeDate(dispute.sla_deadline, false)}
                  </time>
                </dd>
              </div>
            )}
          </dl>
          {state.canRequestMediation && (
            <div className='mt-4 space-y-2'>
              <Button
                variant='secondary'
                onClick={mediation.request}
                disabled={mediation.pending}
              >
                {mediation.pending ? 'Saving request…' : 'Request mediation'}
              </Button>
              <p className='text-sm text-[var(--me-ink-2,#40564b)]'>
                Optional help to reach an agreement.
              </p>
            </div>
          )}
          {mediation.error && (
            <p role='alert' className='mt-2 text-sm text-red-700'>
              {mediation.error}
            </p>
          )}
        </section>
        <section className={cardClass} aria-labelledby='dispute-history'>
          <h2 id='dispute-history' className='text-lg font-semibold'>
            Case history
          </h2>
          {dispute.history_incomplete && (
            <p role='status' className='mt-2 text-sm'>
              Some history is temporarily unavailable. Refresh to try again.
            </p>
          )}
          {history.length === 0 ? (
            <p className='mt-2 text-sm'>
              No activity has been recorded for this case yet.
            </p>
          ) : (
            <ol className='mt-4 divide-y divide-[var(--me-line,#dbe3de)]'>
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className='space-y-2 break-words py-4 first:pt-0 last:pb-0'
                >
                  <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                    <h3 className='text-sm font-semibold'>{entry.title}</h3>
                    {entry.at && (
                      <time
                        className='text-xs text-[var(--me-ink-2,#40564b)]'
                        dateTime={entry.at}
                      >
                        {formatDisputeDate(entry.at)}
                      </time>
                    )}
                  </div>
                  {entry.reason && (
                    <p className='whitespace-pre-wrap text-sm'>
                      {entry.reason}
                    </p>
                  )}
                  {entry.description && (
                    <p className='whitespace-pre-wrap text-sm'>
                      {entry.description}
                    </p>
                  )}
                  {entry.evidence && (
                    <DisputeEvidenceLinks
                      items={dispute.dispute_evidence}
                      showHeading={false}
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
