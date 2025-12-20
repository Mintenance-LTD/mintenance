import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ExperimentHealth {
  criticObservations: number;
  seedSafeSetSize: number;
  calibrationCount: number;
  validationCount: number;
}

interface CriticTrainingStatusCardProps {
  health: ExperimentHealth | null;
  loading: boolean;
}

/**
 * Critic Training Status Card
 *
 * Displays Safe-LUCB critic model training status and data availability.
 */
export function CriticTrainingStatusCard({ health, loading }: CriticTrainingStatusCardProps) {
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
        <div className="p-4 text-center text-slate-500 text-sm">No training data available</div>
      </div>
    );
  }

  // Determine training status
  const MIN_OBSERVATIONS = 100;
  const MIN_SAFE_SET = 10;
  const isWellTrained = health.criticObservations >= MIN_OBSERVATIONS;
  const hasSafeSet = health.seedSafeSetSize >= MIN_SAFE_SET;
  const statusColor = isWellTrained && hasSafeSet ? '#4CC38A' : '#F59E0B';
  const statusText = isWellTrained && hasSafeSet ? 'Well Trained' : 'Training';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 relative">
      <div className="absolute top-4 right-4">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5',
            isWellTrained && hasSafeSet ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          <Icon name={isWellTrained && hasSafeSet ? 'checkCircle' : 'clock'} size={14} color={statusColor} />
          {statusText}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-5 pr-16">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon name="target" size={20} color="#7C3AED" className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Critic Training Status</h3>
          <p className="text-xs text-slate-500">Safe-LUCB model</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Observations</span>
            <span className={cn('text-xl font-semibold', isWellTrained ? 'text-emerald-600' : 'text-amber-600')}>
              {health.criticObservations.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', isWellTrained ? 'bg-emerald-500' : 'bg-amber-500')}
              style={{
                width: `${Math.min((health.criticObservations / MIN_OBSERVATIONS) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Target: {MIN_OBSERVATIONS.toLocaleString()}</p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Seed Safe Set</span>
          <span className={cn('text-xl font-semibold', hasSafeSet ? 'text-emerald-600' : 'text-amber-600')}>
            {health.seedSafeSetSize.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Calibration: {health.calibrationCount.toLocaleString()}</span>
          <span>Validations: {health.validationCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

