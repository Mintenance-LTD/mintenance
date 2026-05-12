'use client';

/**
 * Mint Editorial /jobs/[id] surface — canonical layout from
 * design-system/project/redesign-v2/job-detail.html lines 100-296.
 *
 * Replaces the prior card-grid bid view with the canonical
 * comparison-table layout: hero strip + Mint AI summary card +
 * Overview/Bids/Photos/Messages/Payments/Timeline tabs + 2-col body
 * (compare-bids table on the left, sticky right-rail with the
 * currently-selected contractor card + "How payment works" trust
 * panel + Quick actions).
 *
 * Acceptance still flows through the existing
 * `/api/jobs/[id]/bids/[bidId]/accept` route via the rail's
 * onAccept callback — same as the legacy BidCard, just rerouted.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Shield,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import type { Bid } from '../BidCard';
import {
  formatGBP,
  formatPosted,
  statusBadge,
  type ContractorShape,
  type JobShape,
  type PropertyShape,
} from './MintEditorialJobCards';
import {
  SelectedContractorCard,
  HowPaymentWorksCard,
  QuickActionsList,
} from './MintEditorialJobRightRail';
import {
  MintEditorialJobTabBody,
  type TabKey,
} from './MintEditorialJobTabBody';

interface LifecycleData {
  contractStatus?: string | null;
  /** Raw ISO timestamps so the Timeline tab can render real
   *  signing events. Null while unsigned. */
  contractContractorSignedAt?: string | null;
  contractHomeownerSignedAt?: string | null;
  escrowStatus?: string | null;
  bidCount: number;
  pendingBidCount: number;
  completionConfirmed: boolean;
}

interface PhotoRecord {
  id: string;
  photo_url: string;
  created_at?: string | null;
}

interface Props {
  job: JobShape;
  property?: PropertyShape | null;
  contractor?: ContractorShape | null;
  bids: Bid[];
  photos: string[];
  /** Before / after photo records with timestamps — passed through
   *  to the Timeline tab so each upload can emit an event. The
   *  Photos tab only needs the flat URL list (`photos`). */
  beforePhotos?: PhotoRecord[];
  afterPhotos?: PhotoRecord[];
  lifecycle: LifecycleData;
}

function pendingOnly(bids: Bid[]): Bid[] {
  return bids.filter((b) => b.status === 'pending');
}

/**
 * Pick the "recommended" bid by a small heuristic: highest rating
 * × verified status, then lowest amount as a tiebreaker. Returns
 * null if there's nothing to score. The canonical mock uses a
 * dedicated AI model; this is a transparent in-page approximation.
 */
function pickRecommended(bids: Bid[]): string | null {
  if (bids.length === 0) return null;
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const b of bids) {
    const rating = b.contractor.rating ?? 4.0;
    const verified = b.contractor.admin_verified ? 0.4 : 0;
    const priceWeight = 1 - Math.min(1, (b.amount || 0) / 5000) * 0.3;
    const score = rating + verified + priceWeight;
    if (score > bestScore) {
      bestScore = score;
      bestId = b.id;
    }
  }
  return bestId;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

const TABS: {
  id: TabKey;
  label: (counts: { bids: number; photos: number }) => string;
}[] = [
  { id: 'overview', label: () => 'Overview' },
  { id: 'bids', label: (c) => `Bids · ${c.bids}` },
  { id: 'photos', label: (c) => `Photos · ${c.photos}` },
  { id: 'messages', label: () => 'Messages' },
  { id: 'payments', label: () => 'Payments' },
  { id: 'timeline', label: () => 'Timeline' },
];

export function MintEditorialJobDetail({
  job,
  property,
  contractor,
  bids,
  photos,
  beforePhotos,
  afterPhotos,
  lifecycle,
}: Props) {
  const router = useRouter();
  const pending = useMemo(() => pendingOnly(bids), [bids]);
  const recommendedId = useMemo(() => pickRecommended(pending), [pending]);
  const [selectedId, setSelectedId] = useState<string | null>(
    recommendedId || pending[0]?.id || null
  );
  useEffect(() => {
    if (!selectedId && pending.length > 0) {
      setSelectedId(recommendedId || pending[0].id);
    }
  }, [pending, recommendedId, selectedId]);

  const [tab, setTab] = useState<TabKey>(
    pending.length > 0 ? 'bids' : 'overview'
  );
  const [accepting, setAccepting] = useState(false);

  const selectedBid =
    pending.find((b) => b.id === selectedId) || pending[0] || null;

  // Mint AI summary copy — derives from the bids data, no fake numbers.
  const verifiedCount = pending.filter(
    (b) => b.contractor.admin_verified
  ).length;
  const med = median(pending.map((b) => b.amount));
  const recommended = pending.find((b) => b.id === recommendedId);
  const aiSummary =
    pending.length === 0
      ? 'Waiting for bids. We typically see the first bid within an hour of posting.'
      : `${pending.length} ${pending.length === 1 ? 'bid' : 'bids'} in${
          verifiedCount > 0 ? ` (${verifiedCount} verified)` : ''
        }. Median ${formatGBP(med)}.${
          recommended
            ? ` ${
                recommended.contractor.first_name ||
                recommended.contractor.company_name?.split(' ')[0] ||
                'Top pick'
              } is recommended — highest fit on rating and verification.`
            : ''
        }`;

  const escrowHeld = lifecycle.escrowStatus === 'held' ? job.budget : 0;
  const headerMeta: { Icon: typeof MapPin; text: string }[] = [
    {
      Icon: MapPin,
      text: property?.address || job.location || 'Location not set',
    },
    {
      Icon: Calendar,
      text: formatPosted(job.created_at),
    },
    {
      Icon: Wrench,
      text: job.category || 'General',
    },
    {
      Icon: Shield,
      text:
        escrowHeld > 0
          ? `${formatGBP(escrowHeld)} escrow held`
          : `Budget ${job.budget > 0 ? formatGBP(job.budget) : '—'}`,
    },
  ];

  const handleAccept = async () => {
    if (!selectedBid) return;
    setAccepting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(
        `/api/jobs/${job.id}/bids/${selectedBid.id}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to accept bid');
      }
      router.refresh();
    } catch (e) {
      logger.error('Failed to accept bid', e);
      setAccepting(false);
    }
  };

  const tabCounts = { bids: pending.length, photos: photos.length };

  return (
    <>
      {/* Back link */}
      <Link
        href='/jobs'
        className='btn btn-ghost btn-sm'
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} /> My jobs
      </Link>

      {/* Hero strip — left: status/title/meta, right: Mint AI summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 22,
          marginBottom: 18,
          alignItems: 'flex-start',
        }}
      >
        <div className='col' style={{ gap: 8, minWidth: 0 }}>
          <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
            {statusBadge(job.status)}
            <span className='t-meta'>
              {formatPosted(job.created_at)} · Job #
              {job.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <h1 className='t-h1' style={{ wordBreak: 'break-word' }}>
            {job.title}
          </h1>
          <div
            className='row'
            style={{
              gap: 14,
              flexWrap: 'wrap',
              color: 'var(--me-ink-2)',
              fontSize: 13,
            }}
          >
            {headerMeta.map((m, i) => (
              <span
                key={i}
                style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}
              >
                <m.Icon size={13} strokeWidth={1.75} /> {m.text}
              </span>
            ))}
          </div>
        </div>

        <div className='card card-pad'>
          <div className='row' style={{ gap: 8, marginBottom: 8 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'var(--me-brand-soft)',
                color: 'var(--me-brand)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sparkles size={13} strokeWidth={1.75} />
            </span>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Mint AI summary</div>
          </div>
          <p className='t-body' style={{ fontSize: 12, lineHeight: 1.55 }}>
            {aiSummary}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        role='tablist'
        style={{
          display: 'flex',
          gap: 22,
          borderBottom: '1px solid var(--me-line-2)',
          marginBottom: 18,
          overflowX: 'auto',
        }}
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type='button'
              role='tab'
              aria-selected={on}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 2px',
                fontSize: 13,
                fontWeight: 600,
                color: on ? 'var(--me-ink)' : 'var(--me-ink-3)',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${on ? 'var(--me-ink)' : 'transparent'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label(tabCounts)}
            </button>
          );
        })}
      </div>

      {/* Body — 2-col with sticky right rail */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 24,
        }}
      >
        <MintEditorialJobTabBody
          tab={tab}
          job={job}
          property={property}
          pendingBids={pending}
          allBids={bids}
          photos={photos}
          beforePhotos={beforePhotos}
          afterPhotos={afterPhotos}
          lifecycle={lifecycle}
          selectedId={selectedId}
          recommendedId={recommendedId}
          onSelect={setSelectedId}
        />

        {/* Right rail — sticky */}
        <aside
          className='col'
          style={{
            gap: 14,
            position: 'sticky',
            top: 84,
            alignSelf: 'start',
          }}
        >
          {selectedBid ? (
            <SelectedContractorCard
              bid={selectedBid}
              jobId={job.id}
              onAccept={handleAccept}
              accepting={accepting}
            />
          ) : contractor ? (
            <div className='card card-pad'>
              <h3 className='t-h4'>Assigned contractor</h3>
              <p className='t-body' style={{ marginTop: 6, fontSize: 13 }}>
                {contractor.first_name} {contractor.last_name}
              </p>
            </div>
          ) : null}

          {selectedBid ? (
            <HowPaymentWorksCard
              escrowDisplay={formatGBP(selectedBid.amount)}
              contractorFirstName={
                selectedBid.contractor.first_name ||
                selectedBid.contractor.company_name?.split(' ')[0] ||
                'the contractor'
              }
            />
          ) : (
            <HowPaymentWorksCard
              escrowDisplay={
                job.budget > 0 ? formatGBP(job.budget) : 'your funds'
              }
              contractorFirstName='the contractor'
            />
          )}

          <QuickActionsList jobId={job.id} status={job.status} />
        </aside>
      </div>
    </>
  );
}
