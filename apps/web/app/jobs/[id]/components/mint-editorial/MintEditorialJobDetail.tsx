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
import toast from 'react-hot-toast';
import { canRevealKeySafeCode } from '@/lib/services/jobs/key-safe-reveal';
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
  AccessSharedCard,
} from './MintEditorialJobRightRail';
import { HomeownerChecklistEditor } from './HomeownerChecklistEditor';
import { TipJarCard } from './TipJarCard';
import {
  MintEditorialJobTabBody,
  type TabKey,
} from './MintEditorialJobTabBody';
import {
  pendingOnly,
  acceptedBidOf,
  bidContractorName,
  pickRecommended,
  median,
} from './bidDerivation';

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
  /** Row from `building_assessments` (or null). The `.assessment_data`
   *  jsonb is what BuildingAssessmentDisplay actually renders. Routed
   *  through to the Overview tab body so the AI card surfaces. */
  buildingAssessment?: Record<string, unknown> | null;
  lifecycle: LifecycleData;
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
  buildingAssessment,
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
  // 2026-07-21: every bid signal here keyed off `pending` only, so the moment
  // a bid was ACCEPTED the page reverted to "Waiting for bids" — on a job that
  // by then had an assigned contractor, a signed contract and work underway.
  // An accepted bid means bidding is over, not that it never happened.
  const acceptedBid = acceptedBidOf(bids);
  const acceptedName = acceptedBid ? bidContractorName(acceptedBid) : null;
  const aiSummary = acceptedBid
    ? `Bid accepted — ${formatGBP(acceptedBid.amount)} with ${acceptedName}. Bidding is closed for this job.`
    : pending.length === 0
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

  // Preferred start date is stashed in `requirements.preferred_start_date`
  // by the job-creation wizard (see /jobs/create utils/submitJob.ts).
  // Surface it as a 5th hero meta pill so homeowners can see what
  // they asked for, and contractors can see what to bid against.
  const preferredStartLabel = job.preferred_start_date
    ? new Date(job.preferred_start_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

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
    // 2026-05-22: homeowner-set budget no longer surfaced. When escrow
    // is held we still show the locked amount (it's the agreed price,
    // not the homeowner's ceiling).
    ...(escrowHeld > 0
      ? [
          {
            Icon: Shield,
            text: `${formatGBP(escrowHeld)} escrow held`,
          },
        ]
      : []),
    ...(preferredStartLabel
      ? [{ Icon: Calendar, text: `Prefers ${preferredStartLabel}` }]
      : []),
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
      toast.success('Bid accepted — drafting your contract');
      router.refresh();
    } catch (e) {
      // 2026-05-27 audit-76 P1: previously this only logged. The
      // /accept route returns structured errors for cap exceeded,
      // contractor missing Stripe Connect, bid not pending, or
      // already-accepted-elsewhere. Without a toast the homeowner
      // tapped Accept, the button reset, and they had no idea why
      // nothing happened. Surface the route's error string so they
      // can act (top up Stripe Connect, withdraw a different
      // assignment, etc).
      logger.error('Failed to accept bid', e);
      toast.error(
        e instanceof Error
          ? e.message
          : 'Failed to accept bid. Please try again.'
      );
      setAccepting(false);
    }
  };

  // Count every bid, not just pending ones — otherwise the tab reads
  // "Bids · 0" on a job whose bid was accepted (see acceptedBid above).
  const tabCounts = { bids: bids.length, photos: photos.length };

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
        className='me-job-hero'
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
        className='me-job-body'
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
          buildingAssessment={buildingAssessment}
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

          {/* Pre-arrival checklist editor — homeowner can add/remove
              items while job.status is `posted` or `assigned`. After
              that the editor becomes read-only (still shows ticked
              state from the contractor) so changing the checklist
              mid-job doesn't confuse the contractor. */}
          <HomeownerChecklistEditor jobId={job.id} jobStatus={job.status} />

          {/* Access shared with contractor — mirror of what the
              contractor sees on `/contractor/jobs/[id]`.
              2026-05-27 audit-76 P1: derive the canSeeCode signal
              via the shared canRevealKeySafeCode helper (same as
              the contractor page line 199). Previous jobStage
              tunnelling revealed the code once escrow funded +
              status==='assigned' — which is days before the
              scheduled visit. The shared helper enforces the
              documented "1h before scheduled start" rule, so the
              homeowner is no longer told the contractor can see
              the code when the contractor page still masks it. */}
          {property ? (
            <AccessSharedCard
              property={property}
              canSeeCode={canRevealKeySafeCode({
                status: job.status,
                scheduled_start_date: job.scheduled_start_date,
              })}
            />
          ) : null}

          {/* Tip jar — only renders for completed jobs. Self-gates
              on jobStatus so we don't have to duplicate the check
              here. */}
          <TipJarCard
            jobId={job.id}
            jobStatus={job.status}
            contractorFirstName={contractor?.first_name ?? null}
          />

          <QuickActionsList jobId={job.id} status={job.status} />
        </aside>
      </div>
    </>
  );
}
