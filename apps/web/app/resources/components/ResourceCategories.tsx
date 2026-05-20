'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  BookOpen,
  TrendingUp,
  Megaphone,
  CheckCircle,
  Award,
  Video,
  ArrowRight,
} from 'lucide-react';

/**
 * Resource categories in Bento Grid layout
 * Professional card design with hover animations
 */
export function ResourceCategories() {
  const categories = [
    {
      icon: BookOpen,
      title: 'Getting Started Guide',
      description:
        'Complete onboarding for new contractors. Learn the platform basics and win your first job.',
      href: '#getting-started',
    },
    {
      icon: TrendingUp,
      title: 'Growing Your Business',
      description:
        'Strategies to scale your contracting business and increase revenue on Mintenance.',
      href: '#growth',
    },
    {
      icon: Megaphone,
      title: 'Marketing &amp; Promotion',
      description:
        'Stand out from the competition and attract more clients with effective marketing.',
      href: '#marketing',
    },
    {
      icon: CheckCircle,
      title: 'Platform Best Practices',
      description:
        'Insider tips to maximise your success rate and become a featured contractor.',
      href: '#best-practices',
    },
    {
      icon: Award,
      title: 'Success Stories',
      description:
        'Learn from top-performing contractors who have built thriving businesses.',
      href: '#success-stories',
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description:
        'Step-by-step video guides covering everything from profile setup to advanced features.',
      href: '#videos',
    },
  ];

  const brandGradient =
    'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)';

  return (
    <section
      data-theme='mint-editorial'
      className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'
      style={{ fontFamily: 'var(--me-font-body)' }}
    >
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className='text-center mb-12'
      >
        <h2
          className='text-3xl md:text-4xl mb-4'
          style={{
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--me-ink)',
          }}
        >
          Explore Resource Categories
        </h2>
        <p
          className='text-xl max-w-3xl mx-auto'
          style={{ color: 'var(--me-ink-2)' }}
        >
          Browse our comprehensive library of guides, tips, and tutorials
          designed to help you succeed
        </p>
      </MotionDiv>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className='group relative overflow-hidden transition-all duration-300'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              <div
                className='relative p-8'
                style={{ background: 'var(--me-surface)' }}
              >
                {/* Icon with brand background */}
                <div
                  className='w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'
                  style={{
                    background: brandGradient,
                    borderRadius: 'var(--me-radius-card)',
                  }}
                >
                  <Icon
                    className='w-8 h-8'
                    style={{ color: 'var(--me-on-brand)' }}
                    aria-hidden='true'
                  />
                </div>

                {/* Content */}
                <h3
                  className='text-xl font-bold mb-3'
                  style={{ color: 'var(--me-ink)' }}
                >
                  {category.title}
                </h3>
                <p
                  className='mb-6 leading-relaxed'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  {category.description}
                </p>

                {/* Link */}
                <Link
                  href={category.href}
                  className='inline-flex items-center font-semibold group-hover:gap-3 transition-all duration-300'
                  style={{ color: 'var(--me-brand)' }}
                >
                  Explore
                  <ArrowRight
                    className='w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform'
                    aria-hidden='true'
                  />
                </Link>
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
