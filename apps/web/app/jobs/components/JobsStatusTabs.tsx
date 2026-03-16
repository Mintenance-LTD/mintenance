'use client';

import React from 'react';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'draft' | 'awaiting_action';

interface JobsStatusTabsProps {
  activeTab: FilterStatus;
  onTabChange: (tab: FilterStatus) => void;
  jobCounts: {
    all: number;
    posted: number;
    active: number;
    completed: number;
    draft: number;
    awaitingAction: number;
  };
  prefersReducedMotion?: boolean;
}

export function JobsStatusTabs({
  activeTab,
  onTabChange,
  jobCounts,
}: JobsStatusTabsProps) {
  const tabs = [
    { value: 'all' as FilterStatus, label: 'All Jobs', count: jobCounts.all, highlight: false },
    { value: 'awaiting_action' as FilterStatus, label: 'Needs Attention', count: jobCounts.awaitingAction, highlight: true },
    { value: 'posted' as FilterStatus, label: 'Posted', count: jobCounts.posted, highlight: false },
    { value: 'in_progress' as FilterStatus, label: 'Active', count: jobCounts.active, highlight: false },
    { value: 'completed' as FilterStatus, label: 'Completed', count: jobCounts.completed, highlight: false },
    { value: 'draft' as FilterStatus, label: 'Drafts', count: jobCounts.draft, highlight: false },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? tab.highlight
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'bg-gray-900 text-white shadow-sm'
                : tab.highlight && tab.count > 0
                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={`Filter by ${tab.label}`}
            aria-pressed={isActive}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs font-semibold ${
                isActive
                  ? 'text-white/70'
                  : tab.highlight
                    ? 'text-amber-500'
                    : 'text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
