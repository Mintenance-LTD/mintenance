'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

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
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="p-4 text-center text-slate-500 text-sm">No experiment data available</div>
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
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 relative">
      <div className="absolute top-4 right-4">
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-semibold">
          Experiment live
        </span>
      </div>
      <div className="flex items-center gap-3 mb-5 pr-16">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon name="activity" size={20} color="#0F172A" className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">A/B Experiment Overview</h3>
          <p className="text-xs text-slate-500 font-mono">{health.experimentId.slice(0, 8)}...</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Automation Rate</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatPercent(health.automationRate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Escalation Rate</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatPercent(health.escalationRate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">SFN Rate</p>
          <p className="text-xl font-semibold mt-1" style={{ color: sfnRateColor }}>
            {formatPercent(health.sfnRate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Decision Time</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{formatTime(health.averageDecisionTimeMs)}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>Calibration: {health.calibrationCount.toLocaleString()}</span>
        <span>Validations: {health.validationCount.toLocaleString()}</span>
      </div>
    </div>
  );
}

