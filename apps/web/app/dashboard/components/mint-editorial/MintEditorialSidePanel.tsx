import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import {
  formatGBP,
  initials,
  type Appointment,
  type PendingBid,
} from './dashboardHelpers';

function NeedsYouCard({ topBid }: { topBid?: PendingBid }) {
  return (
    <div className='card card-pad'>
      <h2 className='t-h4' style={{ marginBottom: 10 }}>
        Needs you
      </h2>
      <div className='col' style={{ gap: 12 }}>
        {topBid ? (
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
                {initials(topBid.contractorName)}
              </span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {topBid.contractorName} sent a bid
              </div>
            </div>
            <div className='t-meta'>
              {topBid.jobTitle} · {formatGBP(topBid.amount)}
            </div>
            <div className='row' style={{ gap: 6 }}>
              <Link
                href={`/jobs/${topBid.jobId}`}
                className='btn btn-primary btn-sm'
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Review
              </Link>
              <Link
                href={`/messages?job=${topBid.jobId}`}
                className='btn btn-secondary btn-sm'
              >
                Reply
              </Link>
            </div>
          </div>
        ) : (
          <p className='t-body'>
            You're all caught up. New bids and quotes will appear here.
          </p>
        )}
      </div>
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
  appointments,
  escrowHeld,
}: {
  topBid?: PendingBid;
  appointments: Appointment[];
  escrowHeld: number;
}) {
  return (
    <div className='col' style={{ gap: 18 }}>
      <NeedsYouCard topBid={topBid} />
      {appointments.length > 0 && <UpNextCard appointments={appointments} />}
      {escrowHeld > 0 && <PaymentProtectedCard escrow={escrowHeld} />}
    </div>
  );
}
