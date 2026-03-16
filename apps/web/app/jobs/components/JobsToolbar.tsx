'use client';

import type { JSX } from 'react';
import React, { useState } from 'react';
import { Search, ArrowUpDown, LayoutGrid, List, Check, ChevronDown } from 'lucide-react';

export type SortOption = 'newest' | 'oldest' | 'budget-high' | 'budget-low' | 'most-views' | 'alphabetical';

interface JobsToolbarProps {
  totalCount: number;
  activeCount: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'budget-high', label: 'Budget: High to Low' },
  { value: 'budget-low', label: 'Budget: Low to High' },
  { value: 'most-views', label: 'Most Viewed' },
  { value: 'alphabetical', label: 'A-Z' },
];

export function JobsToolbar({
  totalCount,
  activeCount,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  selectionMode,
  onToggleSelectionMode,
  searchQuery = '',
  onSearchChange,
}: JobsToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const currentSort = sortOptions.find((opt) => opt.value === sortBy);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      {onSearchChange && (
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Toolbar Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Count + Selection */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{activeCount}</span> of {totalCount} jobs
          </span>

          {totalCount > 0 && (
            <button
              onClick={onToggleSelectionMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectionMode
                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {selectionMode ? 'Cancel' : 'Select Multiple'}
            </button>
          )}
        </div>

        {/* Right: Sort + View */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700 shadow-sm"
            >
              <ArrowUpDown size={14} className="text-gray-400" />
              <span className="hidden sm:inline">Sort:</span>
              <span>{currentSort?.label}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => { onSortChange(option.value); setShowSortMenu(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        sortBy === option.value ? 'text-teal-700 bg-teal-50/50 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && <Check size={15} className="text-teal-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
