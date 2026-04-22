'use client';

import { Check, Crown, Loader2 } from 'lucide-react';
import { HOMEOWNER_TIER_PRICING } from '@/lib/feature-access-config';

export type TierKey = 'free' | 'landlord' | 'agency';

interface TierConfigEntry {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface UpgradePlansProps {
  upgradePlans: TierKey[];
  tierConfig: Record<TierKey, TierConfigEntry>;
  planFeatures: Record<TierKey, string[]>;
  isAnnual: boolean;
  onAnnualToggle: (value: boolean) => void;
  upgradingPlan: string | null;
  onUpgrade: (planKey: TierKey) => void;
  formatAmount: (amount: number, currency: string) => string;
}

/**
 * Extracted from subscription-client.tsx to keep that file under the
 * 500-line cap after the 2026-04-21 early-access incomplete-sub fix
 * pushed it over. Pure-presentation: same markup + behaviour as the
 * inlined Upgrade Plans section, just lifted into a sibling file.
 */
export function UpgradePlans({
  upgradePlans,
  tierConfig,
  planFeatures,
  isAnnual,
  onAnnualToggle,
  upgradingPlan,
  onUpgrade,
  formatAmount,
}: UpgradePlansProps) {
  if (upgradePlans.length === 0) return null;

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-sm font-semibold uppercase tracking-wider text-gray-400'>
            Upgrade Your Plan
          </h2>
          <p className='text-xs text-gray-500 mt-1'>
            Unlock more features for your property portfolio
          </p>
        </div>

        {/* Annual / Monthly toggle */}
        <div className='flex items-center gap-2 rounded-lg bg-gray-100 p-1'>
          <button
            type='button'
            onClick={() => onAnnualToggle(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !isAnnual
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            type='button'
            onClick={() => onAnnualToggle(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isAnnual
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Annual
            <span className='ml-1 text-emerald-600 font-semibold'>-17%</span>
          </button>
        </div>
      </div>

      <div
        className={`grid gap-6 ${upgradePlans.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'}`}
      >
        {upgradePlans.map((planKey) => {
          const plan = HOMEOWNER_TIER_PRICING[planKey];
          const config = tierConfig[planKey];
          const PlanIcon = config.icon;
          const price =
            isAnnual && 'annualPrice' in plan ? plan.annualPrice : plan.price;
          const period = isAnnual ? 'year' : 'month';
          const isPopular = 'popular' in plan && plan.popular;
          const isUpgrading = upgradingPlan === planKey;

          return (
            <div
              key={planKey}
              className={`relative rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                isPopular ? 'border-teal-400 shadow-sm' : 'border-gray-200'
              }`}
            >
              {isPopular && (
                <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                  <span className='inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-0.5 text-xs font-semibold text-white'>
                    <Crown className='h-3 w-3' /> Most Popular
                  </span>
                </div>
              )}

              <div className='flex items-center gap-3 mb-4'>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
                >
                  <PlanIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <h3 className='text-lg font-bold text-gray-900'>
                    {plan.name}
                  </h3>
                  <p className='text-xs text-gray-500'>{plan.description}</p>
                </div>
              </div>

              <div className='mb-5'>
                <span className='text-3xl font-bold text-gray-900'>
                  {formatAmount(price as number, 'GBP')}
                </span>
                <span className='text-sm text-gray-500 ml-1'>/ {period}</span>
                {isAnnual && (
                  <p className='text-xs text-emerald-600 mt-1'>
                    Save{' '}
                    {formatAmount(
                      (plan.price as number) * 12 - (price as number),
                      'GBP'
                    )}{' '}
                    per year
                  </p>
                )}
              </div>

              <ul className='space-y-2.5 mb-6'>
                {planFeatures[planKey].map((feature) => (
                  <li key={feature} className='flex items-start gap-2.5'>
                    <Check className='h-4 w-4 mt-0.5 flex-shrink-0 text-teal-500' />
                    <span className='text-sm text-gray-700'>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type='button'
                onClick={() => onUpgrade(planKey)}
                disabled={!!upgradingPlan}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isPopular
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isUpgrading ? (
                  <span className='flex items-center justify-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Processing...
                  </span>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
