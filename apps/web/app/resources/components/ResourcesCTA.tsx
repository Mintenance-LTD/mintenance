'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { Rocket, MessageCircle } from 'lucide-react';

/**
 * Call-to-action section for Resources page
 * Gradient background with two CTAs
 */
export function ResourcesCTA() {
  return (
    <section
      data-theme='mint-editorial'
      className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16'
      style={{ fontFamily: 'var(--me-font-body)' }}
    >
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='relative rounded-3xl p-12 text-center overflow-hidden'
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          color: 'var(--me-on-brand)',
        }}
      >
        {/* Decorative elements */}
        <div
          className='absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2'
          style={{ background: 'rgba(255, 255, 255, 0.10)' }}
        />
        <div
          className='absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2'
          style={{ background: 'rgba(255, 255, 255, 0.08)' }}
        />

        {/* Content */}
        <div className='relative z-10'>
          <Rocket
            className='w-16 h-16 mx-auto mb-6'
            style={{ color: 'var(--me-brand-soft)' }}
            aria-hidden='true'
          />
          <h2
            className='text-3xl md:text-4xl mb-4'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to Grow Your Business?
          </h2>
          <p
            className='text-xl mb-8 max-w-2xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Join thousands of successful contractors who are building thriving
            businesses on Mintenance
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-8 py-4 font-semibold rounded-xl transition-all duration-200'
              style={{
                background: 'var(--me-surface)',
                color: 'var(--me-brand)',
                borderRadius: 'var(--me-radius-btn)',
              }}
            >
              <Link
                href='/contractor/subscription'
                className='flex items-center justify-center gap-2'
              >
                <Rocket className='w-5 h-5' aria-hidden='true' />
                Upgrade Your Plan
              </Link>
            </MotionButton>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-8 py-4 font-semibold rounded-xl transition-all duration-200'
              style={{
                background: 'var(--me-brand-2)',
                color: 'var(--me-on-brand)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 'var(--me-radius-btn)',
              }}
            >
              <Link
                href='/help'
                className='flex items-center justify-center gap-2'
              >
                <MessageCircle className='w-5 h-5' aria-hidden='true' />
                Contact Support
              </Link>
            </MotionButton>
          </div>

          {/* Additional info */}
          <p className='text-sm mt-8' style={{ color: 'var(--me-brand-soft)' }}>
            Need help? Our support team is available 24/7 to answer your
            questions
          </p>
        </div>
      </MotionDiv>
    </section>
  );
}
