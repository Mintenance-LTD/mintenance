'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
import { formatCurrency } from './DisputesTable';
import {
  disputeReviewStatus,
  DISPUTED_PAYMENT_LABEL,
} from '@/lib/admin/dispute-display';
import {
  DisputeCaseDecisions,
  type SettlementCase,
} from './DisputeCaseDecisions';
import { CloseDisputeCase } from './CloseDisputeCase';

interface CaseDetail {
  id: string;
  assignedAdmin: string | null;
  assignedAt?: string | null;
  decisionActor?: string | null;
  savedResolution:
    | (NonNullable<SettlementCase['resolution']> & {
        created_at: string;
        completed_at: string | null;
      })
    | null;
  escrow: {
    amount: number;
    status: string;
    adminHoldStatus: string;
    releaseBlockedReason: string | null;
    adminHoldAt?: string | null;
    holdActor?: string | null;
    slaDeadline: string | null;
    createdAt: string;
  };
  dispute: {
    recordId: string;
    reason: string | null;
    description: string | null;
    status: string;
    createdAt: string;
    raisedBy?: string | null;
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
  parties: {
    homeowner: { id: string | null; name: string };
    contractor: { id: string | null; name: string };
  };
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
    actor_id?: string;
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
  const review = disputeReviewStatus(
    data.dispute?.status === 'closed' ? 'closed' : data.escrow.adminHoldStatus,
    data.escrow.slaDeadline
  );
  const canHold =
    data.escrow.adminHoldStatus === 'pending_review' && !data.savedResolution;
  const canResolve =
    !!data.savedResolution ||
    (review.active && data.escrow.status === 'disputed');
  function participant(id?: string | null) {
    if (id && id === data?.parties.homeowner.id) return 'Homeowner';
    if (id && id === data?.parties.contractor.id) return 'Contractor';
    return null;
  }
  const events = [
    { title: 'Payment recorded', at: data.escrow.createdAt },
    ...(data.job
      ? [
          { title: 'Job created', at: data.job.createdAt },
          ...(data.job.completedAt
            ? [{ title: 'Work marked complete', at: data.job.completedAt }]
            : []),
        ]
      : []),
    ...(data.dispute
      ? [
          {
            title: 'Dispute opened',
            at: data.dispute.createdAt,
            actor: participant(data.dispute.raisedBy),
            href: '#case-statement',
          },
        ]
      : []),
    ...(data.assignedAt && data.assignedAdmin
      ? [
          {
            title: 'Case assigned to ' + data.assignedAdmin,
            at: data.assignedAt,
          },
        ]
      : []),
    ...(data.escrow.adminHoldAt
      ? [
          {
            title: 'Administrator hold recorded',
            at: data.escrow.adminHoldAt,
            actor: data.escrow.holdActor,
            href: '#case-payment',
          },
        ]
      : []),
    ...(data.savedResolution?.created_at
      ? [
          {
            title: 'Settlement decision recorded',
            at: data.savedResolution.created_at,
            actor: data.decisionActor,
            href: '#case-statement',
          },
        ]
      : []),
    ...(data.dispute?.resolvedAt
      ? [
          {
            title:
              data.dispute.status === 'closed'
                ? 'Case closed'
                : 'Case resolved',
            at: data.dispute.resolvedAt,
            href: '#case-statement',
          },
        ]
      : []),
    ...(data.rework ?? []).flatMap((r) => [
      {
        title: 'Changes requested: ' + r.comments,
        at: r.created_at,
        actor: participant(r.actor_id),
        href: '#case-photos',
      },
      ...(r.completion_version
        ? [
            {
              title: 'Earlier work completion recorded',
              at: r.completion_version,
            },
          ]
        : []),
      ...(r.submitted_at
        ? [{ title: 'Rework submitted', at: r.submitted_at }]
        : []),
    ]),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const seenEvents = new Set<string>();
  const distinctEvents = events.filter(({ at, title }) => {
    const key = at + '|' + title;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });
  return (
    <main className='mx-auto max-w-5xl p-6 space-y-6'>
      <Link href='/admin/disputes' className='underline'>
        Back to dispute queue
      </Link>
      <h1 className='text-3xl font-bold'>
        Case: {data.job?.title ?? 'Payment review'}
      </h1>
      <section
        className={section}
        id='case-payment'
        aria-label='Case and payment status'
      >
        <p>
          {data.parties.homeowner.name} · {data.parties.contractor.name}
        </p>
        <dl className='grid gap-4 sm:grid-cols-3'>
          <div>
            <dt>Review status</dt>
            <dd className='font-semibold'>{review.label}</dd>
          </div>
          <div>
            <dt>Decision due</dt>
            <dd>{date(review.active ? data.escrow.slaDeadline : null)}</dd>
          </div>
          <div>
            <dt>Next action owner</dt>
            <dd>
              {review.active
                ? (data.assignedAdmin ?? 'Admin team · unassigned')
                : '—'}
            </dd>
          </div>
        </dl>
        <p>
          <strong>{formatCurrency(data.escrow.amount)}</strong> ·{' '}
          {data.escrow.status === 'disputed'
            ? DISPUTED_PAYMENT_LABEL
            : data.escrow.status.replace(/_/g, ' ')}
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
      <section
        className={section}
        id='case-statement'
        aria-label='Complaint and requested outcome'
      >
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
      <section
        className={section}
        id='case-photos'
        aria-label='Job photo evidence'
      >
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
          {distinctEvents.map((event) => (
            <li key={event.at + event.title}>
              <time dateTime={event.at}>{date(event.at)}</time>
              <p className='whitespace-pre-wrap'>
                {'actor' in event && event.actor && (
                  <strong>{event.actor} · </strong>
                )}
                {'href' in event && event.href ? (
                  <a className='underline' href={event.href}>
                    {event.title}
                  </a>
                ) : (
                  event.title
                )}
              </p>
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
      {(canHold || canResolve) &&
        data.parties.homeowner.id &&
        data.parties.contractor.id && (
          <DisputeCaseDecisions
            canHold={canHold}
            canResolve={canResolve}
            dispute={{
              id: data.id,
              jobTitle: data.job?.title ?? 'Payment review',
              amount: data.escrow.amount,
              homeownerId: data.parties.homeowner.id,
              homeownerName: data.parties.homeowner.name,
              contractorId: data.parties.contractor.id,
              contractorName: data.parties.contractor.name,
              resolution: data.savedResolution,
            }}
            onChanged={() => void query.refetch()}
          />
        )}
      {data.dispute &&
        !data.savedResolution &&
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
    </main>
  );
}
