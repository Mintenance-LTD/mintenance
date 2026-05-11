import Link from 'next/link';
import { ArrowRight, AlertCircle, ShieldCheck, Home } from 'lucide-react';
import {
  formatGBP,
  initials,
  type Appointment,
  type NeedsYouItem,
  type PendingBid,
} from './dashboardHelpers';

function NeedsYouRow({ item }: { item: NeedsYouItem }) {
  if (item.kind === 'bid' || item.kind === 'quote') {
    const verb = item.kind === 'quote' ? 'sent a quote' : 'sent a bid';
    const primaryLabel = item.kind === 'quote' ? 'Approve & hold' : 'Review';
    return (
      <div
        className='col'
        style={{
          gap: 8,
          padding: 12,
          background: 'var(--me-brand-soft)',
          borderRadius: 10,
        }}
      >
        <div className='row' style={{ gap: 8 }}>
          <span
            className='avatar avatar-sm'
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
            }}
          >
            {initials(item.contractorName)}
          </span>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {item.contractorName} {verb}
          </div>
        </div>
        <div className='t-meta'>
          {item.jobTitle} · {formatGBP(item.amount)}
        </div>
        <div className='row' style={{ gap: 6 }}>
          <Link
            href={`/jobs/${item.jobId}`}
            className='btn btn-primary btn-sm'
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {primaryLabel}
          </Link>
          <Link
            href={`/messages?job=${item.jobId}`}
            className='btn btn-secondary btn-sm'
          >
            Reply
          </Link>
        </div>
      </div>
    );
  }

  if (item.kind === 'bidsClosing') {
    return (
      <div className='row' style={{ gap: 10 }}>
        <span
          className='avatar avatar-sm'
          style={{
            background: 'var(--me-warn-bg)',
            color: 'var(--me-warn-fg)',
          }}
        >
          <AlertCircle size={14} strokeWidth={1.75} />
        </span>
        <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {item.bidCount} bids on {item.jobTitle}
          </div>
          <div className='t-meta'>
            Closes in {item.closesInHours}h · review before sending replies
          </div>
        </div>
        <Link href={`/jobs/${item.jobId}`} className='btn btn-secondary btn-sm'>
          Open
        </Link>
      </div>
    );
  }

  // verifyProp
  return (
    <div className='row' style={{ gap: 10 }}>
      <span
        className='avatar avatar-sm'
        style={{
          background: 'var(--me-info-bg)',
          color: 'var(--me-info-fg)',
        }}
      >
        <Home size={14} strokeWidth={1.75} />
      </span>
      <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Verify {item.propertyName}
        </div>
        <div
          className='t-meta'
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.address}
        </div>
      </div>
      <Link
        href={`/properties/${item.id}/edit`}
        className='btn btn-secondary btn-sm'
      >
        Verify
      </Link>
    </div>
  );
}

function NeedsYouCard({
  items,
  topBidFallback,
}: {
  items: NeedsYouItem[];
  topBidFallback?: PendingBid;
}) {
  // If the server didn't supply a `needsYou` feed, derive a single
  // bid row from the legacy `pendingBids[0]` shape so existing data
  // paths keep rendering without a follow-up server change.
  const resolved: NeedsYouItem[] =
    items.length > 0
      ? items
      : topBidFallback
        ? [
            {
              kind: 'bid',
              id: topBidFallback.id,
              contractorName: topBidFallback.contractorName,
              jobTitle: topBidFallback.jobTitle,
              jobId: topBidFallback.jobId,
              amount: topBidFallback.amount,
            },
          ]
        : [];

  return (
    <div className='card card-pad'>
      <h2 className='t-h4' style={{ marginBottom: 10 }}>
        Needs you
      </h2>
      {resolved.length === 0 ? (
        <p className='t-body'>
          You're all caught up. New bids and quotes will appear here.
        </p>
      ) : (
        <div className='col' style={{ gap: 12 }}>
          {resolved.slice(0, 4).map((item) => (
            <NeedsYouRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function UpNextCard({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className='card card-pad'>
      <div className='between' style={{ marginBottom: 10 }}>
        <h2 className='t-h4'>Up next</h2>
        <Link href='/scheduling' className='btn btn-ghost btn-sm'>
          Calendar <ArrowRight size={12} strokeWidth={1.75} />
        </Link>
      </div>
      <div className='col' style={{ gap: 10 }}>
        {appointments.slice(0, 3).map((apt) => {
          const d = new Date(apt.date);
          return (
            <div key={apt.id} className='row' style={{ gap: 12 }}>
              <div
                style={{
                  width: 44,
                  textAlign: 'center',
                  padding: '6px 0',
                  background: 'var(--me-bg-2)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--me-ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                  }}
                >
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>
                  {d.getDate()}
                </div>
              </div>
              <div className='col' style={{ gap: 2, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{apt.title}</div>
                <div className='t-meta'>
                  {apt.time}
                  {apt.endTime ? ` – ${apt.endTime}` : ''}
                  {apt.contractor?.name ? ` · ${apt.contractor.name}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentProtectedCard({ escrow }: { escrow: number }) {
  return (
    <div
      className='card card-pad'
      style={{
        background: 'var(--me-brand-soft)',
        borderColor: 'transparent',
      }}
    >
      <div className='row' style={{ gap: 10, marginBottom: 8 }}>
        <ShieldCheck
          size={18}
          strokeWidth={1.75}
          style={{ color: 'var(--me-brand)' }}
        />
        <h2 className='t-h4' style={{ color: 'var(--me-brand)' }}>
          Payment protected
        </h2>
      </div>
      <p className='t-body' style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
        {formatGBP(escrow)} is held in escrow. Funds release only when you sign
        off the work.
      </p>
    </div>
  );
}

export function MintEditorialSidePanel({
  topBid,
  needsYou,
  appointments,
  escrowHeld,
}: {
  topBid?: PendingBid;
  needsYou?: NeedsYouItem[];
  appointments: Appointment[];
  escrowHeld: number;
}) {
  return (
    <div className='col' style={{ gap: 18 }}>
      <NeedsYouCard items={needsYou ?? []} topBidFallback={topBid} />
      {appointments.length > 0 && <UpNextCard appointments={appointments} />}
      {escrowHeld > 0 && <PaymentProtectedCard escrow={escrowHeld} />}
    </div>
  );
}
