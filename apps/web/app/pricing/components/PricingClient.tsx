'use client';

import React, { useState } from 'react';
import { logger } from '@mintenance/shared';
import { Check, X, Shield, HelpCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  MotionButton,
  MotionDiv,
  MotionH1,
  MotionP,
} from '@/components/ui/MotionDiv';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import {
  getHomeownerPlans,
  getContractorPlans,
  PRICING_FAQS,
} from './pricing-plans';
import type { PricingPlan } from './pricing-plans';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
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

export function PricingClient() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [userType, setUserType] = useState<'homeowner' | 'contractor'>(
    'homeowner'
  );
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const { csrfToken } = useCSRF();

  const homeownerPlans = getHomeownerPlans(isAnnual);
  const contractorPlans = getContractorPlans(isAnnual);

  const plans = userType === 'homeowner' ? homeownerPlans : contractorPlans;

  const faqs = PRICING_FAQS;

  const handleSelectPlan = async (planId: string) => {
    if (userType === 'homeowner') {
      if (planId === 'free') {
        toast('Homeowner free plan is ready. Sign up to get started.');
        router.push('/register?role=homeowner');
        return;
      }

      if (!user) {
        router.push('/login?redirect=/pricing?role=homeowner');
        return;
      }

      if (user.role !== 'homeowner') {
        toast.error('Homeowner plans are only available to homeowner accounts');
        return;
      }

      setLoadingPlan(planId);
      try {
        const response = await fetch('/api/subscriptions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken || '',
          },
          body: JSON.stringify({
            planType: planId, // 'premium', 'landlord', or 'agency'
            billingCycle: isAnnual ? 'yearly' : 'monthly',
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `Failed to start ${planId} checkout`);
        }

        if (result.requiresPayment && result.clientSecret) {
          const checkoutPath =
            result.checkoutPath || '/homeowner/subscription/checkout';
          const subscriptionRef =
            result.stripeSubscriptionId || result.subscriptionId;
          router.push(
            `${checkoutPath}?clientSecret=${encodeURIComponent(result.clientSecret)}&subscriptionId=${encodeURIComponent(subscriptionRef)}&planType=${encodeURIComponent(planId)}`
          );
          return;
        }

        toast.success(
          `${planId.charAt(0).toUpperCase() + planId.slice(1)} plan activated.`
        );
        router.push('/homeowner/subscription?success=true');
      } catch (error) {
        logger.error('Homeowner subscription creation error:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to create subscription'
        );
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // For contractors - handle subscription
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/pricing`);
      return;
    }

    // Check if user is a contractor
    if (user.role !== 'contractor') {
      toast.error('Subscriptions are only available for contractors');
      router.push('/register?role=contractor');
      return;
    }

    // Handle free plan
    if (planId === 'free') {
      toast("You're on the free plan! Upgrade anytime for more features.");
      router.push('/contractor/subscription');
      return;
    }

    // Handle enterprise plan
    if (planId === 'enterprise') {
      toast('Please contact our sales team for enterprise pricing.');
      router.push('/contact?subject=Enterprise%20Plan%20Enquiry');
      return;
    }

    // Create subscription for paid plans
    setLoadingPlan(planId);
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({
          planType: planId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresPayment && result.clientSecret) {
          // Redirect to checkout page with client secret
          const subscriptionRef =
            result.stripeSubscriptionId || result.subscriptionId;
          router.push(
            `/contractor/subscription/checkout?clientSecret=${encodeURIComponent(result.clientSecret)}&subscriptionId=${encodeURIComponent(subscriptionRef)}&planType=${encodeURIComponent(planId)}`
          );
        } else if (result.subscriptionId) {
          // Subscription activated without payment (trial or free)
          toast.success('Subscription activated! Redirecting to dashboard...');
          router.push('/contractor/dashboard-enhanced');
        } else {
          toast.error('Unexpected response from server');
        }
      } else {
        // Handle errors
        if (response.status === 401) {
          toast.error('Please log in to continue');
          router.push(`/login?redirect=/pricing`);
        } else if (response.status === 403) {
          toast.error('Access denied. Please verify your account.');
        } else {
          toast.error(result.error || 'Failed to create subscription');
        }
      }
    } catch (error) {
      logger.error('Subscription creation error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{
        background: 'var(--me-bg)',
        fontFamily: 'var(--me-font-body)',
        color: 'var(--me-ink)',
      }}
    >
      {/* Hero Section */}
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          color: 'var(--me-on-brand)',
        }}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
          <div className='text-center'>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='text-4xl md:text-6xl mb-6'
              style={{
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Simple, Transparent Pricing
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='text-xl md:text-2xl max-w-3xl mx-auto mb-8'
              style={{ color: 'var(--me-brand-soft)' }}
            >
              Choose the plan that works best for you. No hidden fees, cancel
              anytime.
            </MotionP>

            {userType === 'homeowner' && (
              <p
                className='text-sm md:text-base max-w-3xl mx-auto mb-8'
                style={{ color: 'var(--me-brand-soft)' }}
              >
                From single homeowners to letting agencies — find the plan that
                fits your portfolio.
              </p>
            )}
            {userType === 'homeowner' && user?.role === 'homeowner' && (
              <div className='mb-8'>
                <button
                  onClick={() => router.push('/homeowner/subscription')}
                  className='px-4 py-2 text-sm font-medium'
                  style={{
                    borderRadius: 'var(--me-radius-btn)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--me-on-brand)',
                  }}
                >
                  Manage Current Subscription
                </button>
              </div>
            )}

            {/* User Type Toggle */}
            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='inline-flex w-full max-w-sm p-2 mb-8'
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--me-radius-card)',
              }}
            >
              <button
                onClick={() => setUserType('homeowner')}
                className='flex-1 px-3 sm:px-8 py-3 font-semibold transition-all'
                style={{
                  borderRadius: 'var(--me-radius-btn)',
                  background:
                    userType === 'homeowner'
                      ? 'var(--me-surface)'
                      : 'transparent',
                  color:
                    userType === 'homeowner'
                      ? 'var(--me-brand)'
                      : 'var(--me-on-brand)',
                  boxShadow:
                    userType === 'homeowner' ? 'var(--me-shadow-pop)' : 'none',
                }}
              >
                Homeowner
              </button>
              <button
                onClick={() => setUserType('contractor')}
                className='flex-1 px-3 sm:px-8 py-3 font-semibold transition-all'
                style={{
                  borderRadius: 'var(--me-radius-btn)',
                  background:
                    userType === 'contractor'
                      ? 'var(--me-surface)'
                      : 'transparent',
                  color:
                    userType === 'contractor'
                      ? 'var(--me-brand)'
                      : 'var(--me-on-brand)',
                  boxShadow:
                    userType === 'contractor' ? 'var(--me-shadow-pop)' : 'none',
                }}
              >
                Contractor
              </button>
            </MotionDiv>

            {/* Annual/Monthly Toggle */}
            {(userType === 'contractor' || userType === 'homeowner') && (
              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='flex items-center justify-center gap-4'
              >
                <span
                  className='font-medium'
                  style={{
                    color: !isAnnual
                      ? 'var(--me-on-brand)'
                      : 'var(--me-brand-soft)',
                  }}
                >
                  Monthly
                </span>
                <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  className='relative inline-flex h-8 w-16 items-center rounded-full'
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full transition ${
                      isAnnual ? 'translate-x-9' : 'translate-x-1'
                    }`}
                    style={{ background: 'var(--me-surface)' }}
                  />
                </button>
                <span
                  className='font-medium'
                  style={{
                    color: isAnnual
                      ? 'var(--me-on-brand)'
                      : 'var(--me-brand-soft)',
                  }}
                >
                  Annual
                </span>
                {isAnnual && (
                  <span
                    className='px-3 py-1 rounded-full text-sm font-semibold'
                    style={{
                      background: 'var(--me-ok-bg)',
                      color: 'var(--me-ok-fg)',
                    }}
                  >
                    Save 17%
                  </span>
                )}
              </MotionDiv>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Pricing Cards */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <MotionDiv
          key={userType}
          variants={staggerContainer}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          className={`grid grid-cols-1 ${
            plans.length === 2
              ? 'md:grid-cols-2 max-w-5xl mx-auto'
              : 'md:grid-cols-3'
          } gap-8 mb-16`}
        >
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <MotionDiv
                key={plan.id}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                className='relative p-8 transition-all'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                  border: `2px solid ${
                    plan.popular ? 'var(--me-brand)' : 'var(--me-line)'
                  }`,
                }}
              >
                {plan.popular && (
                  <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                    <span
                      className='px-6 py-2 rounded-full text-sm font-bold'
                      style={{
                        background:
                          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                        color: 'var(--me-on-brand)',
                        boxShadow: 'var(--me-shadow-pop)',
                      }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className='text-center mb-6'>
                  <div
                    className='inline-flex p-4 mb-4'
                    style={{
                      borderRadius: 'var(--me-radius-card)',
                      background:
                        plan.color === 'teal' || plan.color === 'purple'
                          ? 'var(--me-brand-soft)'
                          : 'var(--me-bg-2)',
                    }}
                  >
                    <Icon
                      className='w-8 h-8'
                      style={{
                        color:
                          plan.color === 'teal' || plan.color === 'purple'
                            ? 'var(--me-brand)'
                            : 'var(--me-ink-2)',
                      }}
                    />
                  </div>
                  <h3
                    className='text-2xl mb-2'
                    style={{
                      color: 'var(--me-ink)',
                      fontFamily: 'var(--me-font-display)',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {plan.name}
                  </h3>
                  <p className='mb-4' style={{ color: 'var(--me-ink-2)' }}>
                    {plan.description}
                  </p>
                  <div className='flex items-baseline justify-center gap-2'>
                    <span
                      className='text-5xl'
                      style={{
                        color: 'var(--me-ink)',
                        fontFamily: 'var(--me-font-display)',
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      £{plan.price}
                    </span>
                    <span style={{ color: 'var(--me-ink-2)' }}>
                      / {plan.billingCycle}
                    </span>
                  </div>
                </div>

                <MotionButton
                  whileHover={loadingPlan !== plan.id ? { scale: 1.05 } : {}}
                  whileTap={loadingPlan !== plan.id ? { scale: 0.95 } : {}}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-4 font-semibold mb-6 transition-colors flex items-center justify-center gap-2 ${
                    loadingPlan !== null ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    borderRadius: 'var(--me-radius-card)',
                    background: plan.popular
                      ? 'var(--me-brand)'
                      : 'var(--me-bg-2)',
                    color: plan.popular
                      ? 'var(--me-on-brand)'
                      : 'var(--me-ink)',
                  }}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <div className='w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin' />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </MotionButton>

                <div className='space-y-3'>
                  {plan.features.map((feature, i) => (
                    <div key={i} className='flex items-start gap-3'>
                      <Check
                        className='w-5 h-5 flex-shrink-0 mt-0.5'
                        style={{ color: 'var(--me-brand)' }}
                      />
                      <span style={{ color: 'var(--me-ink-2)' }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                  {plan.notIncluded?.map((feature, i) => (
                    <div key={i} className='flex items-start gap-3 opacity-50'>
                      <X
                        className='w-5 h-5 flex-shrink-0 mt-0.5'
                        style={{ color: 'var(--me-ink-3)' }}
                      />
                      <span style={{ color: 'var(--me-ink-3)' }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Features Comparison */}
        {userType === 'contractor' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className='p-8 mb-16'
            style={{
              background: 'var(--me-surface)',
              borderRadius: 'var(--me-radius-card)',
              boxShadow: 'var(--me-shadow-card)',
              border: '1px solid var(--me-line)',
            }}
          >
            <h2
              className='text-2xl text-center mb-8'
              style={{
                color: 'var(--me-ink)',
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Platform Fee Comparison
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div
                className='text-center p-6'
                style={{
                  background: 'var(--me-bg-2)',
                  borderRadius: 'var(--me-radius-card)',
                }}
              >
                <p className='mb-2' style={{ color: 'var(--me-ink-2)' }}>
                  Basic Plan
                </p>
                <p
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-ink)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  15%
                </p>
                <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                  platform fee per job
                </p>
              </div>
              <div
                className='text-center p-6'
                style={{
                  background: 'var(--me-brand-soft)',
                  borderRadius: 'var(--me-radius-card)',
                  border: '2px solid var(--me-brand)',
                }}
              >
                <p
                  className='font-semibold mb-2'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Professional Plan
                </p>
                <p
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-brand)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  10%
                </p>
                <p className='text-sm' style={{ color: 'var(--me-brand-2)' }}>
                  Save 33% on fees
                </p>
              </div>
              <div
                className='text-center p-6'
                style={{
                  background: 'var(--me-brand-soft)',
                  borderRadius: 'var(--me-radius-card)',
                }}
              >
                <p
                  className='font-semibold mb-2'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Business Plan
                </p>
                <p
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-brand)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  7%
                </p>
                <p className='text-sm' style={{ color: 'var(--me-brand-2)' }}>
                  Save 53% on fees
                </p>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* FAQ Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='mb-16'
        >
          <div className='text-center mb-12'>
            <HelpCircle
              className='w-12 h-12 mx-auto mb-4'
              style={{ color: 'var(--me-brand)' }}
            />
            <h2
              className='text-3xl mb-4'
              style={{
                color: 'var(--me-ink)',
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Frequently Asked Questions
            </h2>
            <p
              className='max-w-2xl mx-auto'
              style={{ color: 'var(--me-ink-2)' }}
            >
              Have questions about our pricing? We've got answers.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto'>
            {faqs.map((faq, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className='p-6 transition-all'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                  border: '1px solid var(--me-line)',
                }}
              >
                <h3
                  className='font-bold mb-2'
                  style={{ color: 'var(--me-ink)' }}
                >
                  {faq.question}
                </h3>
                <p style={{ color: 'var(--me-ink-2)' }}>{faq.answer}</p>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>

        {/* CTA Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='p-12 text-center'
          style={{
            background:
              'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            borderRadius: 'var(--me-radius-card)',
            color: 'var(--me-on-brand)',
          }}
        >
          <Shield
            className='w-16 h-16 mx-auto mb-6'
            style={{ color: 'var(--me-brand-soft)' }}
          />
          <h2
            className='text-3xl mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Still have questions?
          </h2>
          <p
            className='text-xl mb-8 max-w-2xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Our team is here to help you find the perfect plan for your needs.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-8 py-4 font-semibold transition-shadow'
              style={{
                background: 'var(--me-surface)',
                color: 'var(--me-brand)',
                borderRadius: 'var(--me-radius-card)',
              }}
              onClick={() => router.push('/contact')}
            >
              Contact Sales
            </MotionButton>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-8 py-4 font-semibold transition-colors'
              style={{
                background: 'var(--me-brand-2)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-card)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}
              onClick={() => router.push('/help')}
            >
              View Documentation
            </MotionButton>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
