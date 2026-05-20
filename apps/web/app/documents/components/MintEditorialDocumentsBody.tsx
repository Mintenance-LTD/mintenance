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
import { DocumentRow, type DocumentItem } from './DocumentRow';
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
    <div className='card' style={{ overflow: 'visible' }}>
      {/* Tab row — canonical `.chip / .chip.on` */}
      <div
        className='row'
        style={{
          gap: 6,
          padding: '12px 16px',
          borderBottom: '1px solid var(--me-line-2)',
          flexWrap: 'wrap',
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

      {/* Search + sort */}
      <div
        className='row'
        style={{
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--me-line-2)',
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

      {/* List body */}
      {loading ? (
        <div style={{ padding: 16 }}>
          <MintEditorialListSkeleton rowCount={5} />
        </div>
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
        <div>
          {filteredDocs.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filteredDocs.length > 0 ? (
        <div
          className='t-meta'
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--me-line-2)',
            background: 'var(--me-bg-2)',
          }}
        >
          Showing {filteredDocs.length} of {totalCount} documents
        </div>
      ) : null}
    </div>
  );
}
