'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Download, Clock, BookOpen, TrendingUp, Target } from 'lucide-react';

/**
 * Featured resources section
 * Highlighted cards for most popular guides
 */
export function FeaturedResources() {
  const featuredGuides = [
    {
      title: 'Complete Your Profile',
      description:
        'A comprehensive guide to creating a winning contractor profile that attracts clients',
      readingTime: 8,
      category: 'Getting Started',
      downloadUrl: '#',
      icon: BookOpen,
      featured: true,
    },
    {
      title: 'Bidding Strategies That Win',
      description:
        'Learn how to write competitive quotes that stand out and convert at higher rates',
      readingTime: 12,
      category: 'Business Growth',
      downloadUrl: '#',
      icon: Target,
      featured: true,
    },
    {
      title: 'Pricing Your Services',
      description:
        'Market research and competitive pricing strategies to maximise your profit margins',
      readingTime: 10,
      category: 'Finance',
      downloadUrl: '#',
      icon: TrendingUp,
      featured: true,
    },
  ];

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
          Featured Resources
        </h2>
        <p
          className='text-xl max-w-3xl mx-auto'
          style={{ color: 'var(--me-ink-2)' }}
        >
          Our most popular guides to help you get started and succeed quickly
        </p>
      </MotionDiv>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {featuredGuides.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className='group p-8 transition-all duration-300'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              {/* Icon */}
              <div
                className='w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300'
                style={{
                  background:
                    'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                  borderRadius: 'var(--me-radius-card)',
                }}
              >
                <Icon
                  className='w-8 h-8'
                  style={{ color: 'var(--me-on-brand)' }}
                  aria-hidden='true'
                />
              </div>

              {/* Badge */}
              <div
                className='inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4'
                style={{
                  background: 'var(--me-warn-bg)',
                  color: 'var(--me-warn-fg)',
                }}
              >
                {guide.category}
              </div>

              {/* Title */}
              <h3
                className='text-2xl font-bold mb-3'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: 'var(--me-ink)',
                }}
              >
                {guide.title}
              </h3>

              {/* Description */}
              <p
                className='mb-6 leading-relaxed'
                style={{ color: 'var(--me-ink-2)' }}
              >
                {guide.description}
              </p>

              {/* Meta info */}
              <div
                className='flex items-center justify-between mb-6 text-sm'
                style={{ color: 'var(--me-ink-3)' }}
              >
                <div className='flex items-center gap-2'>
                  <Clock className='w-4 h-4' aria-hidden='true' />
                  <span>{guide.readingTime} min read</span>
                </div>
                <span
                  className='px-2 py-1 rounded-md text-xs font-medium'
                  style={{
                    background: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                  }}
                >
                  Featured
                </span>
              </div>

              {/* Download button */}
              <Link
                href={guide.downloadUrl}
                className='flex items-center justify-center gap-2 w-full px-6 py-3 font-semibold transform hover:-translate-y-0.5 transition-all duration-200'
                style={{
                  background: 'var(--me-brand)',
                  color: 'var(--me-on-brand)',
                  borderRadius: 'var(--me-radius-btn)',
                  boxShadow: 'var(--me-shadow-btn)',
                }}
              >
                <Download className='w-5 h-5' aria-hidden='true' />
                Download PDF
              </Link>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
