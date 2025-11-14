'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ExperimentHealth {
  coverageOverall: number;
  worstStratum?: {
    id: string;
    coverage: number;
    targetCoverage: number;
    violation: number;
    n: number;
  };
}

interface ConformalPredictionCoverageCardProps {
  health: ExperimentHealth | null;
  loading: boolean;
}

/**
 * Conformal Prediction Coverage Card
 *
 * Displays overall coverage rate and worst-performing stratum.
 */
export function ConformalPredictionCoverageCard({
  health,
  loading,
}: ConformalPredictionCoverageCardProps) {
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
          No coverage data available
        </div>
      </div>
    );
  }

  const TARGET_COVERAGE = 0.90;
  const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

  // Determine coverage status
  const coverageDeficit = TARGET_COVERAGE - health.coverageOverall;
  const isHealthy = coverageDeficit <= 0.05; // Within 5% of target
  const coverageColor = isHealthy ? '#4CC38A' : '#F59E0B';

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 relative transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border',
            isHealthy ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          )}
        >
          Target {formatPercent(TARGET_COVERAGE)}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-24">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <Icon name="radar" size={22} color="#4CC38A" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Conformal Prediction Coverage
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Coverage Rate
          </p>
        </div>
      </div>

      {/* Overall Coverage */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
            Overall Coverage
          </span>
          <span
            className="text-3xl font-bold"
            style={{ color: coverageColor }}
          >
            {formatPercent(health.coverageOverall)}
          </span>
        </div>

        {/* Coverage Bar */}
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
          {/* Target line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 opacity-40 z-10"
            style={{
              left: `${(TARGET_COVERAGE * 100).toFixed(0)}%`,
            }}
          />
          {/* Actual coverage */}
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${(health.coverageOverall * 100).toFixed(0)}%`,
              backgroundColor: coverageColor,
            }}
          />
        </div>

        {coverageDeficit > 0 && (
          <div className="text-xs text-amber-600 mt-2 font-semibold">
            Deficit: {formatPercent(coverageDeficit)}
          </div>
        )}
      </div>

      {/* Worst Stratum */}
      {health.worstStratum && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 mb-2">
            Worst Stratum
          </div>
          <div className="text-xs text-slate-600 font-mono mb-1 break-all">
            {health.worstStratum.id}
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>
              Coverage: {formatPercent(health.worstStratum.coverage)} (target:{' '}
              {formatPercent(health.worstStratum.targetCoverage)})
            </span>
            <span>n={health.worstStratum.n}</span>
          </div>
          {health.worstStratum.violation > 0 && (
            <div className="text-xs text-rose-600 mt-1">
              Violation: {formatPercent(health.worstStratum.violation)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

