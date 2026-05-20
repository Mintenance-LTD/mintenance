'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MotionDiv,
  MotionH1,
  MotionP,
  MotionButton,
} from '@/components/ui/MotionDiv';
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
  const [activeRole, setActiveRole] = useState<'homeowner' | 'contractor'>(
    'homeowner'
  );

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
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center'>
          <MotionH1
            variants={fadeIn}
            className='text-5xl md:text-6xl mb-6'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            How Mintenance Works
          </MotionH1>
          <MotionP
            variants={fadeIn}
            className='text-xl mb-8 max-w-3xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Connecting homeowners with trusted contractors has never been
            easier. Here's how we make home maintenance simple and stress-free.
          </MotionP>
          <MotionButton
            variants={fadeIn}
            onClick={() => router.push('/register')}
            className='px-8 py-4 transition-colors font-semibold text-lg'
            style={{
              background: 'var(--me-surface)',
              color: 'var(--me-brand)',
              borderRadius: 'var(--me-radius-btn)',
              boxShadow: 'var(--me-shadow-btn)',
            }}
          >
            Get Started Free
          </MotionButton>
        </div>
      </MotionDiv>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <MotionDiv
          initial='hidden'
          animate='visible'
          variants={fadeIn}
          className='flex justify-center mb-16'
        >
          <div
            className='inline-flex p-2'
            style={{
              background: 'var(--me-surface)',
              borderRadius: 'var(--me-radius-card)',
              boxShadow: 'var(--me-shadow-pop)',
              border: '1px solid var(--me-line)',
            }}
          >
            <button
              onClick={() => setActiveRole('homeowner')}
              className='px-8 py-3 font-semibold transition-all'
              style={{
                borderRadius: 'var(--me-radius-btn)',
                background:
                  activeRole === 'homeowner'
                    ? 'var(--me-brand)'
                    : 'transparent',
                color:
                  activeRole === 'homeowner'
                    ? 'var(--me-on-brand)'
                    : 'var(--me-ink-2)',
              }}
              aria-pressed={activeRole === 'homeowner'}
            >
              For Homeowners
            </button>
            <button
              onClick={() => setActiveRole('contractor')}
              className='px-8 py-3 font-semibold transition-all'
              style={{
                borderRadius: 'var(--me-radius-btn)',
                background:
                  activeRole === 'contractor'
                    ? 'var(--me-brand)'
                    : 'transparent',
                color:
                  activeRole === 'contractor'
                    ? 'var(--me-on-brand)'
                    : 'var(--me-ink-2)',
              }}
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
