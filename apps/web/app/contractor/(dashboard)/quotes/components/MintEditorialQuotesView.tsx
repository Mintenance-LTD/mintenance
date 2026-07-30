'use client';

/**
 * Mint Editorial port of `/contractor/quotes`.
 *
 * Canonical primitives used (mint-editorial.css):
 *   - `.t-h1` + `.t-body` for the page header
 *   - `.btn-primary` for the Create Quote CTA
 *   - `.kpi` tiles for Total / Pending / Acceptance / Revenue
 *   - `.chip` row for status filter
 *   - `.search-pill` for search
 *   - QuoteCard renders inside `.me-legacy-fit` already (the shell
 *     boundary), so its Tailwind colours map to mint palette
 *     automatically. We keep the card layout itself unchanged to
 *     avoid a 280-LOC component rewrite for what is essentially a
 *     colour swap.
 *
 * Single-file because the surface is small (header + stats + filter
 * + grid). Imported conditionally from `page.tsx` when the
 * `mintenance-theme=mint-editorial` cookie is set.
 */

import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, FileText } from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';
import { QuoteCard } from './QuoteCard';
import type { FilterTab, Quote } from './useQuotesData';

interface Stats {
  total: number;
  pending: number;
  pendingAmount: number;
  acceptanceRate: number;
  acceptedAmount: number;
}

interface MintEditorialQuotesViewProps {
  loading: boolean;
  stats: Stats;
  filteredQuotes: Quote[];
  filterTabs: { value: FilterTab; label: string; count: number }[];
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showActionMenu: string | null;
  setShowActionMenu: (id: string | null) => void;
}

export function MintEditorialQuotesView({
  loading,
  stats,
  filteredQuotes,
  filterTabs,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  showActionMenu,
  setShowActionMenu,
}: MintEditorialQuotesViewProps) {
  const router = useRouter();

  return (
    <div className='col' style={{ gap: 20 }}>
      {/* Header */}
      <div className='between'>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Quotes</h1>
          <p className='t-body'>
            Send proposals, track responses, and convert leads into booked jobs.
          </p>
        </div>
        <button
          type='button'
          className='btn btn-primary btn-sm'
          onClick={() => router.push('/contractor/quotes/create')}
        >
          <Plus size={14} strokeWidth={1.75} />
          Create quote
        </button>
      </div>

      {/* KPI tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <div className='kpi'>
          <div className='label'>Total quotes</div>
          <div className='num'>{stats.total}</div>
          <div className='sub'>All time</div>
        </div>
        <div className='kpi'>
          <div className='label'>Pending value</div>
          <div className='num'>
            £{stats.pendingAmount.toLocaleString('en-GB')}
          </div>
          <div className='sub'>
            {stats.pending} {stats.pending === 1 ? 'quote' : 'quotes'} awaiting
            response
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Acceptance rate</div>
          <div className='num'>{stats.acceptanceRate.toFixed(0)}%</div>
          <div className='sub'>Across all sent quotes</div>
        </div>
        <div className='kpi'>
          <div className='label'>Accepted revenue</div>
          <div className='num'>
            £{stats.acceptedAmount.toLocaleString('en-GB')}
          </div>
          <div className='sub'>Pipeline secured</div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='card' style={{ padding: 14 }}>
        <div className='col' style={{ gap: 12 }}>
          <div
            className='row'
            style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
          >
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type='button'
                className={`chip ${activeFilter === tab.value ? 'on' : ''}`}
                onClick={() => onFilterChange(tab.value)}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      activeFilter === tab.value
                        ? 'var(--me-on-brand)'
                        : 'var(--me-ink-3)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div
            className='row'
            style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <div
              className='search-pill'
              style={{ flex: 1, minWidth: 260, padding: '8px 12px' }}
            >
              <Search size={14} strokeWidth={1.75} />
              <input
                type='search'
                placeholder='Search quotes by title, customer, or email'
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
            </div>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              aria-label='Filter quotes'
              title='Filter (coming soon)'
              disabled
            >
              <Filter size={14} strokeWidth={1.75} /> Filter
            </button>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              aria-label='Export quotes'
              title='Export (coming soon)'
              disabled
            >
              <Download size={14} strokeWidth={1.75} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div
          className='card'
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--me-ink-3)',
            fontSize: 13,
          }}
        >
          Loading quotes…
        </div>
      ) : filteredQuotes.length === 0 ? (
        <MintEditorialEmptyState
          icon={FileText}
          title='No quotes found'
          body={
            searchQuery || activeFilter !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Create your first quote to get started and turn a job into booked work.'
          }
          cta={
            !searchQuery && activeFilter === 'all'
              ? {
                  label: 'Create your first quote',
                  href: '/contractor/quotes/create',
                }
              : undefined
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {filteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              showActionMenu={showActionMenu}
              onToggleMenu={setShowActionMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
