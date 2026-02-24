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
          <h2 className="text-5xl font-bold text-gray-900 mb-4">The problem is real</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            UK homeowners lose billions to cowboy builders every year. Mintenance was built to fix that.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatedStat
            end={52}
            label="of UK homeowners don't trust tradespeople"
            suffix="%"
            subtext="Checkatrade Focaldata Study"
          />
          <AnimatedStat
            end={14}
            label="lost to cowboy builders in 5 years"
            prefix="£"
            suffix=".3bn"
            subtext="125,000+ complaints since 2019"
          />
          <AnimatedStat
            end={63}
            label="who hired a tradesperson had a bad experience"
            suffix="%"
            subtext="Ipsos Research"
          />
          <AnimatedStat
            end={81}
            label="of the public want builders licensed by law"
            suffix="%"
            subtext="CIOB State of Trade Survey"
          />
        </div>

        {/* Show real platform stats only when they exist */}
        {stats && (stats.activeContractors > 0 || stats.completedJobs > 0) && (
          <div className="mt-16 pt-16 border-t border-gray-200">
            <p className="text-center text-sm font-semibold text-teal-700 uppercase tracking-wider mb-8">Mintenance by the numbers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <AnimatedStat
                end={71}
                label="Damage Types Detected by AI"
                subtext="Powered by Mint AI"
              />
              <AnimatedStat
                end={95}
                label="AI Accuracy Rate"
                suffix="%+"
                subtext="Continuously improving"
              />
              {stats.activeContractors > 0 && (
                <AnimatedStat
                  end={stats.activeContractors}
                  label="Active Contractors"
                  suffix="+"
                  subtext={stats.activeContractorsGrowth ? `+${stats.activeContractorsGrowth}% this month` : 'And growing'}
                />
              )}
              {stats.completedJobs > 0 && (
                <AnimatedStat
                  end={stats.completedJobs}
                  label="Jobs Completed"
                  suffix="+"
                  subtext={stats.completedJobsGrowth ? `+${stats.completedJobsGrowth}% this month` : 'And counting'}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
