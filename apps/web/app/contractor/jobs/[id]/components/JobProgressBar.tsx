'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { theme } from '@/lib/theme';

interface JobProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

/**
 * JobProgressBar - Percentage-based progress bar component
 * Displays progress in format: current/total (e.g., 65/66)
 */
export function JobProgressBar({ current, total, label = 'Progress' }: JobProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <StandardCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {current} of {total} completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
            <div className="text-xs text-gray-500">
              {current}/{total}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </StandardCard>
  );
}

