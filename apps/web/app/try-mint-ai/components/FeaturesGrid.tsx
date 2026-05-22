'use client';

import React from 'react';
import {
  Zap,
  TrendingUp,
  ShieldCheck,
  Layers,
  Gauge,
  RefreshCcw,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

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

export function FeaturesGrid() {
  const features = [
    {
      icon: Zap,
      title: 'Instant Analysis',
      description:
        'Get AI-powered assessment results in seconds, not days. No waiting for quotes.',
    },
    {
      icon: TrendingUp,
      title: 'Cost Estimates',
      description:
        'Accurate repair cost ranges based on UK property data and current market rates.',
    },
    {
      icon: ShieldCheck,
      title: 'Expert Validation',
      description:
        'AI-powered assessment using image recognition and UK property data. Final quotes still come from real tradespeople on the platform.',
    },
    {
      icon: Layers,
      title: 'Multiple Damage Types',
      description:
        'Identifies roofs, walls, foundations, plumbing, electrical, and structural issues.',
    },
    {
      icon: Gauge,
      title: 'Confidence Scores',
      description:
        'Transparent AI predictions with confidence levels so you know what to trust.',
    },
    {
      icon: RefreshCcw,
      title: 'Continuous Learning',
      description:
        'Your feedback helps improve the AI, making it more accurate with every assessment.',
    },
  ];

  return (
    <section
      aria-labelledby='features-heading'
      className='py-16 sm:py-24'
      style={{ background: 'var(--me-bg-2)' }}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <MotionDiv
          variants={fadeIn}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='text-center mb-16'
        >
          <h2
            id='features-heading'
            className='text-3xl sm:text-4xl mb-4'
            style={{
              color: 'var(--me-ink)',
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Why Choose Mint AI?
          </h2>
          <p
            className='text-xl max-w-3xl mx-auto'
            style={{ color: 'var(--me-ink-2)' }}
          >
            Powered by cutting-edge technology and real-world expertise
          </p>
        </MotionDiv>

        <MotionDiv
          variants={staggerContainer}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <MotionDiv key={index} variants={fadeIn} className='group'>
                <div
                  className='p-8 transition-all duration-300 transform hover:-translate-y-1 h-full'
                  style={{
                    background: 'var(--me-surface)',
                    borderRadius: 'var(--me-radius-card)',
                    boxShadow: 'var(--me-shadow-card)',
                    border: '1px solid var(--me-line)',
                  }}
                >
                  {/* Icon */}
                  <div className='mb-6'>
                    <div
                      className='inline-flex items-center justify-center w-16 h-16 transform group-hover:scale-110 transition-transform duration-300'
                      style={{
                        borderRadius: 'var(--me-radius-input)',
                        background: 'var(--me-brand-soft)',
                      }}
                    >
                      <Icon
                        className='w-8 h-8'
                        style={{ color: 'var(--me-brand)' }}
                        aria-hidden='true'
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <h3
                    className='text-xl mb-3'
                    style={{
                      color: 'var(--me-ink)',
                      fontFamily: 'var(--me-font-display)',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className='leading-relaxed'
                    style={{ color: 'var(--me-ink-2)' }}
                  >
                    {feature.description}
                  </p>
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Trust indicators */}
        <MotionDiv
          variants={fadeIn}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className='mt-16 text-center'
        >
          <div
            className='p-8 sm:p-12'
            style={{
              background: 'var(--me-surface)',
              borderRadius: 'var(--me-radius-card)',
              boxShadow: 'var(--me-shadow-pop)',
              border: '2px solid var(--me-brand-soft)',
            }}
          >
            <div
              className='grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x'
              style={{ borderColor: 'var(--me-line)' }}
            >
              <div className='pt-8 sm:pt-0'>
                <div
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-brand)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  3-Model
                </div>
                <div
                  className='font-medium'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  AI Fusion Pipeline
                </div>
              </div>
              <div className='pt-8 sm:pt-0'>
                <div
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-brand)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  Beta
                </div>
                <div
                  className='font-medium'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Accuracy Improving Daily
                </div>
              </div>
              <div className='pt-8 sm:pt-0'>
                <div
                  className='text-4xl mb-2'
                  style={{
                    color: 'var(--me-brand)',
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                  }}
                >
                  &lt;5s
                </div>
                <div
                  className='font-medium'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  Average Analysis Time
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Technical details */}
        <MotionDiv
          variants={fadeIn}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className='mt-12'
        >
          <div
            className='p-8 sm:p-12'
            style={{
              background:
                'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
              borderRadius: 'var(--me-radius-card)',
              color: 'var(--me-on-brand)',
            }}
          >
            <h3
              className='text-2xl mb-6 text-center'
              style={{
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              Powered by Advanced AI Technology
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
              <div className='flex items-start gap-4'>
                <div
                  className='w-2 h-2 rounded-full mt-2 flex-shrink-0'
                  style={{ background: 'var(--me-warm)' }}
                />
                <div>
                  <h4 className='font-semibold mb-1'>GPT-4 Vision</h4>
                  <p
                    className='text-sm'
                    style={{ color: 'var(--me-brand-soft)' }}
                  >
                    State-of-the-art image understanding and analysis
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-4'>
                <div
                  className='w-2 h-2 rounded-full mt-2 flex-shrink-0'
                  style={{ background: 'var(--me-warm)' }}
                />
                <div>
                  <h4 className='font-semibold mb-1'>Computer Vision</h4>
                  <p
                    className='text-sm'
                    style={{ color: 'var(--me-brand-soft)' }}
                  >
                    Advanced pattern recognition and defect detection
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-4'>
                <div
                  className='w-2 h-2 rounded-full mt-2 flex-shrink-0'
                  style={{ background: 'var(--me-warm)' }}
                />
                <div>
                  <h4 className='font-semibold mb-1'>Machine Learning</h4>
                  <p
                    className='text-sm'
                    style={{ color: 'var(--me-brand-soft)' }}
                  >
                    Continuously trained on verified assessments
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-4'>
                <div
                  className='w-2 h-2 rounded-full mt-2 flex-shrink-0'
                  style={{ background: 'var(--me-warm)' }}
                />
                <div>
                  <h4 className='font-semibold mb-1'>UK Property Data</h4>
                  <p
                    className='text-sm'
                    style={{ color: 'var(--me-brand-soft)' }}
                  >
                    Cost estimates based on local market rates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
