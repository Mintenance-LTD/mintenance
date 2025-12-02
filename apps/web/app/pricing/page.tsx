'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Star,
  Zap,
  Crown,
  Shield,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

// Animation variants
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

import type { LucideIcon } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  icon: LucideIcon;
  price: number;
  billingCycle: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
  cta: string;
  color: string;
}

export default function PricingPage2025() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [userType, setUserType] = useState<'homeowner' | 'contractor'>('homeowner');

  const homeownerPlans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      icon: Star,
      price: 0,
      billingCycle: 'forever',
      description: 'Perfect for occasional home maintenance needs',
      features: [
        'Post unlimited jobs',
        'Receive up to 5 bids per job',
        'Basic contractor profiles',
        'Standard messaging',
        'Payment protection',
        'Review system',
      ],
      notIncluded: [
        'Priority support',
        'AI-powered matching',
        'Advanced analytics',
      ],
      cta: 'Get Started Free',
      color: 'gray',
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Zap,
      price: isAnnual ? 99 : 9.99,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'For homeowners who want the best experience',
      features: [
        'Everything in Free',
        'Unlimited bids per job',
        'AI-powered contractor matching',
        'Priority support (24/7)',
        'Advanced contractor insights',
        'Price comparison tools',
        'Job scheduling assistant',
        'Exclusive deals & offers',
      ],
      popular: true,
      cta: 'Start Premium',
      color: 'teal',
    },
  ];

  const contractorPlans: PricingPlan[] = [
    {
      id: 'basic',
      name: 'Basic',
      icon: Star,
      price: 0,
      billingCycle: 'month',
      description: 'Get started and build your reputation',
      features: [
        'Create business profile',
        'Bid on 10 jobs per month',
        '15% platform fee',
        'Basic messaging',
        'Review collection',
        'Payment processing',
      ],
      notIncluded: [
        'Featured listing',
        'Advanced analytics',
        'Priority placement',
      ],
      cta: 'Start Free',
      color: 'gray',
    },
    {
      id: 'professional',
      name: 'Professional',
      icon: Zap,
      price: isAnnual ? 290 : 29,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'For growing contractor businesses',
      features: [
        'Everything in Basic',
        'Unlimited job bids',
        '10% platform fee (33% savings)',
        'Featured in search results',
        'Advanced analytics dashboard',
        'Priority support',
        'Lead recommendations',
        'Custom quote templates',
      ],
      popular: true,
      cta: 'Go Professional',
      color: 'teal',
    },
    {
      id: 'business',
      name: 'Business',
      icon: Crown,
      price: isAnnual ? 990 : 99,
      billingCycle: isAnnual ? 'year' : 'month',
      description: 'For established businesses and teams',
      features: [
        'Everything in Professional',
        '7% platform fee (53% savings)',
        'Top placement in search',
        'Team member accounts (up to 10)',
        'Dedicated account manager',
        'API access',
        'Custom branding',
        'White-label invoicing',
        'Advanced automation tools',
      ],
      cta: 'Contact Sales',
      color: 'purple',
    },
  ];

  const plans = userType === 'homeowner' ? homeownerPlans : contractorPlans;

  const faqs = [
    {
      question: 'Can I switch plans at any time?',
      answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.',
    },
    {
      question: 'Is there a free trial for premium plans?',
      answer: 'Yes, we offer a 14-day free trial for all premium plans. No credit card required to start.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, and bank transfers. Payments are processed securely through Stripe.',
    },
    {
      question: 'Are there any hidden fees?',
      answer: 'No hidden fees. The prices shown are all you pay. Contractors pay a percentage platform fee only when they win a job.',
    },
    {
      question: 'What if I need more than what\'s included?',
      answer: 'Contact our sales team for custom enterprise plans tailored to your specific needs.',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all annual plans if you\'re not satisfied.',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    toast.success(`Selected ${planId} plan!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              Simple, Transparent Pricing
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl text-teal-100 max-w-3xl mx-auto mb-8"
            >
              Choose the plan that works best for you. No hidden fees, cancel anytime.
            </MotionP>

            {/* User Type Toggle */}
            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="inline-flex bg-white/20 backdrop-blur-sm p-2 rounded-xl mb-8"
            >
              <button
                onClick={() => setUserType('homeowner')}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  userType === 'homeowner'
                    ? 'bg-white text-teal-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Homeowner
              </button>
              <button
                onClick={() => setUserType('contractor')}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  userType === 'contractor'
                    ? 'bg-white text-teal-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Contractor
              </button>
            </MotionDiv>

            {/* Annual/Monthly Toggle */}
            {userType === 'contractor' && (
              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-4"
              >
                <span className={`font-medium ${!isAnnual ? 'text-white' : 'text-teal-200'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setIsAnnual(!isAnnual)}
                  className="relative inline-flex h-8 w-16 items-center rounded-full bg-white/20"
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      isAnnual ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`font-medium ${isAnnual ? 'text-white' : 'text-teal-200'}`}>
                  Annual
                </span>
                {isAnnual && (
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Save 17%
                  </span>
                )}
              </MotionDiv>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <MotionDiv
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={`grid grid-cols-1 ${
            plans.length === 2 ? 'md:grid-cols-2 max-w-5xl mx-auto' : 'md:grid-cols-3'
          } gap-8 mb-16`}
        >
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <MotionDiv
                key={plan.id}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                  plan.popular
                    ? 'border-teal-500 shadow-teal-100'
                    : 'border-gray-200'
                } p-8 hover:shadow-xl transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex p-4 rounded-2xl mb-4 ${
                    plan.color === 'teal' ? 'bg-teal-100' :
                    plan.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      plan.color === 'teal' ? 'text-teal-600' :
                      plan.color === 'purple' ? 'text-purple-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-gray-900">
                      £{plan.price}
                    </span>
                    <span className="text-gray-600">/ {plan.billingCycle}</span>
                  </div>
                </div>

                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 rounded-xl font-semibold mb-6 transition-colors ${
                    plan.popular
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </MotionButton>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded?.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 opacity-50">
                      <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-500">{feature}</span>
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
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Platform Fee Comparison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-xl">
                <p className="text-gray-600 mb-2">Basic Plan</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">15%</p>
                <p className="text-sm text-gray-600">platform fee per job</p>
              </div>
              <div className="text-center p-6 bg-teal-50 rounded-xl border-2 border-teal-500">
                <p className="text-teal-600 font-semibold mb-2">Professional Plan</p>
                <p className="text-4xl font-bold text-teal-600 mb-2">10%</p>
                <p className="text-sm text-teal-700">Save 33% on fees</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <p className="text-purple-600 font-semibold mb-2">Business Plan</p>
                <p className="text-4xl font-bold text-purple-600 mb-2">7%</p>
                <p className="text-sm text-purple-700">Save 53% on fees</p>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* FAQ Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <HelpCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Have questions about our pricing? We've got answers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {faqs.map((faq, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <h3 className="font-bold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>

        {/* CTA Section */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-2xl p-12 text-center text-white"
        >
          <Shield className="w-16 h-16 mx-auto mb-6 text-teal-200" />
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Our team is here to help you find the perfect plan for your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold hover:shadow-lg transition-shadow"
            >
              Contact Sales
            </MotionButton>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-teal-700 text-white rounded-xl font-semibold hover:bg-teal-800 transition-colors border-2 border-white/30"
            >
              View Documentation
            </MotionButton>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
