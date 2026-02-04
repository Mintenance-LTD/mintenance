'use client';

import React, { useState } from 'react';

export type PropertySortOption =
  | 'newest'
  | 'oldest'
  | 'spent-high'
  | 'spent-low'
  | 'name-az'
  | 'name-za'
  | 'active-jobs';

export type PropertyTypeFilter = 'all' | 'residential' | 'commercial' | 'rental';

interface PropertiesToolbarProps {
  totalCount: number;
  displayedCount: number;
  sortBy: PropertySortOption;
  onSortChange: (sort: PropertySortOption) => void;
  propertyTypeFilter: PropertyTypeFilter;
  onPropertyTypeFilterChange: (type: PropertyTypeFilter) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
}

export function PropertiesToolbar({
  totalCount,
  displayedCount,
  sortBy,
  onSortChange,
  propertyTypeFilter,
  onPropertyTypeFilterChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
}: PropertiesToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const sortOptions: { value: PropertySortOption; label: string; icon: React.ReactElement }[] = [
    {
      value: 'newest',
      label: 'Newest First',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      value: 'oldest',
      label: 'Oldest First',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      value: 'spent-high',
      label: 'Spending: High to Low',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      value: 'spent-low',
      label: 'Spending: Low to High',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
    },
    {
      value: 'name-az',
      label: 'Name: A-Z',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v2a3 3 0 003 3h12a3 3 0 003-3V7m-9 4v10m-4-4l4 4 4-4" />
        </svg>
      ),
    },
    {
      value: 'name-za',
      label: 'Name: Z-A',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17v-2a3 3 0 013-3h12a3 3 0 013 3v2m-9-4V3m-4 4l4-4 4 4" />
        </svg>
      ),
    },
    {
      value: 'active-jobs',
      label: 'Active Jobs',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  const typeOptions: { value: PropertyTypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'rental', label: 'Rental' },
  ];

  const currentSort = sortOptions.find((opt) => opt.value === sortBy);
  const currentType = typeOptions.find((opt) => opt.value === propertyTypeFilter);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Count and Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-semibold text-gray-900">{displayedCount}</span>
            <span className="text-gray-600">
              {' '}
              {displayedCount !== totalCount && `of ${totalCount} `}
              {displayedCount === 1 ? 'property' : 'properties'}
            </span>
          </div>

          {/* Property Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">{currentType?.label}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showTypeMenu ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Type Menu Dropdown */}
            {showTypeMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTypeMenu(false)} />
                <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onPropertyTypeFilterChange(option.value);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                        propertyTypeFilter === option.value
                          ? 'bg-teal-50 text-teal-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {propertyTypeFilter === option.value && (
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Favorites Filter Toggle */}
          <button
            onClick={onToggleFavoritesOnly}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              showFavoritesOnly
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <svg
              className={`w-4 h-4 ${showFavoritesOnly ? 'fill-red-500' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="hidden sm:inline">Favorites</span>
          </button>
        </div>

        {/* Right: Sort Controls */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              {currentSort?.icon}
              <span className="hidden sm:inline">Sort:</span>
              <span>{currentSort?.label}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sort Menu Dropdown */}
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                        sortBy === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div className={sortBy === option.value ? 'text-teal-600' : 'text-gray-400'}>
                        {option.icon}
                      </div>
                      <span className="flex-1 text-left">{option.label}</span>
                      {sortBy === option.value && (
                        <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
