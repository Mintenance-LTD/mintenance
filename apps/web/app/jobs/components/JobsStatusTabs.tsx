'use client';

import React from 'react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'draft';

interface JobsStatusTabsProps {
  activeTab: FilterStatus;
  onTabChange: (tab: FilterStatus) => void;
  jobCounts: {
    all: number;
    posted: number;
    active: number;
    completed: number;
    draft: number;
  };
  prefersReducedMotion?: boolean;
}

export function JobsStatusTabs({
  activeTab,
  onTabChange,
  jobCounts,
  prefersReducedMotion = false
}: JobsStatusTabsProps) {
  const tabs = [
    { value: 'all' as FilterStatus, label: 'All Jobs', count: jobCounts.all },
    { value: 'posted' as FilterStatus, label: 'Posted', count: jobCounts.posted },
    { value: 'in_progress' as FilterStatus, label: 'Active', count: jobCounts.active },
    { value: 'completed' as FilterStatus, label: 'Completed', count: jobCounts.completed },
    { value: 'draft' as FilterStatus, label: 'Drafts', count: jobCounts.draft },
  ];

  return (
    <MotionDiv
      className="flex items-center justify-between gap-4 flex-wrap"
      variants={prefersReducedMotion ? {} : fadeIn}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? false : "animate"}
    >
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2">
        {tabs.map((tab) => (
          <MotionButton
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === tab.value
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            aria-label={`Filter by ${tab.label}`}
            aria-pressed={activeTab === tab.value}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            )}
          </MotionButton>
        ))}
      </div>
    </MotionDiv>
  );
}
