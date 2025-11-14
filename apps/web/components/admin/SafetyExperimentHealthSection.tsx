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
    <section className="mt-12">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-3">
          Safety & Experiment Health
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
          Monitor A/B test metrics, critic training, conformal prediction coverage, and safety alerts.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
          Failed to load experiment health: {error}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <ABExperimentOverviewCard health={health} loading={loading} />
        <CriticTrainingStatusCard health={health} loading={loading} />
        <ConformalPredictionCoverageCard health={health} loading={loading} />
      </div>

      {/* Alerts List (Full Width) */}
      <div className="w-full">
        <SafetyAlertsList alerts={health?.recentAlerts || []} loading={loading} />
      </div>
    </section>
  );
}

