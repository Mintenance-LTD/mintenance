'use client';

import React, { useState, useEffect } from 'react';
import { ABExperimentOverviewCard } from './ABExperimentOverviewCard';
import { CriticTrainingStatusCard } from './CriticTrainingStatusCard';
import { ConformalPredictionCoverageCard } from './ConformalPredictionCoverageCard';
import { SafetyAlertsList } from './SafetyAlertsList';

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

/**
 * Safety & Experiment Health Section
 *
 * Aggregates and displays all safety-related metrics and alerts for the A/B test experiment.
 */
export function SafetyExperimentHealthSection() {
  const [health, setHealth] = useState<ExperimentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExperimentHealth() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/experiment-health');

        // Parse response (whether success or error)
        const data = await response.json();

        if (!response.ok) {
          // Extract error message from response
          let errorMessage = data.error || 'Failed to fetch experiment health';
          
          // Check for specific error cases
          if (response.status === 503) {
            errorMessage = 'A/B testing not configured. Please set AB_TEST_EXPERIMENT_ID in your environment variables.';
          } else if (response.status === 401) {
            errorMessage = 'Unauthorized - admin access required';
          }
          
          throw new Error(errorMessage);
        }
        
        // Check if response contains an error field (from catch block in API)
        if (data.error) {
          throw new Error(data.error);
        }
        
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set fallback data on error
        setHealth(null);
      } finally {
        setLoading(false);
      }
    }

    fetchExperimentHealth();
  }, []);

  // Don't render if there's no experiment configured
  if (!loading && !health && !error) {
    return null;
  }

  return (
    <section className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 px-6 py-5 shadow-sm">
      <div className="mb-6 space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Safety & Experiment Health</h2>
        <p className="text-sm text-slate-500">
          Monitor A/B test metrics, critic training, conformal prediction coverage, and safety alerts.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 font-semibold">
            Experiment live
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 font-semibold">
            Training
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold">
            Target 90%
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          Failed to load experiment health: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ABExperimentOverviewCard health={health} loading={loading} />
        <CriticTrainingStatusCard health={health} loading={loading} />
        <ConformalPredictionCoverageCard health={health} loading={loading} />
      </div>

      <div className="w-full">
        <SafetyAlertsList alerts={health?.recentAlerts || []} loading={loading} />
      </div>
    </section>
  );
}

