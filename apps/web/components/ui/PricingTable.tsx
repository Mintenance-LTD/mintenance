'use client';

import React from 'react';
import { Icon } from './Icon';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  period?: string;
  features: string[];
  recommended?: boolean;
  badge?: string;
}

interface PricingTableProps {
  plans: PricingPlan[];
  onSelectPlan?: (planId: string) => void;
  isLoading?: boolean;
  currentPlanId?: string;
}

export function PricingTable({
  plans,
  onSelectPlan,
  isLoading = false,
  currentPlanId,
}: PricingTableProps) {
  const formatPrice = (price: number, currency: string = 'GBP'): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="w-full">
      {/* Container with responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {plans.map((plan, index) => {
          const isRecommended = plan.recommended || false;
          const isCurrentPlan = currentPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`
                relative flex flex-col
                bg-white rounded-2xl border-2 p-8
                transition-all duration-300 ease-out
                hover:-translate-y-2
                ${isRecommended
                  ? 'border-primary-600 shadow-2xl lg:scale-105 lg:-mt-4'
                  : 'border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300'
                }
                ${isCurrentPlan ? 'ring-2 ring-primary-400 ring-offset-4' : ''}
              `}
            >
              {/* Badge */}
              {(isRecommended || plan.badge) && (
                <div className="absolute top-0 right-6 -translate-y-1/2">
                  <span
                    className={`
                      inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg
                      ${isRecommended
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white'
                        : 'bg-gradient-to-r from-accent-500 to-accent-600 text-white'
                      }
                    `}
                  >
                    {plan.badge || 'RECOMMENDED'}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <div className="mb-6">
                <h3 className="text-subheading-md font-[560] text-gray-900 mb-4">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-heading-md font-[640] text-gray-900 tracking-tighter">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  {plan.period && (
                    <span className="text-base font-[460] text-gray-600">
                      /{plan.period}
                    </span>
                  )}
                </div>
              </div>

              {/* Features List */}
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon
                        name="check"
                        size={20}
                        color="#10B981"
                      />
                    </div>
                    <span className="text-sm font-[460] text-gray-700 leading-normal">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Signup Button */}
              <button
                onClick={() => onSelectPlan?.(plan.id)}
                disabled={isLoading || isCurrentPlan}
                className={`
                  w-full py-3.5 px-6 rounded-xl
                  text-sm font-semibold
                  transition-all duration-200 ease-out
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isCurrentPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : isRecommended
                    ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97] shadow-md hover:shadow-lg'
                    : 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-50 hover:border-primary-700 active:scale-[0.97]'
                  }
                `}
              >
                {isCurrentPlan
                  ? 'Current Plan'
                  : isLoading
                  ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  )
                  : 'Get Started'
                }
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

