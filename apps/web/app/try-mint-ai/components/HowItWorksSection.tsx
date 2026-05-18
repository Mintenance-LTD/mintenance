'use client';

import React from 'react';
import { Camera, Cpu, FileText } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

export function HowItWorksSection() {
  const steps = [
    {
      icon: Camera,
      title: 'Upload Photos',
      description:
        'Take clear photos of the property damage from multiple angles. Upload 1-3 images for best results.',
    },
    {
      icon: Cpu,
      title: 'AI Analysis',
      description:
        'Our advanced computer vision AI analyzes the images, identifies damage types, and assesses severity levels.',
    },
    {
      icon: FileText,
      title: 'Get Results',
      description:
        'Receive instant cost estimates, severity ratings, and professional recommendations for repairs.',
    },
  ];

  return (
    <section
      id='how-it-works'
      aria-labelledby='how-it-works-heading'
      className='py-16 sm:py-24'
      style={{ background: 'var(--me-surface)' }}
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
            id='how-it-works-heading'
            className='text-3xl sm:text-4xl mb-4'
            style={{
              color: 'var(--me-ink)',
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            How It Works
          </h2>
          <p
            className='text-xl max-w-3xl mx-auto'
            style={{ color: 'var(--me-ink-2)' }}
          >
            Get professional property assessments in three simple steps
          </p>
        </MotionDiv>

        <MotionDiv
          variants={staggerContainer}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          className='grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12'
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <MotionDiv key={index} variants={fadeIn} className='relative'>
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div
                    className='hidden md:block absolute top-20 left-1/2 w-full h-0.5 z-0'
                    style={{ background: 'var(--me-line)' }}
                  />
                )}

                {/* Card */}
                <div
                  className='relative p-8 transition-shadow duration-300 h-full'
                  style={{
                    background: 'var(--me-surface)',
                    borderRadius: 'var(--me-radius-card)',
                    boxShadow: 'var(--me-shadow-card)',
                    border: '1px solid var(--me-line)',
                  }}
                >
                  {/* Step number */}
                  <div
                    className='absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg'
                    style={{
                      background:
                        'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                      color: 'var(--me-on-brand)',
                      boxShadow: 'var(--me-shadow-pop)',
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div
                    className='inline-flex items-center justify-center w-20 h-20 mb-6'
                    style={{
                      borderRadius: 'var(--me-radius-card)',
                      background: 'var(--me-brand-soft)',
                    }}
                  >
                    <div
                      className='w-12 h-12 flex items-center justify-center'
                      style={{
                        borderRadius: 'var(--me-radius-input)',
                        background: 'var(--me-brand)',
                      }}
                    >
                      <Icon
                        className='w-7 h-7'
                        style={{ color: 'var(--me-on-brand)' }}
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
                    {step.title}
                  </h3>
                  <p
                    className='leading-relaxed'
                    style={{ color: 'var(--me-ink-2)' }}
                  >
                    {step.description}
                  </p>
                </div>
              </MotionDiv>
            );
          })}
        </MotionDiv>

        {/* Example images */}
        <MotionDiv
          variants={fadeIn}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className='mt-16'
        >
          <div
            className='p-8 sm:p-12'
            style={{
              background: 'var(--me-brand-soft)',
              borderRadius: 'var(--me-radius-card)',
            }}
          >
            <h3
              className='text-2xl mb-6 text-center'
              style={{
                color: 'var(--me-ink)',
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              Example Photos for Best Results
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-6'>
              <div
                className='p-6'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                }}
              >
                <div
                  className='aspect-video mb-4 flex items-center justify-center'
                  style={{
                    background: 'var(--me-bg-3)',
                    borderRadius: 'var(--me-radius-input)',
                  }}
                >
                  <Camera
                    className='w-12 h-12'
                    style={{ color: 'var(--me-ink-3)' }}
                    aria-hidden='true'
                  />
                </div>
                <h4
                  className='font-semibold mb-2'
                  style={{ color: 'var(--me-ink)' }}
                >
                  Close-Up View
                </h4>
                <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                  Capture the damaged area clearly with good lighting
                </p>
              </div>
              <div
                className='p-6'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                }}
              >
                <div
                  className='aspect-video mb-4 flex items-center justify-center'
                  style={{
                    background: 'var(--me-bg-3)',
                    borderRadius: 'var(--me-radius-input)',
                  }}
                >
                  <Camera
                    className='w-12 h-12'
                    style={{ color: 'var(--me-ink-3)' }}
                    aria-hidden='true'
                  />
                </div>
                <h4
                  className='font-semibold mb-2'
                  style={{ color: 'var(--me-ink)' }}
                >
                  Wide Angle
                </h4>
                <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                  Show the context and surrounding area for reference
                </p>
              </div>
              <div
                className='p-6'
                style={{
                  background: 'var(--me-surface)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-card)',
                }}
              >
                <div
                  className='aspect-video mb-4 flex items-center justify-center'
                  style={{
                    background: 'var(--me-bg-3)',
                    borderRadius: 'var(--me-radius-input)',
                  }}
                >
                  <Camera
                    className='w-12 h-12'
                    style={{ color: 'var(--me-ink-3)' }}
                    aria-hidden='true'
                  />
                </div>
                <h4
                  className='font-semibold mb-2'
                  style={{ color: 'var(--me-ink)' }}
                >
                  Detail Shot
                </h4>
                <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                  Highlight specific cracks, stains, or deterioration
                </p>
              </div>
            </div>
            <p
              className='text-center mt-6'
              style={{ color: 'var(--me-ink-2)' }}
            >
              Pro tip: Take photos in good natural light for the most accurate
              analysis
            </p>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
