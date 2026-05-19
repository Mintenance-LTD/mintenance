'use client';

import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  Zap,
  Camera,
  Star,
  FileText,
  Image,
  MessageSquare,
  Clock,
  Award,
} from 'lucide-react';

/**
 * Quick actionable tips in grid layout
 * Professional card design with icons
 */
export function QuickTipsSection() {
  const tips = [
    {
      icon: Clock,
      title: 'Respond Quickly',
      description:
        'Fast responses help you win more jobs. Set up notifications to never miss an opportunity.',
    },
    {
      icon: Image,
      title: 'Build Your Portfolio',
      description:
        'Quality portfolio images build trust and help your profile stand out to homeowners.',
    },
    {
      icon: Star,
      title: 'Earn Strong Reviews',
      description:
        'Consistently good ratings help you stand out and rank higher in search results.',
    },
    {
      icon: Award,
      title: 'Complete Your Profile',
      description:
        'Full profiles with certifications help you win more job offers than incomplete ones.',
    },
    {
      icon: Camera,
      title: 'Use Professional Photos',
      description:
        'Quality before/after photos showcase your work and support your pricing.',
    },
    {
      icon: FileText,
      title: 'Write Detailed Quotes',
      description:
        'Itemized quotes with clear explanations win more often than vague estimates.',
    },
    {
      icon: MessageSquare,
      title: 'Communicate Proactively',
      description:
        'Regular updates and clear communication lead to better reviews and repeat business.',
    },
    {
      icon: Zap,
      title: 'Set Competitive Prices',
      description:
        'Use our pricing suggestions to stay competitive while maintaining healthy profit margins.',
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
          Quick Success Tips
        </h2>
        <p
          className='text-xl max-w-3xl mx-auto'
          style={{ color: 'var(--me-ink-2)' }}
        >
          Actionable advice you can implement today to improve your results
          immediately
        </p>
      </MotionDiv>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <MotionDiv
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className='p-6 transition-all duration-300'
              style={{
                background: 'var(--me-surface)',
                borderRadius: 'var(--me-radius-card)',
                border: '1px solid var(--me-line)',
                boxShadow: 'var(--me-shadow-card)',
              }}
            >
              {/* Icon */}
              <div
                className='w-12 h-12 flex items-center justify-center mb-4'
                style={{
                  background: 'var(--me-brand-soft)',
                  borderRadius: 'var(--me-radius-input)',
                }}
              >
                <Icon
                  className='w-6 h-6'
                  style={{ color: 'var(--me-brand)' }}
                  aria-hidden='true'
                />
              </div>

              {/* Title */}
              <h3
                className='text-lg font-bold mb-2'
                style={{ color: 'var(--me-ink)' }}
              >
                {tip.title}
              </h3>

              {/* Description */}
              <p
                className='text-sm leading-relaxed'
                style={{ color: 'var(--me-ink-2)' }}
              >
                {tip.description}
              </p>
            </MotionDiv>
          );
        })}
      </div>
    </section>
  );
}
