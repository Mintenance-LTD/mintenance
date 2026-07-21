'use client';

import React from 'react';
import { Brain } from 'lucide-react';

interface DiscoverFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  /** Selected radius in MILES (the platform queries in km — see RADII_MILES). */
  selectedRadius: number;
  onRadiusChange: (r: number) => void;
  minBudget: number;
  onMinBudgetChange: (b: number) => void;
  aiAssessedOnly: boolean;
  onAiAssessedToggle: () => void;
  hasLocation: boolean;
}

/**
 * Radius chips in MILES (2026-07-20). These were 5/10/20/50 *km* while
 * Service Areas and live travel tracking both spoke miles — the same distance
 * wearing two units depending on the screen. Storage and the API stay in km;
 * only the display and these chip values are miles.
 *
 * Capped at 30 mi (~48 km) deliberately: the page resolves its candidate set
 * server-side at MAX_DISCOVER_CHIP_RADIUS_KM = 50, so a wider chip would
 * silently return nothing beyond that horizon.
 */
const RADII_MILES = [3, 5, 10, 20, 30];
const BUDGETS = [
  { value: 0, label: 'Any budget' },
  { value: 500, label: '£500+' },
  { value: 1000, label: '£1k+' },
  { value: 5000, label: '£5k+' },
];

function Chip({
  active,
  onClick,
  children,
  color = 'brand',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: 'brand' | 'ai';
}) {
  const activeStyle =
    color === 'ai'
      ? {
          background: 'var(--me-info-fg)',
          color: 'var(--me-on-brand)',
          borderColor: 'var(--me-info-fg)',
        }
      : {
          background: 'var(--me-brand)',
          color: 'var(--me-on-brand)',
          borderColor: 'var(--me-brand)',
        };
  const inactiveStyle = {
    background: 'var(--me-surface)',
    color: 'var(--me-ink-2)',
    borderColor: 'var(--me-line)',
  };

  return (
    <button
      onClick={onClick}
      className='px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap'
      style={{
        fontFamily: 'var(--me-font-body)',
        ...(active ? activeStyle : inactiveStyle),
      }}
    >
      {children}
    </button>
  );
}

export function DiscoverFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedRadius,
  onRadiusChange,
  minBudget,
  onMinBudgetChange,
  aiAssessedOnly,
  onAiAssessedToggle,
  hasLocation,
}: DiscoverFiltersProps) {
  return (
    <div
      data-theme='mint-editorial'
      className='flex flex-wrap gap-2 pb-1 items-center'
    >
      {/* Category chips (up to 4) */}
      {categories.slice(0, 4).map((cat) => (
        <Chip
          key={cat}
          active={selectedCategory === cat}
          onClick={() =>
            onCategoryChange(selectedCategory === cat ? null : cat)
          }
        >
          {cat}
        </Chip>
      ))}

      {/* Radius chips */}
      {hasLocation &&
        RADII_MILES.map((r) => (
          <Chip
            key={r}
            active={selectedRadius === r}
            onClick={() => onRadiusChange(r)}
          >
            {r} mi
          </Chip>
        ))}

      {/* Min budget chips */}
      {BUDGETS.map((b) => (
        <Chip
          key={b.value}
          active={minBudget === b.value}
          onClick={() => onMinBudgetChange(b.value)}
        >
          {b.label}
        </Chip>
      ))}

      {/* AI Assessed toggle */}
      <button
        onClick={onAiAssessedToggle}
        className='flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all'
        style={{
          fontFamily: 'var(--me-font-body)',
          ...(aiAssessedOnly
            ? {
                background: 'var(--me-info-fg)',
                color: 'var(--me-on-brand)',
                borderColor: 'var(--me-info-fg)',
              }
            : {
                background: 'var(--me-surface)',
                color: 'var(--me-ink-2)',
                borderColor: 'var(--me-line)',
              }),
        }}
      >
        <Brain className='w-3 h-3' />
        AI Assessed
      </button>
    </div>
  );
}
