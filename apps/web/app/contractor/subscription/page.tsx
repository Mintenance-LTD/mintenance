'use client';

import React, { useState } from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  current?: boolean;
}

export default function ContractorSubscriptionPage2025() {
  const { user } = useCurrentUser();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free Forever',
      price: 0,
      interval: 'month',
      current: true,
      features: [
        '5 bids per month (resets monthly)',
        'Basic profile',
        'Job browsing',
        'Messaging',
        '3 portfolio photos',
        'Email support',
      ],
    },
    {
      id: 'basic',
      name: 'Basic',
      price: billingInterval === 'month' ? 29 : 290,
      interval: billingInterval,
      features: [
        '20 bids per month',
        'Enhanced profile',
        'Discovery card',
        'Priority support',
        '20 portfolio photos',
        'Invoice management',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: billingInterval === 'month' ? 79 : 790,
      interval: billingInterval,
      popular: true,
      features: [
        '100 bids per month',
        'Social feed access',
        'CRM tools',
        'Advanced analytics',
        '100 portfolio photos',
        'Team management (up to 5)',
        'Priority support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingInterval === 'month' ? 199 : 1990,
      interval: billingInterval,
      features: [
        'Unlimited bids',
        'Everything in Professional',
        'Custom integrations',
        'White-label options',
        'Unlimited team members',
        'Phone support',
        'SLA guarantee',
        'Dedicated account manager',
      ],
    },
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.requiresPayment && data.clientSecret) {
          window.location.href = `/contractor/subscription/checkout?clientSecret=${data.clientSecret}`;
        } else {
          toast.success('Subscription updated successfully!');
        }
      } else {
        toast.error('Failed to update subscription');
      }
    } catch (error) {
      toast.error('Error updating subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12 text-center">
            <div className="inline-block w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 mx-auto mb-4">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">Subscription Plans</h1>
            <p className="text-teal-100 text-lg mb-6">Free forever - upgrade anytime for more bids and features</p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl p-2 border border-white/30">
              <button
                onClick={() => setBillingInterval('month')}
                className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                  billingInterval === 'month'
                    ? 'bg-white text-teal-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`px-6 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  billingInterval === 'year'
                    ? 'bg-white text-teal-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Annually
                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-xs">Save 17%</span>
              </button>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-12 w-full">
          <MotionDiv
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {plans.map((plan) => (
              <MotionDiv
                key={plan.id}
                className={`bg-white rounded-3xl border-2 shadow-lg overflow-hidden relative ${
                  plan.popular ? 'border-teal-600 scale-105' : 'border-gray-200'
                }`}
                variants={staggerItem}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-center py-2 text-sm font-bold">
                    ⭐ Most Popular
                  </div>
                )}

                <div className={`p-8 ${plan.popular ? 'pt-16' : ''}`}>
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mb-4">
                      <span className="text-5xl font-bold text-gray-900">£{plan.price}</span>
                      {plan.price > 0 && (
                        <span className="text-gray-600">/{billingInterval === 'month' ? 'mo' : 'yr'}</span>
                      )}
                    </div>
                    {plan.current && (
                      <span className="inline-block px-4 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold">
                        Current Plan
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading || plan.current}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-lg hover:scale-105'
                        : plan.current
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.current ? 'Current Plan' : loading ? 'Processing...' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                  </button>
                </div>
              </MotionDiv>
            ))}
          </MotionDiv>

          {/* FAQ Section */}
          <MotionDiv
            className="mt-16 bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  q: 'Is the free plan really free forever?',
                  a: 'Yes! The free plan is completely free with no time limit. You get 5 bids per month that reset on the 1st of each month.',
                },
                {
                  q: 'Can I change my plan anytime?',
                  a: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated.',
                },
                {
                  q: 'Do I need a credit card for the free plan?',
                  a: 'No credit card required for the free plan. Only paid plans require payment information.',
                },
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes, you can cancel your subscription at any time with no cancellation fees. You can always return to the free plan.',
                },
              ].map((faq, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-600 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
      </main>
    </div>
  );
}
