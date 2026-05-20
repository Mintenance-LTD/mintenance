'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Tab-body slot for MintEditorialJobDetail. Extracted so the parent
 * stays under the 500-line MDC cap. Pure presentation — caller owns
 * the tab state and routes the right Bid list through.
 */

import React from 'react';
import Link from 'next/link';
import type { Bid } from '../BidCard';
import type { JobShape, PropertyShape } from './MintEditorialJobCards';
import { CompareBidsTable } from './CompareBidsTable';
import { MintEditorialJobTimeline } from './MintEditorialJobTimeline';
import { BuildingAssessmentDisplay } from '../BuildingAssessmentDisplay';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';

export type TabKey =
  | 'overview'
  | 'bids'
  | 'photos'
  | 'messages'
  | 'payments'
  | 'timeline';

interface PhotoRecord {
  id: string;
  photo_url: string;
  created_at?: string | null;
}

interface LifecycleData {
  contractStatus?: string | null;
  contractContractorSignedAt?: string | null;
  contractHomeownerSignedAt?: string | null;
  escrowStatus?: string | null;
  bidCount?: number;
  pendingBidCount?: number;
  completionConfirmed: boolean;
}

interface Props {
  tab: TabKey;
  job: JobShape;
  property?: PropertyShape | null;
  pendingBids: Bid[];
  /** Full bids list (including accepted / rejected) — Timeline tab
   *  emits one event per bid received. The Bids tab continues to
   *  render only pending bids via `pendingBids`. */
  allBids?: Bid[];
  photos: string[];
  beforePhotos?: PhotoRecord[];
  afterPhotos?: PhotoRecord[];
  /** Latest `building_assessments` row for this job (or null). The
   *  Overview tab renders the AI Building Assessment card from
   *  `.assessment_data` when present, or a "Run analysis" CTA when
   *  the assessment is missing but photos exist. */
  buildingAssessment?: Record<string, unknown> | null;
  lifecycle?: LifecycleData;
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
}

export function MintEditorialJobTabBody({
  tab,
  job,
  property,
  pendingBids,
  allBids,
  photos,
  beforePhotos,
  afterPhotos,
  buildingAssessment,
  lifecycle,
  selectedId,
  recommendedId,
  onSelect,
}: Props) {
  const aiAssessmentData =
    (buildingAssessment?.assessment_data as
      | Phase1BuildingAssessment
      | undefined) ?? null;
  const showAiCard =
    tab === 'overview' && (aiAssessmentData || photos.length > 0);
  return (
    <div className='col' style={{ gap: 18, minWidth: 0 }}>
      {tab === 'bids' || tab === 'overview' ? (
        pendingBids.length > 0 ? (
          <CompareBidsTable
            bids={pendingBids}
            selectedId={selectedId}
            recommendedId={recommendedId}
            onSelect={onSelect}
            jobId={job.id}
          />
        ) : (
          <div className='card card-pad' style={{ textAlign: 'center' }}>
            <h2 className='t-h4' style={{ marginBottom: 6 }}>
              Waiting for bids
            </h2>
            <p className='t-body'>
              Most jobs get their first bid within an hour of posting.
            </p>
          </div>
        )
      ) : null}

      {(tab === 'overview' || tab === 'photos') && photos.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {photos.slice(0, 6).map((src, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '4 / 3',
                borderRadius: 12,
                background: 'var(--me-bg-2)',
                border: '1px solid var(--me-line)',
                overflow: 'hidden',
              }}
            >
              <img
                src={src}
                alt={`Job photo ${i + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {showAiCard ? (
        // BuildingAssessmentDisplay carries its own Tailwind chrome
        // (white card, indigo/purple accents). Wrapping the embed in
        // `me-legacy-fit` lets the override layer in mint-editorial.css
        // map the Tailwind colors to the mint palette so the card
        // doesn't clash with the rest of the Overview surface.
        // Visual diff from the legacy view = none beyond the colour
        // mapping; the same component renders the mismatch warning,
        // damage type, severity, etc.
        <div className='me-legacy-fit'>
          <BuildingAssessmentDisplay
            assessment={aiAssessmentData}
            jobId={job.id}
            jobCategory={job.category}
            photoUrls={photos}
          />
        </div>
      ) : null}

      {tab === 'overview' ? (
        <div className='card card-pad'>
          <h2 className='t-h4' style={{ marginBottom: 10 }}>
            Job brief
          </h2>
          <p
            className='t-body'
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {job.description || 'No description provided.'}
          </p>
          <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className='badge badge-mute'>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </span>
            {job.category ? (
              <span className='badge badge-mute'>{job.category}</span>
            ) : null}
            {property?.address ? (
              <span className='badge badge-mute'>{property.address}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'messages' ? (
        <div className='card card-pad'>
          <h2 className='t-h4' style={{ marginBottom: 8 }}>
            Messages
          </h2>
          <p className='t-body' style={{ marginBottom: 12 }}>
            Conversation lives in the dedicated inbox.
          </p>
          <Link
            href={`/messages?jobId=${job.id}`}
            className='btn btn-primary btn-sm'
          >
            Open thread →
          </Link>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className='card card-pad'>
          <h2 className='t-h4' style={{ marginBottom: 8 }}>
            Payments
          </h2>
          <p className='t-body' style={{ marginBottom: 12 }}>
            See the escrow status and any released funds for this job on the
            Payments page.
          </p>
          <Link href='/payments' className='btn btn-secondary btn-sm'>
            View payments →
          </Link>
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <MintEditorialJobTimeline
          job={job}
          allBids={allBids ?? pendingBids}
          beforePhotos={beforePhotos ?? []}
          afterPhotos={afterPhotos ?? []}
          lifecycle={{
            contractStatus: lifecycle?.contractStatus,
            contractContractorSignedAt: lifecycle?.contractContractorSignedAt,
            contractHomeownerSignedAt: lifecycle?.contractHomeownerSignedAt,
            escrowStatus: lifecycle?.escrowStatus,
            completionConfirmed: !!lifecycle?.completionConfirmed,
          }}
        />
      ) : null}
    </div>
  );
}
