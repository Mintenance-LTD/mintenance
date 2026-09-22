'use client';

/** Completion approval actions and contractor summary. */

import React from 'react';
import Link from 'next/link';
import { OpenJobDispute } from './OpenJobDispute';
import { Shield, Star } from 'lucide-react';

interface ContractorShape {
  rating?: number;
  total_jobs_completed?: number;
}

interface Props {
  jobId: string;
  contractorName: string;
  contractor?: ContractorShape;
  submitting: boolean;
  onSubmit: () => void;
  onSaveDraft: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MintEditorialJobReviewRight({
  jobId,
  contractorName,
  contractor,
  submitting,
  onSubmit,
  onSaveDraft,
}: Props) {
  return (
    <div className='col' style={{ gap: 16 }}>
      <div className='card card-pad-lg'>
        <h2 className='t-h3' style={{ marginBottom: 4 }}>
          Approve completed work
        </h2>
        <p className='t-body' style={{ marginBottom: 18 }}>
          Approval records your acceptance of the completed work. Payment
          release remains subject to the cooling-off period and final checks.
        </p>

        <div
          style={{
            padding: 14,
            background: 'var(--me-bg-2)',
            borderRadius: 12,
            marginBottom: 18,
            fontSize: 13,
            color: 'var(--me-ink-2)',
            lineHeight: 1.5,
          }}
        >
          <div className='row' style={{ gap: 8, marginBottom: 6 }}>
            <Shield
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--me-brand)' }}
            />
            <b style={{ color: 'var(--me-ink)' }}>Mint guarantee active</b>
          </div>
          Spotted a problem? <OpenJobDispute jobId={jobId} />— funds stay held
          until it&apos;s sorted.
        </div>

        <button
          type='button'
          className='btn btn-primary'
          onClick={onSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px 0',
            fontSize: 15,
          }}
        >
          {submitting ? 'Submitting…' : 'Approve work & post review'}
        </button>
        <button
          type='button'
          className='btn btn-ghost'
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          onClick={onSaveDraft}
        >
          Save as draft
        </button>
      </div>

      <div className='card card-pad'>
        <div className='row' style={{ gap: 12 }}>
          <span
            className='avatar avatar-lg'
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
            }}
          >
            {getInitials(contractorName)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className='t-h4'>{contractorName}</h3>
            <div className='t-meta'>
              {contractor?.rating != null ? (
                <>
                  <span className='stars' style={{ fontSize: 12 }}>
                    <Star size={11} strokeWidth={1.75} fill='currentColor' />
                    <span className='v'>{contractor.rating.toFixed(1)}</span>
                  </span>
                  {' · '}
                </>
              ) : null}
              {contractor?.total_jobs_completed != null
                ? `${contractor.total_jobs_completed} jobs`
                : 'Local pro'}
            </div>
          </div>
          <Link href='/jobs/create' className='btn btn-secondary btn-sm'>
            Re-book
          </Link>
        </div>
      </div>
    </div>
  );
}
