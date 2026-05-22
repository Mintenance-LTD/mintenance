'use client';

import { Shield, CheckCircle, MessageCircle, Zap } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const features = [
  {
    title: 'Secure Payments',
    description: 'Protected Payment ensures fair handling for both parties',
    icon: Shield,
  },
  {
    title: 'Reviewed at onboarding',
    description:
      'Each contractor’s business details, licences and insurance are reviewed by our team before they can bid',
    icon: CheckCircle,
  },
  {
    title: 'Real-time Chat',
    description: 'Communicate instantly with contractors or homeowners',
    icon: MessageCircle,
  },
  {
    title: 'AI Matching',
    description: 'Smart algorithms connect the right people for every job',
    icon: Zap,
  },
];

export function HowItWorksFeatures() {
  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='p-12 mb-20'
      style={{
        background: 'var(--me-surface)',
        borderRadius: 'var(--me-radius-card)',
        boxShadow: 'var(--me-shadow-pop)',
        border: '1px solid var(--me-line)',
      }}
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
        Why Choose Mintenance?
      </h2>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <MotionDiv
              key={index}
              variants={staggerItem}
              className='text-center'
            >
              <div className='flex justify-center mb-4'>
                <div
                  className='p-4'
                  style={{
                    background: 'var(--me-brand-soft)',
                    borderRadius: 'var(--me-radius-card)',
                  }}
                >
                  <Icon
                    className='w-8 h-8'
                    style={{ color: 'var(--me-brand)' }}
                    aria-hidden='true'
                  />
                </div>
              </div>
              <h3
                className='text-lg font-semibold mb-2'
                style={{ color: 'var(--me-ink)' }}
              >
                {feature.title}
              </h3>
              <p style={{ color: 'var(--me-ink-2)' }}>{feature.description}</p>
            </MotionDiv>
          );
        })}
      </div>
    </MotionDiv>
  );
}
