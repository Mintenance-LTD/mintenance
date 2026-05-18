'use client';

import { useRouter } from 'next/navigation';
import { HelpCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const faqs = [
  {
    question: 'How much does it cost to use Mintenance?',
    answer:
      'Homeowners can post jobs for free. Contractors pay a small service fee only when they win a job. No monthly subscriptions required.',
  },
  {
    question: 'How long does it take to get quotes?',
    answer:
      'Most jobs receive their first quote within 24 hours. Popular job types often get multiple quotes within a few hours.',
  },
  {
    question: 'Are contractors insured and verified?',
    answer:
      'Yes, all contractors on our platform are required to provide proof of insurance and relevant certifications. We verify credentials before approval.',
  },
  {
    question: "What if I'm not satisfied with the work?",
    answer:
      'Our escrow system protects you. Payment is only released when you approve the completed work. We also offer dispute resolution support.',
  },
];

export function HowItWorksFAQs() {
  const router = useRouter();

  return (
    <>
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        className='p-12 mb-20 text-center'
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
          See It In Action
        </h2>
        <p className='text-xl mb-8' style={{ color: 'var(--me-brand-soft)' }}>
          Watch how Mintenance simplifies your home maintenance journey
        </p>
        <button
          className='inline-flex items-center gap-3 px-8 py-4 transition-colors font-semibold text-lg'
          style={{
            background: 'var(--me-surface)',
            color: 'var(--me-brand)',
            borderRadius: 'var(--me-radius-btn)',
            boxShadow: 'var(--me-shadow-btn)',
          }}
        >
          <PlayCircle className='w-6 h-6' aria-hidden='true' />
          Watch Demo Video
        </button>
      </MotionDiv>

      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        className='mb-20'
      >
        <h2
          className='text-3xl text-center mb-12'
          style={{
            color: 'var(--me-ink)',
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          Frequently Asked Questions
        </h2>

        <div className='max-w-3xl mx-auto space-y-4'>
          {faqs.map((faq, index) => (
            <MotionDiv
              key={index}
              variants={staggerItem}
              className='p-6'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                boxShadow: 'var(--me-shadow-card)',
                border: '1px solid var(--me-line)',
              }}
            >
              <div className='flex items-start gap-4'>
                <div
                  className='p-2 flex-shrink-0'
                  style={{
                    background: 'var(--me-brand-soft)',
                    borderRadius: 'var(--me-radius-input)',
                  }}
                >
                  <HelpCircle
                    className='w-6 h-6'
                    style={{ color: 'var(--me-brand)' }}
                    aria-hidden='true'
                  />
                </div>
                <div>
                  <h3
                    className='text-lg font-semibold mb-2'
                    style={{ color: 'var(--me-ink)' }}
                  >
                    {faq.question}
                  </h3>
                  <p style={{ color: 'var(--me-ink-2)' }}>{faq.answer}</p>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>

        <div className='text-center mt-8'>
          <button
            onClick={() => router.push('/help')}
            className='inline-flex items-center gap-2 font-semibold'
            style={{ color: 'var(--me-brand)' }}
          >
            View All FAQs
            <ArrowRight className='w-5 h-5' />
          </button>
        </div>
      </MotionDiv>
    </>
  );
}
