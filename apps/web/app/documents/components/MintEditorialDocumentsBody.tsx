'use client';

/**
 * Mint Editorial body for /documents — canonical `.chip` filter row,
 * `.search` style input, `.card` list container, primitive empty
 * state, primitive skeleton loader.
 *
 * Imported by /documents/page.tsx behind a theme branch so the legacy
 * indigo-Tailwind layout stays untouched for default-theme users.
 */

import React from 'react';
import {
  Search,
  ArrowUpDown,
  XCircle,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { type DocumentItem } from './DocumentRow';
import { DocumentCard } from './DocumentCard';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import { MintEditorialListSkeleton } from '@/components/mint-editorial/MintEditorialSkeleton';

type TabKey = 'all' | 'contracts' | 'bids' | 'payments';
type SortKey = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

interface Tab {
  key: TabKey;
  label: string;
  count: number;
}

interface SortOption {
  value: SortKey;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTab: TabKey;
  onTabChange: (k: TabKey) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortKey;
  onSortChange: (k: SortKey) => void;
  sortOptions: SortOption[];
  showSortMenu: boolean;
  onToggleSortMenu: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  filteredDocs: DocumentItem[];
  totalCount: number;
  onRetry: () => void;
}

export function MintEditorialDocumentsBody({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  sortOptions,
  showSortMenu,
  onToggleSortMenu,
  loading,
  error,
  filteredDocs,
  totalCount,
  onRetry,
}: Props) {
  return (
    <div style={{ overflow: 'visible' }}>
      {/* Search + tabs + sort — all sit above the card grid now,
          matching the mockup. */}
      <div
        className='row'
        style={{
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div
          className='search-pill'
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
          }}
        >
          <Search size={14} strokeWidth={1.75} />
          <input
            type='text'
            placeholder='Search by name, contractor, or job…'
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
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--me-ink-3)',
                padding: 0,
                display: 'inline-flex',
              }}
              aria-label='Clear search'
            >
              <XCircle size={14} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={() => onToggleSortMenu(!showSortMenu)}
            aria-haspopup='listbox'
            aria-expanded={showSortMenu}
          >
            <ArrowUpDown size={13} strokeWidth={1.75} />
            <span style={{ marginLeft: 6 }}>
              {sortOptions.find((o) => o.value === sortBy)?.label || 'Sort'}
            </span>
          </button>
          {showSortMenu ? (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10,
                }}
                onClick={() => onToggleSortMenu(false)}
              />
              <div
                role='listbox'
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  width: 200,
                  background: 'var(--me-surface)',
                  border: '1px solid var(--me-line)',
                  borderRadius: 10,
                  boxShadow: 'var(--me-shadow-pop)',
                  zIndex: 20,
                  padding: 4,
                }}
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => {
                      onSortChange(opt.value);
                      onToggleSortMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontSize: 13,
                      borderRadius: 8,
                      background:
                        sortBy === opt.value
                          ? 'var(--me-brand-soft)'
                          : 'transparent',
                      color:
                        sortBy === opt.value
                          ? 'var(--me-brand)'
                          : 'var(--me-ink)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: sortBy === opt.value ? 600 : 400,
                      fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Tab chips row — sits between search and grid. Canonical
          `.chip / .chip.on` keeps the visual language consistent with
          the rest of Mint Editorial. */}
      <div
        className='row'
        style={{
          gap: 8,
          marginBottom: 14,
          flexWrap: 'wrap',
          paddingBottom: 8,
          borderBottom: '1px solid var(--me-line)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type='button'
            className={'chip ' + (activeTab === tab.key ? 'on' : '')}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
            {tab.count > 0 ? <> · {tab.count}</> : null}
          </button>
        ))}
      </div>

      {/* Grid header — count + drag hint, matches the mockup
          "8 documents · Click any card to open the full record". */}
      {!loading && !error && filteredDocs.length > 0 ? (
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
              className='t-h2'
              style={{
                fontFamily: 'var(--me-font-display, "Inter", sans-serif)',
                fontSize: 24,
                color: 'var(--me-ink)',
              }}
            >
              {filteredDocs.length}
            </span>
            <span
              className='t-h2'
              style={{
                fontFamily: 'var(--me-font-display, "Inter", sans-serif)',
                fontSize: 24,
                color: 'var(--me-ink)',
              }}
            >
              {filteredDocs.length === 1 ? 'document' : 'documents'}
            </span>
            <span className='t-meta' style={{ color: 'var(--me-ink-3)' }}>
              · Click any card to open the full record
            </span>
          </div>
        </div>
      ) : null}

      {/* Body — 2-column card grid */}
      {loading ? (
        <MintEditorialListSkeleton rowCount={5} />
      ) : error ? (
        <div
          className='col'
          style={{
            padding: 32,
            alignItems: 'center',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <AlertCircle
            size={28}
            strokeWidth={1.75}
            style={{ color: 'var(--me-err-fg)' }}
          />
          <p className='t-body' style={{ color: 'var(--me-err-fg)' }}>
            {error}
          </p>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : filteredDocs.length === 0 ? (
        <MintEditorialEmptyState
          icon={FolderOpen}
          title={searchQuery ? 'No results found' : 'No documents yet'}
          body={
            searchQuery
              ? 'Try adjusting your search or filters.'
              : 'Documents will appear here as you create jobs and receive bids.'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 14,
          }}
        >
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {/* Sub-tally — surfaces the "X of Y" only when filtering. */}
      {!loading &&
      filteredDocs.length > 0 &&
      filteredDocs.length < totalCount ? (
        <p
          className='t-meta'
          style={{ marginTop: 14, color: 'var(--me-ink-3)' }}
        >
          Showing {filteredDocs.length} of {totalCount} documents
        </p>
      ) : null}
    </div>
  );
}
