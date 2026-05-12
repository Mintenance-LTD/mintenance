'use client';

/**
 * Right column of the unified review surface — payment breakdown,
 * tip chips, Mint guarantee, release CTA, contractor card. Extracted
 * from MintEditorialJobReview to keep the parent under the 500-line
 * cap.
 */

import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

const TIP_PRESETS = [0, 5, 10, 15, 20];

interface ContractorShape {
  rating?: number;
  total_jobs_completed?: number;
}

interface Props {
  jobId: string;
  quoted: number;
  tip: number;
  setTip: (n: number) => void;
  total: number;
  contractorName: string;
  contractorFirstName: string;
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px dashed var(--me-line-2)',
      }}
    >
      <span style={{ color: 'var(--me-ink-2)' }}>{label}</span>
      <span style={{ color: 'var(--me-ink)' }}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: 14,
        borderTop: '1px solid var(--me-line)',
        marginTop: 6,
        fontWeight: 600,
        color: 'var(--me-ink)',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function MintEditorialJobReviewRight({
  jobId,
  quoted,
  tip,
  setTip,
  total,
  contractorName,
  contractorFirstName,
  contractor,
  submitting,
  onSubmit,
  onSaveDraft,
}: Props) {
  return (
    <div className='col' style={{ gap: 16 }}>
      <div className='card card-pad-lg'>
        <h2 className='t-h3' style={{ marginBottom: 4 }}>
          Release payment
        </h2>
        <p className='t-body' style={{ marginBottom: 18 }}>
          {formatMoney(total)} will move from escrow to {contractorFirstName}.
          They see it in their account by tomorrow morning.
        </p>

        <div style={{ fontSize: 13, marginBottom: 18 }}>
          <Row label='Quoted price' value={formatMoney(quoted)} />
          <Row label='Tip' value={tip > 0 ? formatMoney(tip) : '£0.00'} />
          <TotalRow label='Total to release' value={formatMoney(total)} />
        </div>

        <div className='t-meta' style={{ marginBottom: 8 }}>
          Add a tip
        </div>
        <div
          className='row'
          style={{ gap: 6, marginBottom: 18, flexWrap: 'wrap' }}
        >
          {TIP_PRESETS.map((t) => (
            <button
              key={t}
              type='button'
              className={'chip ' + (tip === t ? 'on' : '')}
              onClick={() => setTip(t)}
              style={{
                flex: 1,
                minWidth: 56,
                justifyContent: 'center',
                padding: '10px 0',
              }}
            >
              {t === 0 ? 'None' : `£${t}`}
            </button>
          ))}
        </div>

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
          Spotted a problem?{' '}
          <Link
            href={`/disputes/create?escrowId=${jobId}`}
            style={{ color: 'var(--me-brand)', fontWeight: 600 }}
          >
            Open a dispute instead
          </Link>{' '}
          — funds stay held until it&apos;s sorted.
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
          {submitting
            ? 'Releasing…'
            : `Release ${formatMoney(total)} & post review`}
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
              {contractor?.rating != null
                ? `${contractor.rating.toFixed(1)} ★ · `
                : ''}
              {contractor?.total_jobs_completed != null
                ? `${contractor.total_jobs_completed} jobs`
                : 'Verified pro'}
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
