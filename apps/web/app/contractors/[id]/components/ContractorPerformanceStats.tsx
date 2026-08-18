'use client';

import { Clock, TrendingUp, Users, Award } from 'lucide-react';

/**
 * Performance signals on the public contractor profile.
 *
 * 2026-08-02: these used to render the raw numbers, so a contractor with no
 * history showed as "0% on-time completion, 0% repeat customers, 0 years
 * experience" — indistinguishable from a genuinely bad tradesperson, on the
 * surface where homeowners decide who to hire. Both percentages are derived
 * from completed jobs, so with none there is no basis for them at all; they
 * read "—" until there is. Tenure under a year reads "New" rather than "0"
 * (it is time on Mintenance, not self-declared trade experience — hence the
 * relabel from "Years experience"). Mirrors mobile's ProfilePerformance.
 */
interface ContractorPerformanceStatsProps {
  responseTime: string;
  onTimeCompletion: number;
  repeatCustomers: number;
  yearsExperience: number;
  /** Basis for the derived percentages — no completed jobs, no figures. */
  completedJobs: number;
}

const EMPTY = '—';

export function ContractorPerformanceStats({
  responseTime,
  onTimeCompletion,
  repeatCustomers,
  yearsExperience,
  completedJobs,
}: ContractorPerformanceStatsProps) {
  const hasBasis = completedJobs > 0;
  const percent = (value: number) =>
    hasBasis && value !== null && value !== undefined
      ? `${Math.round(value)}%`
      : EMPTY;

  const tenure =
    yearsExperience > 0
      ? `${yearsExperience} ${yearsExperience === 1 ? 'year' : 'years'}`
      : 'New';

  const items = [
    {
      key: 'response',
      Icon: Clock,
      label: 'Response time',
      value: responseTime && responseTime.length > 0 ? responseTime : EMPTY,
    },
    {
      key: 'ontime',
      Icon: TrendingUp,
      label: 'On-time completion',
      value: percent(onTimeCompletion),
    },
    {
      key: 'repeat',
      Icon: Users,
      label: 'Repeat customers',
      value: percent(repeatCustomers),
    },
    {
      key: 'tenure',
      Icon: Award,
      label: 'On Mintenance',
      value: tenure,
    },
  ];

  return (
    <div className='border-b border-gray-200 pb-8'>
      <h2 className='text-2xl font-semibold text-gray-900 mb-6'>Performance</h2>
      <div className='grid grid-cols-2 gap-6'>
        {items.map(({ key, Icon, label, value }) => (
          <div key={key} data-testid={`performance-${key}`}>
            <div className='flex items-center gap-2 mb-2'>
              <Icon className='w-5 h-5 text-gray-600' />
              <span className='text-sm text-gray-600'>{label}</span>
            </div>
            <p
              className='text-2xl font-semibold text-gray-900'
              data-testid={`performance-${key}-value`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      {!hasBasis && (
        <p className='text-sm text-gray-500 mt-4'>
          Some figures appear once this tradesperson completes their first job.
        </p>
      )}
    </div>
  );
}
