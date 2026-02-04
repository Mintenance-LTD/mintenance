'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MotionDiv, MotionH1, MotionP, MotionButton } from '@/components/ui/MotionDiv';
import { HowItWorksSteps } from './HowItWorksSteps';
import { HowItWorksFeatures } from './HowItWorksFeatures';
import { HowItWorksFAQs } from './HowItWorksFAQs';
import { HowItWorksCTA } from './HowItWorksCTA';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorksClient() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<'homeowner' | 'contractor'>('homeowner');

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <MotionH1 variants={fadeIn} className="text-5xl md:text-6xl font-bold mb-6">
            How Mintenance Works
          </MotionH1>
          <MotionP variants={fadeIn} className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
            Connecting homeowners with trusted contractors has never been easier.
            Here's how we make home maintenance simple and stress-free.
          </MotionP>
          <MotionButton
            variants={fadeIn}
            onClick={() => router.push('/signup')}
            className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors font-semibold text-lg"
          >
            Get Started Free
          </MotionButton>
        </div>
      </MotionDiv>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="flex justify-center mb-16"
        >
          <div className="inline-flex bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              onClick={() => setActiveRole('homeowner')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'homeowner'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-pressed={activeRole === 'homeowner'}
            >
              For Homeowners
            </button>
            <button
              onClick={() => setActiveRole('contractor')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'contractor'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              aria-pressed={activeRole === 'contractor'}
            >
              For Contractors
            </button>
          </div>
        </MotionDiv>

        <HowItWorksSteps activeRole={activeRole} />
        <HowItWorksFeatures />
        <HowItWorksFAQs />
        <HowItWorksCTA />
      </div>
    </div>
  );
}
