'use client';

/**
 * ContractorLibraryView — Mint Editorial body for the contractor
 * /contractor/documents library. Matches the mockup the user shared
 * 2026-05-21:
 *
 *   - Search input + category chip row (All / Contracts / Photos /
 *     Certs / Insurance / Receipts / Templates)
 *   - "Upload" primary CTA
 *   - "X files · Drag & drop anywhere to upload" header + bulk download
 *     link (placeholder for now — out of scope this slice)
 *   - 2-column document card grid with category-coloured left border,
 *     soft tinted file icon (PDF / JPG / DOC), title, category chip,
 *     date · size, star toggle.
 *
 * Pure presentational; data + handlers come from the parent.
 */

import React from 'react';
import { Search, XCircle, Star, Upload } from 'lucide-react';
import type { Document, CategoryWithCount } from './types';

interface ContractorLibraryViewProps {
  documents: Document[];
  filteredDocuments: Document[];
  categories: CategoryWithCount[];
  selectedCategory: string;
  searchQuery: string;
  onSelectCategory: (value: string) => void;
  onSearchChange: (q: string) => void;
  onUploadClick: () => void;
  onToggleStar: (doc: Document) => void;
  onView: (doc: Document) => void;
}

// ── Category styling ───────────────────────────────────────────────

interface CategoryStyle {
  borderColor: string;
  iconBg: string;
  iconText: string;
}

function styleForCategory(value: string): CategoryStyle {
  switch (value) {
    case 'contracts':
      return {
        borderColor: 'var(--me-violet)',
        iconBg: 'rgba(124, 92, 227, 0.10)',
        iconText: 'var(--me-violet)',
      };
    case 'photos':
      return {
        borderColor: 'var(--me-brand)',
        iconBg: 'var(--me-brand-soft)',
        iconText: 'var(--me-brand)',
      };
    case 'certifications':
      return {
        borderColor: 'var(--me-brand)',
        iconBg: 'var(--me-brand-soft)',
        iconText: 'var(--me-brand)',
      };
    case 'insurance':
      return {
        borderColor: 'var(--me-ink-3)',
        iconBg: 'var(--me-bg-2)',
        iconText: 'var(--me-ink-2)',
      };
    case 'receipts':
      return {
        borderColor: 'var(--me-accent)',
        iconBg: 'rgba(200, 149, 22, 0.10)',
        iconText: 'var(--me-accent)',
      };
    case 'templates':
      return {
        borderColor: 'var(--me-rose)',
        iconBg: 'rgba(214, 100, 141, 0.10)',
        iconText: 'var(--me-rose)',
      };
    default:
      return {
        borderColor: 'var(--me-line)',
        iconBg: 'var(--me-bg-2)',
        iconText: 'var(--me-ink-2)',
      };
  }
}

function fileLabel(fileType: string | null | undefined): string {
  if (!fileType) return 'DOC';
  const lower = fileType.toLowerCase();
  if (lower.includes('pdf')) return 'PDF';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'JPG';
  if (lower.includes('png')) return 'PNG';
  if (lower.includes('doc')) return 'DOC';
  if (lower.includes('zip')) return 'ZIP';
  return 'DOC';
}

function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const day = 86_400_000;
  const days = Math.floor((now.getTime() - date.getTime()) / day);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ── Component ──────────────────────────────────────────────────────

export function ContractorLibraryView({
  documents,
  filteredDocuments,
  categories,
  selectedCategory,
  searchQuery,
  onSelectCategory,
  onSearchChange,
  onUploadClick,
  onToggleStar,
  onView,
}: ContractorLibraryViewProps) {
  return (
    <div style={{ overflow: 'visible' }}>
      {/* Search + tab chips */}
      <div
        className='row'
        style={{
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          className='search-pill'
          style={{
            flex: '1 1 280px',
            minWidth: 220,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={14} strokeWidth={1.75} />
          <input
            type='text'
            placeholder='Search filename, category, linked job…'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--me-ink)',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery ? (
            <button
              type='button'
              onClick={() => onSearchChange('')}
              aria-label='Clear search'
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--me-ink-3)',
                padding: 0,
                display: 'inline-flex',
              }}
            >
              <XCircle size={14} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        {categories.map((cat) => (
          <button
            key={cat.value}
            type='button'
            className={'chip ' + (selectedCategory === cat.value ? 'on' : '')}
            onClick={() => onSelectCategory(cat.value)}
          >
            {cat.label}
            {cat.count > 0 ? <> · {cat.count}</> : null}
          </button>
        ))}
      </div>

      {/* Upload primary CTA */}
      <div style={{ marginBottom: 16 }}>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={onUploadClick}
        >
          <Upload size={14} strokeWidth={1.75} /> Upload
        </button>
      </div>

      {/* Count + drag hint */}
      <div
        className='between'
        style={{ alignItems: 'baseline', marginBottom: 12 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily:
                'var(--me-font-display, "Instrument Serif", Georgia, serif)',
              fontSize: 24,
              color: 'var(--me-ink)',
            }}
          >
            {filteredDocuments.length}{' '}
            {filteredDocuments.length === 1 ? 'file' : 'files'}
          </span>
          <span className='t-meta' style={{ color: 'var(--me-ink-3)' }}>
            · Drag &amp; drop anywhere to upload
          </span>
        </div>
      </div>

      {/* Card grid */}
      {filteredDocuments.length === 0 ? (
        <div
          className='card'
          style={{ padding: '56px 24px', textAlign: 'center' }}
        >
          <p
            className='t-h4'
            style={{
              color: 'var(--me-ink)',
              margin: 0,
              marginBottom: 4,
            }}
          >
            {searchQuery || selectedCategory !== 'all'
              ? 'No results match this view'
              : 'No documents yet'}
          </p>
          <p className='t-body' style={{ color: 'var(--me-ink-3)', margin: 0 }}>
            {searchQuery || selectedCategory !== 'all'
              ? 'Try a different filter or clear the search.'
              : 'Tap Upload to start building your certified library.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 14,
          }}
        >
          {filteredDocuments.map((doc) => {
            const s = styleForCategory(doc.category);
            const cat = categories.find((c) => c.value === doc.category);
            const label = fileLabel(doc.file_type);
            return (
              <article
                key={doc.id}
                role='button'
                tabIndex={0}
                onClick={() => onView(doc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onView(doc);
                  }
                }}
                style={{
                  position: 'relative',
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card, 14px)',
                  border: '1px solid var(--me-line-2)',
                  borderLeft: `4px solid ${s.borderColor}`,
                  padding: 16,
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr auto',
                  gap: 14,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: s.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.iconText,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.6,
                  }}
                >
                  {label}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    className='t-h4'
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--me-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.name}
                  </h3>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    {cat ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 9999,
                          background: s.iconBg,
                          color: s.iconText,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {cat.label}
                      </span>
                    ) : null}
                    <span
                      className='t-meta'
                      style={{
                        fontSize: 12,
                        color: 'var(--me-ink-3)',
                      }}
                    >
                      {relativeDate(doc.created_at)} ·{' '}
                      {formatKB(doc.size_bytes)}
                    </span>
                  </div>
                </div>
                <button
                  type='button'
                  aria-label={doc.starred ? 'Unstar document' : 'Star document'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStar(doc);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 4,
                    cursor: 'pointer',
                    color: doc.starred ? 'var(--me-accent)' : 'var(--me-ink-3)',
                  }}
                >
                  <Star
                    size={16}
                    strokeWidth={1.75}
                    fill={doc.starred ? 'currentColor' : 'none'}
                  />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
