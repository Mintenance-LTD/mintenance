'use client';

import { useRouter } from 'next/navigation';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorksCTA() {
  const router = useRouter();

  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='p-12 text-center'
      style={{
        background:
          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
        borderRadius: 'var(--me-radius-card)',
        boxShadow: 'var(--me-shadow-pop)',
        color: 'var(--me-on-brand)',
      }}
    >
      <h2
        className='text-3xl mb-4'
        style={{
          fontFamily: 'var(--me-font-display)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
        }}
      >
        Ready to Get Started?
      </h2>
      <p className='text-xl mb-8' style={{ color: 'var(--me-brand-soft)' }}>
        Join thousands of homeowners and contractors using Mintenance
      </p>
      {/* Audit follow-up (2026-04-29): the marketing CTA used
          to push to `/signup` which doesn't exist as a route. The
          canonical signup flow is `/register` with a `?role=…`
          query the page reads to pre-select the right tab. */}
      <div className='flex flex-col sm:flex-row gap-4 justify-center'>
        <button
          onClick={() => router.push('/register?role=homeowner')}
          className='px-8 py-4 transition-colors font-semibold text-lg'
          style={{
            background: 'var(--me-surface)',
            color: 'var(--me-brand)',
            borderRadius: 'var(--me-radius-btn)',
            boxShadow: 'var(--me-shadow-btn)',
          }}
        >
          Post a Job
        </button>
        <button
          onClick={() => router.push('/register?role=contractor')}
          className='px-8 py-4 transition-colors font-semibold text-lg'
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid var(--me-on-brand)',
            color: 'var(--me-on-brand)',
            borderRadius: 'var(--me-radius-btn)',
          }}
        >
          Become a Contractor
        </button>
      </div>
    </MotionDiv>
  );
}
