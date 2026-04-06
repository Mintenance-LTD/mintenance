'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Stat Card Component - Calendar style
export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-6 h-6 text-teal-600" />
      <p className="text-gray-600 text-sm font-medium">{title}</p>
    </div>
    <div className="flex items-end justify-between">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {trend && trendLabel && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {trendLabel}
        </div>
      )}
    </div>
  </div>
);
