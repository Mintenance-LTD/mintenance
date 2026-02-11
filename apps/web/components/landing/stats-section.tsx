import React from 'react';
import { AnimatedStat } from './animated-stat';

export interface PlatformStats {
  activeContractors: number;
  activeContractorsGrowth: number;
  completedJobs: number;
  completedJobsGrowth: number;
  totalSaved: number;
  totalSavedGrowth: number;
  avgResponseTimeHours: number;
  responseTimeImprovement: number;
}

interface StatsSectionProps {
  stats: PlatformStats | null;
}

/**
 * Platform statistics section with animated counters
 */
export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Trusted by thousands</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join the growing community of homeowners and contractors who trust Mintenance
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-semibold mt-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M13 7H7v6h6V7z" />
              <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
            </svg>
            Powered by Mint AI
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatedStat
            end={71}
            label="Damage Types Detected by AI"
            subtext="Multi-model fusion"
          />
          <AnimatedStat
            end={95}
            label="AI Accuracy Rate"
            suffix="%+"
            subtext="Continuously improving"
          />
          {stats?.activeContractors != null && stats.activeContractors > 0 && (
            <AnimatedStat
              end={stats.activeContractors}
              label="Active Contractors"
              suffix="+"
              subtext={stats.activeContractorsGrowth ? `+${stats.activeContractorsGrowth}% this month` : 'And growing'}
            />
          )}
          {stats?.completedJobs != null && stats.completedJobs > 0 && (
            <AnimatedStat
              end={stats.completedJobs}
              label="Jobs Completed"
              suffix="+"
              subtext={stats.completedJobsGrowth ? `+${stats.completedJobsGrowth}% this month` : 'And counting'}
            />
          )}
        </div>
      </div>
    </section>
  );
}
