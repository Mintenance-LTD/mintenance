'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

export interface QueueItem {
  id: string;
  file: File;
  progress: 0 | 100;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadQueueProps {
  queue: QueueItem[];
  onRemove: (id: string) => void;
}

function bytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extOf(name: string): string {
  const ix = name.lastIndexOf('.');
  if (ix < 0) return 'DOC';
  return name.slice(ix + 1).toUpperCase();
}

/**
 * Upload queue card matching the redesign-v2 spec — per-file paper
 * tile + name + status + progress bar.
 */
export function UploadQueue({ queue, onRemove }: UploadQueueProps) {
  if (queue.length === 0) return null;
  return (
    <div className='card' style={{ padding: 22 }}>
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
        Upload queue · {queue.length} {queue.length === 1 ? 'file' : 'files'}
      </h4>
      {queue.map((q, i) => (
        <div
          key={q.id}
          style={{
            padding: '14px 0',
            borderTop: i > 0 ? '1px solid var(--me-line-2)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 50,
                borderRadius: 6,
                background: 'var(--me-doc-contract-bg)',
                color: 'var(--me-doc-contract-fg)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.4,
              }}
            >
              {extOf(q.file.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {q.file.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color:
                    q.status === 'error'
                      ? 'var(--me-err-fg)'
                      : 'var(--me-ink-3)',
                  marginTop: 2,
                }}
              >
                {bytesLabel(q.file.size)} ·{' '}
                {q.status === 'done'
                  ? 'Uploaded'
                  : q.status === 'uploading'
                    ? 'Uploading…'
                    : q.status === 'error'
                      ? q.error || 'Failed'
                      : 'Queued'}
              </div>
            </div>
            {q.status === 'done' ? (
              <Check
                size={18}
                strokeWidth={1.75}
                style={{ color: 'var(--me-brand)' }}
              />
            ) : (
              <button
                type='button'
                onClick={() => onRemove(q.id)}
                disabled={q.status === 'uploading'}
                aria-label={`Remove ${q.file.name}`}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: 'var(--me-ink-3)',
                  cursor: q.status === 'uploading' ? 'not-allowed' : 'pointer',
                }}
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 9999,
              background: 'var(--me-bg-2)',
              marginTop: 10,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width:
                  q.status === 'done'
                    ? '100%'
                    : q.status === 'uploading'
                      ? '64%'
                      : '0%',
                background:
                  q.status === 'error' ? 'var(--me-err-fg)' : 'var(--me-brand)',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
