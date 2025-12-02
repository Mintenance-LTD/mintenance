'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, CheckCircle, User, Briefcase, CreditCard } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const homeownerSteps = [
  {
    number: 1,
    icon: FileText,
    title: 'Post Your Job',
    description: 'Describe what you need in under 2 minutes. Upload photos for instant AI assessment.',
    color: 'from-[#0066CC] to-[#0052A3]',
  },
  {
    number: 2,
    icon: Search,
    title: 'Review Matches',
    description: 'Get AI-matched with verified contractors. Browse profiles, reviews, and quotes.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    number: 3,
    icon: CheckCircle,
    title: 'Hire with Confidence',
    description: 'Secure payments with escrow protection. Track progress and release payment when satisfied.',
    color: 'from-emerald-500 to-teal-500',
  },
];

const contractorSteps = [
  {
    number: 1,
    icon: User,
    title: 'Create Your Profile',
    description: 'Showcase your skills and portfolio. Get verified with background checks and credentials.',
    color: 'from-[#10B981] to-emerald-600',
  },
  {
    number: 2,
    icon: Briefcase,
    title: 'Find Quality Leads',
    description: 'Bid on jobs that match your expertise. AI filters ensure serious buyers only.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    number: 3,
    icon: CreditCard,
    title: 'Get Paid Securely',
    description: 'Escrow protection for completed work. Fast payouts with no hidden fees.',
    color: 'from-emerald-500 to-teal-500',
  },
];

export function HowItWorksSection2025() {
  const [activeTab, setActiveTab] = useState<'homeowner' | 'contractor'>('homeowner');
  const prefersReducedMotion = useReducedMotion();

  const steps = activeTab === 'homeowner' ? homeownerSteps : contractorSteps;

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
          whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Get started in minutes with our simple three-step process
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setActiveTab('homeowner')}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'homeowner'
                  ? 'bg-white text-[#0066CC] shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Homeowners
            </button>
            <button
              onClick={() => setActiveTab('contractor')}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'contractor'
                  ? 'bg-white text-[#10B981] shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Contractors
            </button>
          </div>
        </motion.div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : undefined}
            animate={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
            exit={!prefersReducedMotion ? { opacity: 0, y: -20 } : undefined}
            transition={{ duration: 0.4 }}
          >
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function StepCard({
  step,
  index,
  isLast,
  prefersReducedMotion,
}: {
  step: typeof homeownerSteps[0];
  index: number;
  isLast: boolean;
  prefersReducedMotion: boolean;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      className="relative"
      initial={!prefersReducedMotion ? { opacity: 0, y: 30 } : undefined}
      whileInView={!prefersReducedMotion ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      {/* Connecting Line */}
      {!isLast && (
        <div className="hidden md:block absolute top-20 left-full w-full h-0.5 -z-10">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-[#0066CC]/20 to-[#0066CC]/10" />
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${step.color}`}
              initial={{ scaleX: 0, originX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.2 }}
            />
          </div>
        </div>
      )}

      <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
        {/* Step Number Badge */}
        <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-[#0066CC] to-[#0052A3] text-white font-bold text-xl flex items-center justify-center shadow-lg">
          {step.number}
        </div>

        {/* Icon */}
        <div className="mb-6 mt-4">
          <div
            className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${step.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
        <p className="text-gray-600 leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
}
