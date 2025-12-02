'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Free forever - no credit card required',
    features: ['5 bids per month', 'Basic profile', 'Email support', 'Job browsing', 'Messaging', '3 portfolio photos'],
    cta: 'Start Free',
    popular: false,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    name: 'Basic',
    price: '£29',
    period: 'per month',
    description: 'For independent contractors',
    features: [
      '20 bids per month',
      'Enhanced profile',
      'Discovery card',
      'Priority support',
      '20 portfolio photos',
      'Invoice management',
    ],
    cta: 'Upgrade to Basic',
    popular: false,
    gradient: 'from-[#0066CC] to-[#0052A3]',
  },
  {
    name: 'Professional',
    price: '£79',
    period: 'per month',
    description: 'Most popular for growing businesses',
    features: [
      '100 bids per month',
      'Premium profile with badge',
      'Social feed access',
      'CRM tools',
      'Advanced analytics',
      '100 portfolio photos',
      'Priority support',
    ],
    cta: 'Upgrade to Professional',
    popular: true,
    gradient: 'from-[#10B981] to-emerald-600',
  },
  {
    name: 'Enterprise',
    price: '£199',
    period: 'per month',
    description: 'For established companies',
    features: [
      'Unlimited bids',
      'Featured listing',
      'Dedicated account manager',
      'API access',
      'Custom integrations',
      'Team management',
      'White-label options',
      'Training & onboarding',
    ],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-purple-500 to-indigo-500',
  },
];

export function PricingSection2025() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start free forever. Upgrade anytime for more bids and features. Always free for homeowners.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center p-1 bg-gray-200 rounded-2xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#0066CC] shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-white text-[#0066CC] shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 bg-[#10B981] text-white text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Homeowner Pricing Banner */}
        <motion.div
          className="mb-12 p-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white text-center"
          initial={!prefersReducedMotion ? { opacity: 0, scale: 0.95 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, scale: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-2xl font-bold mb-2">Always Free for Homeowners</h3>
          <p className="text-emerald-50 mb-4">
            Post unlimited jobs. Only pay a 5% platform fee on completed work.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm">
            <div>
              <span className="font-bold">5%</span> platform fee
            </div>
            <div className="h-4 w-px bg-white/30" />
            <div>
              <span className="font-bold">vs TaskRabbit</span> (15% fee)
            </div>
            <div className="h-4 w-px bg-white/30" />
            <div>
              <span className="font-bold">No hidden</span> charges
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              index={index}
              billingCycle={billingCycle}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>

        {/* Comparison Table Link */}
        <motion.div
          className="text-center mt-12"
          initial={!prefersReducedMotion ? { opacity: 0 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-[#0066CC] font-semibold hover:gap-3 transition-all"
          >
            View detailed feature comparison
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  index,
  billingCycle,
  prefersReducedMotion,
}: {
  plan: typeof plans[0];
  index: number;
  billingCycle: 'monthly' | 'annual';
  prefersReducedMotion: boolean;
}) {
  const annualPrice =
    billingCycle === 'annual' && plan.price !== '£0'
      ? `£${Math.round(parseInt(plan.price.replace('£', '')) * 0.8)}`
      : plan.price;

  return (
    <motion.div
      className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${
        plan.popular ? 'border-[#10B981] scale-105' : 'border-gray-100'
      }`}
      initial={!prefersReducedMotion ? { opacity: 0, y: 30 } : undefined}
      whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={!prefersReducedMotion ? { y: -8 } : undefined}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#10B981] to-emerald-600 text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-1">
          <Zap className="w-3 h-3" />
          MOST POPULAR
        </div>
      )}

      {/* Plan Name */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
      <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-bold text-gray-900">{annualPrice}</span>
          <span className="text-gray-600">/{plan.period}</span>
        </div>
        {billingCycle === 'annual' && plan.price !== '£0' && (
          <p className="text-sm text-emerald-600 font-medium mt-1">
            Save £{(parseInt(plan.price.replace('£', '')) * 0.2 * 12).toFixed(0)} per year
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Link
        href="/register?role=contractor"
        className={`block w-full py-3 px-6 rounded-xl font-bold text-center transition-all duration-300 mb-6 ${
          plan.popular
            ? 'bg-gradient-to-r from-[#10B981] to-emerald-600 text-white hover:shadow-xl hover:scale-105'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {plan.cta}
      </Link>

      {/* Features */}
      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center mt-0.5`}
            >
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
