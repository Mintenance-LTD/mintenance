'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BidCard, type Bid } from '../BidCard';
import {
  buildLifecyclePhases,
  computeNextStep,
  type JobLifecycleInputs,
} from './jobDetailHelpers';
import {
  BudgetCard,
  ContractorCard,
  DescriptionCard,
  JobInfoStrip,
  JobProgressCard,
  NextStepCard,
  formatPosted,
  getCategorySwatch,
  statusBadge,
  formatGBP,
  type ContractorShape,
  type JobShape,
  type PropertyShape,
} from './MintEditorialJobCards';

interface LifecycleData {
  contractStatus?: string | null;
  escrowStatus?: string | null;
  bidCount: number;
  pendingBidCount: number;
  completionConfirmed: boolean;
}

interface Props {
  job: JobShape;
  property?: PropertyShape | null;
  contractor?: ContractorShape | null;
  bids: Bid[];
  photos: string[];
  lifecycle: LifecycleData;
}

function JobHeader({
  job,
  property,
}: {
  job: JobShape;
  property?: PropertyShape | null;
}) {
  const cat = getCategorySwatch(job.category);
  const Icon = cat.Icon;
  return (
    <div className='row' style={{ gap: 18, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 14,
          background: `var(--me-cat-${cat.key}-bg)`,
          color: `var(--me-cat-${cat.key}-fg)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={36} strokeWidth={1.5} />
      </div>
      <div className='col' style={{ gap: 8, flex: 1, minWidth: 0 }}>
        <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
          {statusBadge(job.status)}
          <span className='badge badge-mute'>{job.category || 'General'}</span>
          <span className='t-meta'>{formatPosted(job.created_at)}</span>
        </div>
        <h1 className='t-h1' style={{ wordBreak: 'break-word' }}>
          {job.title}
        </h1>
        <p className='t-body'>
          {property?.address || job.location || 'Location not set'}
        </p>
      </div>
      <div
        className='col'
        style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}
      >
        <div className='t-meta'>Your budget</div>
        <div className='me-list-amount' style={{ fontSize: 28 }}>
          {job.budget > 0 ? formatGBP(job.budget) : '—'}
        </div>
      </div>
    </div>
  );
}

export function MintEditorialJobDetail({
  job,
  property,
  contractor,
  bids,
  photos,
  lifecycle,
}: Props) {
  const inputs: JobLifecycleInputs = {
    jobStatus: job.status,
    bidCount: lifecycle.bidCount,
    contractorAssigned: !!job.contractor_id,
    contractStatus: lifecycle.contractStatus,
    escrowStatus: lifecycle.escrowStatus,
    completionConfirmed: lifecycle.completionConfirmed,
  };
  const phases = buildLifecyclePhases(inputs);
  const nextStep = computeNextStep(inputs);

  // Render only pending bids — the ones the homeowner can act on.
  // History (rejected / withdrawn) is intentionally out of scope for
  // this first slice.
  const pendingBids = bids.filter((b) => b.status === 'pending');

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

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <JobHeader job={job} property={property} />
      </div>

      {/* Optional hero photo */}
      {photos.length > 0 ? (
        <div
          className='card'
          style={{ overflow: 'hidden', marginBottom: 18, padding: 0 }}
        >
          <img
            src={photos[0]}
            alt={job.title}
            style={{ width: '100%', height: 280, objectFit: 'cover' }}
          />
        </div>
      ) : null}

      {/* Two-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 18,
        }}
      >
        {/* Main column */}
        <div className='col' style={{ gap: 18 }}>
          <JobInfoStrip job={job} property={property} />
          <DescriptionCard description={job.description} />
          {contractor ? <ContractorCard contractor={contractor} /> : null}

          {pendingBids.length > 0 ? (
            <div id='bids' className='col' style={{ gap: 12 }}>
              <div className='between' style={{ marginBottom: 4 }}>
                <h2 className='t-h3'>Bids · {pendingBids.length}</h2>
                <span className='t-meta'>Approve one to start work</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 14,
                }}
              >
                {pendingBids.map((bid) => (
                  <BidCard key={bid.id} bid={bid} jobId={job.id} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right column — sticky progress + next-step + budget */}
        <aside
          className='col'
          style={{
            gap: 18,
            position: 'sticky',
            top: 84,
            alignSelf: 'start',
          }}
        >
          <JobProgressCard phases={phases} />
          <NextStepCard step={nextStep} />
          <BudgetCard budget={job.budget} />
        </aside>
      </div>
    </>
  );
}
