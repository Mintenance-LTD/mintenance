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
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="p-4 text-center text-slate-500 text-sm">No coverage data available</div>
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
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 relative">
      <div className="absolute top-4 right-4">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold',
            isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          Target {formatPercent(TARGET_COVERAGE)}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-5 pr-16">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon name="radar" size={20} color="#10B981" className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Conformal Prediction Coverage</h3>
          <p className="text-xs text-slate-500">Coverage rate</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Overall Coverage</span>
          <span className="text-2xl font-semibold" style={{ color: coverageColor }}>
            {formatPercent(health.coverageOverall)}
          </span>
        </div>
        <div className="mt-2 h-3 bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400/50"
            style={{
              left: `${TARGET_COVERAGE * 100}%`,
            }}
          />
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${health.coverageOverall * 100}%`,
              backgroundColor: coverageColor,
            }}
          />
        </div>
        {coverageDeficit > 0 && (
          <p className="text-xs text-amber-600 mt-1">Deficit: {formatPercent(coverageDeficit)}</p>
        )}
      </div>

      {health.worstStratum && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 mb-1">Worst Stratum</div>
          <div className="text-xs text-slate-600 font-mono break-all mb-1">{health.worstStratum.id}</div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>
              Coverage: {formatPercent(health.worstStratum.coverage)} (target {formatPercent(health.worstStratum.targetCoverage)})
            </span>
            <span>n={health.worstStratum.n}</span>
          </div>
          {health.worstStratum.violation > 0 && (
            <div className="text-xs text-rose-600 mt-1">Violation: {formatPercent(health.worstStratum.violation)}</div>
          )}
        </div>
      )}
    </div>
  );
}

