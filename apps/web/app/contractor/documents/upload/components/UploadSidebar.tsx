'use client';

import React from 'react';
import { FileText, X } from 'lucide-react';

// Spec-locked category chips (redesign-v2/documents-web.html).
export const UPLOAD_CATEGORIES: Array<{
  value: string;
  label: string;
  bg: string;
  fg: string;
}> = [
  {
    value: 'contracts',
    label: 'Contract',
    bg: 'var(--me-doc-contract-bg)',
    fg: 'var(--me-doc-contract-fg)',
  },
  {
    value: 'photos',
    label: 'Photo',
    bg: 'var(--me-doc-payment-bg)',
    fg: 'var(--me-doc-payment-fg)',
  },
  {
    value: 'certifications',
    label: 'Cert',
    bg: 'var(--me-doc-cert-bg)',
    fg: 'var(--me-doc-cert-fg)',
  },
  {
    value: 'insurance',
    label: 'Insurance',
    bg: 'var(--me-doc-payment-bg)',
    fg: 'var(--me-doc-payment-fg)',
  },
  {
    value: 'receipts',
    label: 'Receipt',
    bg: 'var(--me-doc-receipt-bg)',
    fg: 'var(--me-doc-receipt-fg)',
  },
  {
    value: 'templates',
    label: 'Template',
    bg: 'var(--me-doc-bid-bg)',
    fg: 'var(--me-doc-bid-fg)',
  },
];

interface UploadSidebarProps {
  category: string;
  onCategoryChange: (value: string) => void;
  linkedJobId: string | null;
  linkedJobName: string | null;
  onClearLinkedJob: () => void;
  totalToUpload: number;
  uploading: boolean;
  onUpload: () => void;
  onCancel: () => void;
}

export function UploadSidebar({
  category,
  onCategoryChange,
  linkedJobId,
  linkedJobName,
  onClearLinkedJob,
  totalToUpload,
  uploading,
  onUpload,
  onCancel,
}: UploadSidebarProps) {
  return (
    <div>
      <SidebarCard title='Category'>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {UPLOAD_CATEGORIES.map((c) => {
            const on = category === c.value;
            return (
              <button
                key={c.value}
                type='button'
                onClick={() => onCategoryChange(c.value)}
                aria-pressed={on}
                style={{
                  padding: '8px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: on ? c.bg : 'var(--me-surface)',
                  color: on ? c.fg : 'var(--me-ink-2)',
                  border: `1px solid ${on ? c.fg : 'var(--me-line)'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </SidebarCard>

      {linkedJobId ? (
        <SidebarCard title='Link to job · optional'>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--me-bg-2)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <FileText
              size={14}
              strokeWidth={1.75}
              style={{ color: 'var(--me-ink-3)' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {linkedJobName ?? 'Linked job'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--me-ink-3)' }}>
                Job #{linkedJobId.slice(0, 8)}
              </div>
            </div>
            <button
              type='button'
              onClick={onClearLinkedJob}
              aria-label='Remove linked job'
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--me-ink-3)',
                cursor: 'pointer',
              }}
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        </SidebarCard>
      ) : null}

      <SidebarCard title='Visibility'>
        <p
          style={{
            fontSize: 13,
            color: 'var(--me-ink-2)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          <b style={{ color: 'var(--me-ink)' }}>Customer can see · </b>only when
          linked to a job they&rsquo;re on. Otherwise visible to you only.
        </p>
      </SidebarCard>

      <button
        type='button'
        onClick={onUpload}
        disabled={uploading || totalToUpload === 0}
        className='btn btn-primary'
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          opacity: totalToUpload === 0 || uploading ? 0.5 : 1,
          cursor: totalToUpload === 0 || uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading
          ? 'Uploading…'
          : totalToUpload === 0
            ? 'Add files to upload'
            : `Upload ${totalToUpload} file${totalToUpload === 1 ? '' : 's'} →`}
      </button>
      <button
        type='button'
        onClick={onCancel}
        className='btn btn-ghost'
        style={{
          width: '100%',
          padding: '10px 0',
          fontSize: 12,
          color: 'var(--me-ink-3)',
          marginTop: 8,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='card' style={{ padding: 22, marginBottom: 14 }}>
      <h4
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--me-ink-3)',
          fontWeight: 700,
          margin: '0 0 14px',
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
