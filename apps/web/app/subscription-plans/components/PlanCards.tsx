'use client';

import Link from 'next/link';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const PLAN_ICONS: Record<string, typeof Star> = {
  basic: Star,
  professional: Zap,
  business: Crown,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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
  platformFee: string;
  savings?: string;
}

interface PlanCardsProps {
  plans: PlanFeature[];
  isAnnual: boolean;
}

export function PlanCards({ plans, isAnnual }: PlanCardsProps) {
  return (
    <MotionDiv
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16"
    >
      {plans.map((plan) => {
        const Icon = PLAN_ICONS[plan.id] ?? Star;
        const price = isAnnual ? plan.priceAnnual : plan.price;
        const billingLabel = isAnnual ? 'year' : 'month';

        return (
          <MotionDiv
            key={plan.id}
            variants={staggerItem}
            whileHover={{ y: -8, scale: 1.02 }}
            className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 transition-all ${
              plan.popular
                ? 'border-teal-500 shadow-teal-100 scale-105'
                : 'border-gray-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  MOST POPULAR
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <div
                className={`inline-flex p-4 rounded-2xl mb-4 ${
                  plan.color === 'teal'
                    ? 'bg-teal-100'
                    : plan.color === 'purple'
                      ? 'bg-purple-100'
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">£{price}</span>
                <span className="text-gray-600">/{billingLabel}</span>
              </div>
              {isAnnual && price > 0 && (
                <p className="text-sm text-emerald-600 font-medium mt-2">
                  Save £{((plan.price * 12) - plan.priceAnnual).toFixed(0)} per year
                </p>
              )}
            </div>

            <Link
              href={
                plan.id === 'business'
                  ? '/contact?subject=Business%20Plan'
                  : '/register?type=contractor'
              }
              className={`block w-full py-4 rounded-xl text-center font-semibold mb-6 transition-all ${
                plan.popular
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {plan.cta}
            </Link>

            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </MotionDiv>
        );
      })}
    </MotionDiv>
  );
}
