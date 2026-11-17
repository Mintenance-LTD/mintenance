'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
import { formatCurrency } from './DisputesTable';
import { CloseDisputeCase } from './CloseDisputeCase';

interface CaseDetail {
  id: string;
  escrow: {
    amount: number;
    status: string;
    adminHoldStatus: string;
    releaseBlockedReason: string | null;
    slaDeadline: string | null;
    createdAt: string;
  };
  dispute: {
    recordId: string;
    reason: string | null;
    description: string | null;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
    resolution: string | null;
  } | null;
  job: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  } | null;
  parties: { homeowner: { name: string }; contractor: { name: string } };
  caseEvidence: { label: string; url: string | null }[];
  evidence: { id: string; url: string; type: string; createdAt: string }[];
  conversation: {
    id: string;
    senderName: string;
    content: string;
    createdAt: string;
  }[];
  agreements: {
    id: string;
    title: string;
    status: string;
    terms: unknown;
    amount: number;
    start_date: string | null;
    end_date: string | null;
    sent_at: string | null;
    homeowner_signed_at: string | null;
    contractor_signed_at: string | null;
  }[];
  rework: {
    id: string;
    comments: string;
    created_at: string;
    completion_version: string | null;
    submitted_at: string | null;
  }[];
}

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/London',
      }).format(new Date(value)) + ' UK'
    : 'Not recorded';
const section = 'rounded-xl border bg-white p-5 space-y-3';

export function AdminDisputeCase({ escrowId }: { escrowId: string }) {
  const query = useQuery<CaseDetail>({
    queryKey: ['admin', 'dispute-case', escrowId],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/disputes/${encodeURIComponent(escrowId)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.id !== escrowId)
        throw new Error(
          'Unable to load the full case. Refresh before making a decision.'
        );
      return body;
    },
  });
  const data = query.data;
  if (query.isPending)
    return (
      <p role='status' className='p-6'>
        Loading case and evidence…
      </p>
    );
  if (query.isError || !data)
    return (
      <div role='alert' className='p-6'>
        <p>Unable to load the full case. No settlement has been made.</p>
        <button onClick={() => void query.refetch()}>Retry loading case</button>
      </div>
    );
  const events = [
    { title: 'Payment recorded', at: data.escrow.createdAt },
    ...(data.job
      ? [
          { title: 'Job created', at: data.job.createdAt },
          ...(data.job.completedAt
            ? [{ title: 'Latest completion', at: data.job.completedAt }]
            : []),
        ]
      : []),
    ...(data.dispute
      ? [{ title: 'Dispute opened', at: data.dispute.createdAt }]
      : []),
    ...(data.rework ?? []).flatMap((r) => [
      { title: 'Changes requested: ' + r.comments, at: r.created_at },
      ...(r.completion_version
        ? [{ title: 'Previous completion', at: r.completion_version }]
        : []),
      ...(r.submitted_at
        ? [{ title: 'Rework submitted', at: r.submitted_at }]
        : []),
    ]),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return (
    <main className='mx-auto max-w-5xl p-6 space-y-6'>
      <Link href='/admin/disputes' className='underline'>
        Back to dispute queue and settlement actions
      </Link>
      <h1 className='text-3xl font-bold'>
        Case: {data.job?.title ?? 'Payment review'}
      </h1>
      <section className={section} aria-label='Case and payment status'>
        <p>
          {data.parties.homeowner.name} · {data.parties.contractor.name}
        </p>
        <p>
          <strong>{formatCurrency(data.escrow.amount)}</strong> · Payment:{' '}
          {data.escrow.status} · Review: {data.escrow.adminHoldStatus}
        </p>
        <p>
          Decision target: {date(data.escrow.slaDeadline)}. This is a review
          target, not a payout date.
        </p>
        {data.escrow.releaseBlockedReason && (
          <p>Hold: {data.escrow.releaseBlockedReason}</p>
        )}
        <p>Viewing this case does not change its status or move money.</p>
        {data.dispute?.status === 'closed' &&
          data.dispute.resolution?.startsWith('Closed without settlement.') && (
            <p role='status'>
              <strong>Case closed without settlement.</strong> Check the payment
              status above for its current hold. Closure did not pay, refund or
              restart automatic release.
            </p>
          )}
      </section>
      <section className={section} aria-label='Complaint and requested outcome'>
        <h2 className='text-xl font-semibold'>
          Statement and requested outcome
        </h2>
        <p>Reason: {data.dispute?.reason ?? 'No complaint recorded'}</p>
        <p className='whitespace-pre-wrap'>
          {data.dispute?.description?.split('\n\nEvidence:\n')[0] ??
            'No statement recorded. Obtain the missing information before deciding.'}
        </p>
        {data.dispute?.resolution && (
          <p>Recorded resolution: {data.dispute.resolution}</p>
        )}
        <DisputeEvidenceLinks items={data.caseEvidence} />
      </section>
      {data.dispute &&
        ['open', 'under_review', 'escalated'].includes(data.dispute.status) &&
        data.escrow.status === 'disputed' && (
          <CloseDisputeCase
            key={data.dispute.recordId}
            escrowId={escrowId}
            disputeId={data.dispute.recordId}
            onClosed={() => {
              void query.refetch();
            }}
          />
        )}
      <section className={section} aria-label='Job photo evidence'>
        <h2 className='text-xl font-semibold'>Job photos</h2>
        <DisputeEvidenceLinks
          items={(data.evidence ?? []).map((p, i) => ({
            label: `${p.type} photo ${i + 1} · ${date(p.createdAt)}`,
            url: /^https?:\/\//.test(p.url) ? p.url : null,
          }))}
        />
        {!data.evidence?.length && <p>No job photos recorded.</p>}
        <button
          className='underline'
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh evidence links
        </button>
      </section>
      <section className={section} aria-label='Agreements'>
        <h2 className='text-xl font-semibold'>Agreements</h2>
        {(data.agreements ?? []).map((a) => (
          <details key={a.id}>
            <summary>
              {a.title} · {a.status} · {formatCurrency(a.amount)}
            </summary>
            <p>
              Start: {date(a.start_date)} · End: {date(a.end_date)}
            </p>
            <p>First sent: {date(a.sent_at)}</p>
            <p>
              Homeowner signed: {date(a.homeowner_signed_at)} · Contractor
              signed: {date(a.contractor_signed_at)}
            </p>
            <pre className='whitespace-pre-wrap break-words text-sm'>
              {typeof a.terms === 'string'
                ? a.terms
                : JSON.stringify(a.terms, null, 2)}
            </pre>
          </details>
        ))}
        {!data.agreements?.length && <p>No agreement recorded.</p>}
      </section>
      <section className={section} aria-label='Case timeline'>
        <h2 className='text-xl font-semibold'>History</h2>
        <ol className='space-y-3'>
          {events.map((event, i) => (
            <li key={i}>
              <time>{date(event.at)}</time>
              <p className='whitespace-pre-wrap'>{event.title}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className={section} aria-label='Job conversation'>
        <h2 className='text-xl font-semibold'>Job conversation</h2>
        {(data.conversation ?? []).map((m) => (
          <article key={m.id}>
            <p>
              {m.senderName} · {date(m.createdAt)}
            </p>
            <p className='whitespace-pre-wrap'>{m.content}</p>
          </article>
        ))}
        {!data.conversation?.length && <p>No messages recorded.</p>}
      </section>
    </main>
  );
}
