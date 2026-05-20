'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function CTASection() {
  return (
    <section
      aria-labelledby='cta-heading'
      className='relative overflow-hidden py-16 sm:py-24'
      style={{
        background:
          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
      }}
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
        <MotionDiv
          variants={fadeIn}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='text-center'
        >
          <h2
            id='cta-heading'
            className='text-3xl sm:text-4xl md:text-5xl mb-6'
            style={{
              color: 'var(--me-on-brand)',
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to Post a Full Job?
          </h2>
          <p
            className='text-xl sm:text-2xl mb-12 max-w-3xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Get detailed quotes from verified contractors in your area
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
            <Link href='/jobs/create'>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='inline-flex items-center gap-2 px-8 py-4 font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-4'
                style={{
                  background: 'var(--me-surface)',
                  color: 'var(--me-brand-2)',
                  borderRadius: 'var(--me-radius-card)',
                  boxShadow: 'var(--me-shadow-pop)',
                }}
              >
                Get Professional Assessment
                <ArrowRight className='w-5 h-5' aria-hidden='true' />
              </MotionButton>
            </Link>

            <Link href='/about'>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='inline-flex items-center gap-2 px-8 py-4 backdrop-blur-sm font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-4'
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--me-on-brand)',
                  borderRadius: 'var(--me-radius-card)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <BookOpen className='w-5 h-5' aria-hidden='true' />
                Learn More About Mint AI
              </MotionButton>
            </Link>
          </div>

          {/* Additional info */}
          <MotionDiv
            variants={fadeIn}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto'
          >
            <div
              className='backdrop-blur-sm p-6'
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                className='text-3xl font-bold mb-2'
                style={{ color: 'var(--me-on-brand)' }}
              >
                Free
              </div>
              <div style={{ color: 'var(--me-brand-soft)' }}>
                No cost to post jobs and get quotes
              </div>
            </div>
            <div
              className='backdrop-blur-sm p-6'
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                className='text-3xl font-bold mb-2'
                style={{ color: 'var(--me-on-brand)' }}
              >
                Verified
              </div>
              <div style={{ color: 'var(--me-brand-soft)' }}>
                Every tradesperson is ID &amp; insurance checked
              </div>
            </div>
            <div
              className='backdrop-blur-sm p-6'
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div
                className='text-3xl font-bold mb-2'
                style={{ color: 'var(--me-on-brand)' }}
              >
                24/7
              </div>
              <div style={{ color: 'var(--me-brand-soft)' }}>
                Post jobs anytime, anywhere
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      </div>
    </section>
  );
}
