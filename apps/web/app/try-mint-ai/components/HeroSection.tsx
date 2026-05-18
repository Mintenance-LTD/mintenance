'use client';

import React from 'react';
import { Cpu, Shield } from 'lucide-react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export function HeroSection() {
  return (
    <section
      className='relative overflow-hidden py-24 sm:py-32'
      style={{
        background:
          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
      }}
      aria-labelledby='hero-heading'
    >
      {/* Decorative background pattern */}
      <div className='absolute inset-0 opacity-10'>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center'>
          {/* AI Icon with gradient border */}
          <MotionDiv
            variants={scaleIn}
            initial='hidden'
            animate='visible'
            transition={{ duration: 0.5 }}
            className='inline-flex items-center justify-center mb-8'
          >
            <div className='relative'>
              <div
                className='absolute inset-0 blur-xl opacity-50'
                style={{
                  background: 'var(--me-warm)',
                  borderRadius: 'var(--me-radius-card)',
                }}
              />
              <div
                className='relative backdrop-blur-sm p-6'
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--me-radius-card)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <Cpu
                  className='w-16 h-16'
                  style={{ color: 'var(--me-warm)' }}
                  aria-hidden='true'
                />
              </div>
            </div>
          </MotionDiv>

          {/* Heading */}
          <MotionH1
            id='hero-heading'
            variants={fadeIn}
            initial='hidden'
            animate='visible'
            transition={{ duration: 0.5, delay: 0.1 }}
            className='text-4xl sm:text-5xl md:text-6xl mb-6'
            style={{
              color: 'var(--me-on-brand)',
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Try Mint AI Assessment
          </MotionH1>

          {/* Subheading */}
          <MotionP
            variants={fadeIn}
            initial='hidden'
            animate='visible'
            transition={{ duration: 0.5, delay: 0.2 }}
            className='text-xl sm:text-2xl mb-8 max-w-3xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Upload photos of property damage and get instant AI-powered cost
            estimates
          </MotionP>

          {/* Trust badge */}
          <MotionDiv
            variants={fadeIn}
            initial='hidden'
            animate='visible'
            transition={{ duration: 0.5, delay: 0.3 }}
            className='inline-flex items-center gap-2 backdrop-blur-sm rounded-full px-6 py-3'
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Shield
              className='w-5 h-5'
              style={{ color: 'var(--me-brand-soft)' }}
              aria-hidden='true'
            />
            <span
              className='font-medium'
              style={{ color: 'var(--me-on-brand)' }}
            >
              Powered by Advanced Computer Vision
            </span>
          </MotionDiv>

          {/* Skip to upload link for accessibility */}
          <div className='mt-8'>
            <a
              href='#upload-section'
              className='underline focus:outline-none focus:ring-2 rounded'
              style={{ color: 'var(--me-brand-soft)' }}
            >
              Skip to upload
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
