'use client';

import { Clock, TrendingUp, Users, Award } from 'lucide-react';
import { performanceBasisLabels, type ContractorPerformanceBasis } from '@mintenance/shared';

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
  responseTime: string | null;
  onTimeCompletion: number | null;
  repeatCustomers: number | null;
  yearsExperience: number;
  basis?: ContractorPerformanceBasis;
}

const EMPTY = '—';

export function ContractorPerformanceStats({
  responseTime,
  onTimeCompletion,
  repeatCustomers,
  yearsExperience,
  basis,
}: ContractorPerformanceStatsProps) {
  const labels = performanceBasisLabels(basis);
  const percent = (value: number | null, label: string | null) =>
    label && value != null
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
      value: labels.responses ? responseTime ?? EMPTY : EMPTY,
      detail: labels.responses,
    },
    {
      key: 'ontime',
      Icon: TrendingUp,
      label: 'On-time completion',
      value: percent(onTimeCompletion, labels.onTime),
      detail: labels.onTime,
    },
    {
      key: 'repeat',
      Icon: Users,
      label: 'Repeat customers',
      value: percent(repeatCustomers, labels.repeat),
      detail: labels.repeat,
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
        {items.map(({ key, Icon, label, value, detail }) => (
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
            {detail && value !== EMPTY && <p className='mt-1 text-xs text-gray-600'>{detail}</p>}
          </div>
        ))}
      </div>
      {items.some((item) => item.value === EMPTY) && (
        <p className='text-sm text-gray-500 mt-4'>
          Figures appear once at least three records qualify for that measure.
        </p>
      )}
    </div>
  );
}
