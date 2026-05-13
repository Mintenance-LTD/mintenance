'use client';

/**
 * Contractor-side mirror of `TipJarCard.tsx` (homeowner).
 *
 * Fetches `/api/jobs/[id]/tip` (RLS gates the rows — contractor sees
 * only their own receipts) and renders a canonical `.card` showing
 * total received + per-tip rows with the homeowner's optional note.
 *
 * Mounted only when the job is `completed` (gateway lives on the
 * parent `MintEditorialJobDetailView`). Renders nothing if the
 * contractor has received no completed tips — silence is the right
 * UX for a job that ended without a gratuity.
 */

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface TipRow {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  note: string | null;
  paid_at: string | null;
  created_at: string;
  payer_id: string;
  payee_id: string;
}

interface ContractorTipsReceivedCardProps {
  jobId: string;
}

function formatGbp(n: number): string {
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function ContractorTipsReceivedCard({
  jobId,
}: ContractorTipsReceivedCardProps) {
  const [tips, setTips] = useState<TipRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/tip`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const data = (await res.json()) as {
          tips: TipRow[];
          totalCompleted: number;
        };
        if (cancelled) return;
        setTips(data.tips || []);
        setTotal(Number(data.totalCompleted || 0));
      } catch (err) {
        logger.warn('Failed to fetch tips for contractor view', {
          service: 'contractor-tips',
          jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Hide entirely until loaded, and forever if nothing landed.
  // No empty-state — "you received no tips" isn't useful information.
  if (!loaded) return null;
  const completed = tips.filter((t) => t.status === 'completed');
  if (completed.length === 0) return null;

  return (
    <div className='card card-pad'>
      <div className='col' style={{ gap: 12 }}>
        <div className='row' style={{ gap: 8, alignItems: 'center' }}>
          <Heart
            size={16}
            strokeWidth={1.75}
            style={{ color: 'var(--me-brand)', fill: 'var(--me-brand-soft)' }}
          />
          <h3 className='t-h3' style={{ margin: 0 }}>
            Tips received
          </h3>
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--me-brand)',
            lineHeight: 1.1,
          }}
        >
          {formatGbp(total)}
        </div>
        <p className='t-meta' style={{ margin: 0 }}>
          {completed.length} {completed.length === 1 ? 'tip' : 'tips'} from this
          homeowner. Paid directly to your Stripe account — no platform fee.
        </p>

        {completed.some((t) => t.note) ? (
          <div
            className='col'
            style={{
              gap: 10,
              padding: 12,
              borderRadius: 8,
              background: 'var(--me-bg-2)',
              marginTop: 4,
            }}
          >
            {completed
              .filter((t) => t.note)
              .map((tip) => (
                <div key={tip.id} className='col' style={{ gap: 4 }}>
                  <div
                    className='between'
                    style={{ alignItems: 'baseline', gap: 8 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {formatGbp(Number(tip.amount))}
                    </span>
                    <span className='t-meta' style={{ fontSize: 11 }}>
                      {formatDate(tip.paid_at || tip.created_at)}
                    </span>
                  </div>
                  <p
                    className='t-body'
                    style={{
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: 'var(--me-ink-2)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.45,
                      margin: 0,
                    }}
                  >
                    &ldquo;{tip.note}&rdquo;
                  </p>
                </div>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
