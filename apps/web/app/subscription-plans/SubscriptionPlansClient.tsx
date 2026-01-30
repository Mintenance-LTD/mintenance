'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Star, Zap, Crown } from 'lucide-react';

const PLAN_ICONS: Record<string, typeof Star> = {
  basic: Star,
  professional: Zap,
  business: Crown,
};

interface PlanFeature {
  id: string;
  name: string;
  price: number;
  priceAnnual: number;
  description: string;
  features: string[];
  cta: string;
  color: 'gray' | 'teal' | 'purple';
  popular: boolean;
}

interface SubscriptionPlansClientProps {
  plans: PlanFeature[];
}

export function SubscriptionPlansClient({ plans }: SubscriptionPlansClientProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-3 bg-gray-100 rounded-xl p-2">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              !isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isAnnual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Annual
            <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-xs font-semibold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Star;
          const price = isAnnual ? plan.priceAnnual : plan.price;
          const billingLabel = isAnnual ? 'year' : 'month';

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-8 shadow-sm transition-shadow hover:shadow-md ${
                plan.popular ? 'border-[#3B82F6]' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#3B82F6] text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div
                  className={`inline-flex p-3 rounded-xl mb-4 ${
                    plan.color === 'teal'
                      ? 'bg-teal-50'
                      : plan.color === 'purple'
                        ? 'bg-purple-50'
                        : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    className={`w-8 h-8 ${
                      plan.color === 'teal'
                        ? 'text-teal-600'
                        : plan.color === 'purple'
                          ? 'text-purple-600'
                          : 'text-gray-600'
                    }`}
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">£{price}</span>
                  <span className="text-gray-600">/{billingLabel}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.id === 'business' ? '/contact?subject=Business%20Plan' : '/register?type=contractor'}
                className={`block w-full py-3 rounded-lg text-center font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
                    : 'bg-[#1F2937] text-white hover:bg-[#374151]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
