'use client';

import React from 'react';
import { Brain } from 'lucide-react';

interface DiscoverFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (c: string | null) => void;
  selectedRadius: number;
  onRadiusChange: (r: number) => void;
  minBudget: number;
  onMinBudgetChange: (b: number) => void;
  aiAssessedOnly: boolean;
  onAiAssessedToggle: () => void;
  hasLocation: boolean;
}

const RADII = [5, 10, 20, 50];
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
        RADII.map((r) => (
          <Chip
            key={r}
            active={selectedRadius === r}
            onClick={() => onRadiusChange(r)}
          >
            {r}km
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
