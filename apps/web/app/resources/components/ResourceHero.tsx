'use client';

import React from 'react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';
import { GraduationCap, TrendingUp, Star } from 'lucide-react';

/**
 * Hero section for Resources page
 * Features gradient background with animated stats
 */
export function ResourceHero() {
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

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const heroHighlights = [
    {
      icon: GraduationCap,
      title: 'Step-by-step guides',
      text: 'From your first job to scaling up your business',
    },
    {
      icon: TrendingUp,
      title: 'Practical growth tips',
      text: 'Win more work and price your jobs with confidence',
    },
    {
      icon: Star,
      title: 'Proven best practices',
      text: 'What highly-rated tradespeople do differently',
    },
  ];

  return (
    <MotionDiv
      data-theme='mint-editorial'
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      style={{
        background:
          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
        color: 'var(--me-on-brand)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        <div className='text-center'>
          <MotionH1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='text-5xl md:text-6xl mb-6'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Contractor Resources &amp; Growth Tools
          </MotionH1>
          <MotionP
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='text-xl md:text-2xl max-w-3xl mx-auto'
            style={{ color: 'var(--me-brand-soft)' }}
          >
            Everything you need to succeed on the Mintenance platform and grow
            your contracting business
          </MotionP>
        </div>

        {/* Highlights Grid */}
        <MotionDiv
          variants={staggerContainer}
          initial='hidden'
          animate='visible'
          className='grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16'
        >
          {heroHighlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <MotionDiv
                key={index}
                variants={staggerItem}
                className='backdrop-blur-sm p-6 text-center transition-colors duration-300'
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  borderRadius: 'var(--me-radius-card)',
                }}
              >
                <Icon
                  className='w-8 h-8 mx-auto mb-3'
                  style={{ color: 'var(--me-brand-soft)' }}
                  aria-hidden='true'
                />
                <p className='text-lg font-bold mb-1'>{item.title}</p>
                <p
                  className='text-sm'
                  style={{ color: 'var(--me-brand-soft)' }}
                >
                  {item.text}
                </p>
              </MotionDiv>
            );
          })}
        </MotionDiv>
      </div>
    </MotionDiv>
  );
}
