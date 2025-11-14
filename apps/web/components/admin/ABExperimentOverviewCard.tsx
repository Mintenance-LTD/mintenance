'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ExperimentHealth {
  experimentId: string;
  automationRate: number;
  escalationRate: number;
  sfnRate: number;
  averageDecisionTimeMs: number;
  calibrationCount: number;
  validationCount: number;
  seedSafeSetSize: number;
  criticObservations: number;
  coverageOverall: number;
  worstStratum?: {
    id: string;
    coverage: number;
    targetCoverage: number;
    violation: number;
    n: number;
  };
  recentAlerts: Array<{
    id: string;
    createdAt: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    type: string;
    message: string;
  }>;
}

interface ABExperimentOverviewCardProps {
  health: ExperimentHealth | null;
  loading: boolean;
}

/**
 * A/B Experiment Overview Card
 *
 * Displays key A/B test metrics including automation rate, SFN rate, and decision times.
 */
export function ABExperimentOverviewCard({ health, loading }: ABExperimentOverviewCardProps) {
  if (loading) {
    return (
      <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
        <div className="p-4 text-center text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
        <div className="p-4 text-center text-slate-500">
          No experiment data available
        </div>
      </div>
    );
  }

  // Format percentages
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Format time
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Determine SFN rate status color
  const sfnRateColor =
    health.sfnRate > 0.001
      ? '#E74C3C'
      : health.sfnRate > 0.0005
        ? '#F59E0B'
        : '#4CC38A';

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 relative transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <div className="px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 font-bold border border-green-200">
          Experiment live
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-24">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Icon name="activity" size={22} color="#4A67FF" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            A/B Experiment Overview
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            {health.experimentId.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Automation Rate */}
        <div>
          <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
            Automation Rate
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatPercent(health.automationRate)}
          </div>
        </div>

        {/* Escalation Rate */}
        <div>
          <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
            Escalation Rate
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatPercent(health.escalationRate)}
          </div>
        </div>

        {/* SFN Rate */}
        <div>
          <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
            SFN Rate
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: sfnRateColor }}
          >
            {formatPercent(health.sfnRate)}
          </div>
        </div>

        {/* Avg Decision Time */}
        <div>
          <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
            Avg Decision Time
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatTime(health.averageDecisionTimeMs)}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="flex justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
        <span>Calibration: {health.calibrationCount.toLocaleString()}</span>
        <span>Validations: {health.validationCount.toLocaleString()}</span>
      </div>
    </div>
  );
}

