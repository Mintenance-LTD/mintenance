'use client';

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
          No training data available
        </div>
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
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 relative transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border',
            isWellTrained && hasSafeSet
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          )}
        >
          <Icon
            name={isWellTrained && hasSafeSet ? 'checkCircle' : 'clock'}
            size={14}
            color={statusColor}
          />
          {statusText}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-24">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Icon name="target" size={22} color="#9333EA" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Critic Training Status
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Safe-LUCB Model
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-4">
        {/* Critic Observations */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
              Observations
            </span>
            <span
              className={cn(
                'text-xl font-bold',
                isWellTrained ? 'text-[#4CC38A]' : 'text-amber-600'
              )}
            >
              {health.criticObservations.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                isWellTrained ? 'bg-[#4CC38A]' : 'bg-amber-500'
              )}
              style={{
                width: `${Math.min((health.criticObservations / MIN_OBSERVATIONS) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">
            Target: {MIN_OBSERVATIONS.toLocaleString()}
          </div>
        </div>

        {/* Seed Safe Set */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">
              Seed Safe Set
            </span>
            <span
              className={cn(
                'text-xl font-bold',
                hasSafeSet ? 'text-[#4CC38A]' : 'text-amber-600'
              )}
            >
              {health.seedSafeSetSize.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Data Quality Indicators */}
        <div className="flex justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <span>Calibration: {health.calibrationCount.toLocaleString()}</span>
          <span>Validations: {health.validationCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

