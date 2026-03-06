'use client';

import React from 'react';
import { Brain } from 'lucide-react';

export interface DiscoverFiltersProps {
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
  color = 'teal',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: 'teal' | 'purple';
}) {
  const activeClass =
    color === 'purple'
      ? 'bg-purple-600 text-white border-purple-600'
      : 'bg-teal-600 text-white border-teal-600';
  const hoverClass =
    color === 'purple'
      ? 'hover:border-purple-400 hover:text-purple-700'
      : 'hover:border-teal-400 hover:text-teal-700';

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
        active ? activeClass : `bg-white text-gray-600 border-gray-300 ${hoverClass}`
      }`}
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
    <div className="flex flex-wrap gap-2 pb-1 items-center">
      {/* Category chips (up to 4) */}
      {categories.slice(0, 4).map(cat => (
        <Chip
          key={cat}
          active={selectedCategory === cat}
          onClick={() => onCategoryChange(selectedCategory === cat ? null : cat)}
        >
          {cat}
        </Chip>
      ))}

      {/* Radius chips */}
      {hasLocation &&
        RADII.map(r => (
          <Chip key={r} active={selectedRadius === r} onClick={() => onRadiusChange(r)}>
            {r}km
          </Chip>
        ))}

      {/* Min budget chips */}
      {BUDGETS.map(b => (
        <Chip key={b.value} active={minBudget === b.value} onClick={() => onMinBudgetChange(b.value)}>
          {b.label}
        </Chip>
      ))}

      {/* AI Assessed toggle */}
      <button
        onClick={onAiAssessedToggle}
        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all ${
          aiAssessedOnly
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400 hover:text-purple-700'
        }`}
      >
        <Brain className="w-3 h-3" />
        AI Assessed
      </button>
    </div>
  );
}
