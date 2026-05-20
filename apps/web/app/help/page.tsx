'use client';

import React from 'react';
import {
  fadeIn,
  staggerContainer,
  staggerItem,
  cardHover,
} from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import {
  Rocket,
  FileEdit,
  Search,
  CreditCard,
  MessageCircle,
  Shield,
  Settings,
  Banknote,
  Hammer,
} from 'lucide-react';
interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  views?: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  articleCount: number;
}

const HELP_ICON_MAP: Record<string, React.ReactNode> = {
  rocket: <Rocket size={32} />,
  'file-edit': <FileEdit size={32} />,
  search: <Search size={32} />,
  'credit-card': <CreditCard size={32} />,
  'message-circle': <MessageCircle size={32} />,
  shield: <Shield size={32} />,
  settings: <Settings size={32} />,
  banknote: <Banknote size={32} />,
  hammer: <Hammer size={32} />,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  borderRadius: 'var(--me-radius-card)',
  border: '1px solid var(--me-line)',
  boxShadow: 'var(--me-shadow-card)',
};

const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--me-font-display)',
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color: 'var(--me-ink)',
};

export default function HelpCentrePage() {
  const categories: Category[] = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: 'rocket',
      articleCount: 12,
    },
    {
      id: 'posting-jobs',
      name: 'Posting Jobs',
      icon: 'file-edit',
      articleCount: 18,
    },
    {
      id: 'finding-contractors',
      name: 'Finding Contractors',
      icon: 'search',
      articleCount: 15,
    },
    {
      id: 'payments',
      name: 'Payments & Billing',
      icon: 'credit-card',
      articleCount: 10,
    },
    {
      id: 'messaging',
      name: 'Messaging',
      icon: 'message-circle',
      articleCount: 8,
    },
    {
      id: 'security',
      name: 'Security & Privacy',
      icon: 'shield',
      articleCount: 14,
    },
  ];

  const popularArticles: Article[] = [
    {
      id: '1',
      title: 'How to post your first job',
      description: 'Step-by-step guide to creating and posting a job listing',
      category: 'Getting Started',
    },
    {
      id: '2',
      title: 'How to choose the right contractor',
      description:
        'Tips for evaluating contractor profiles and selecting the best match',
      category: 'Finding Contractors',
    },
    {
      id: '3',
      title: 'Understanding escrow payments',
      description: 'Learn how our secure payment system protects your funds',
      category: 'Payments & Billing',
    },
    {
      id: '4',
      title: 'Managing job milestones',
      description: 'How to set up and track project milestones',
      category: 'Posting Jobs',
    },
  ];

  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{ background: 'var(--me-bg)', fontFamily: 'var(--me-font-body)' }}
    >
      <LandingNavigation />

      <main id='main-content' tabIndex={-1}>
        {/* Hero Section */}
        <MotionDiv
          style={{
            background:
              'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            color: 'var(--me-on-brand)',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className='max-w-[1600px] mx-auto px-8 py-16 text-center'>
            <div
              className='flex w-20 h-20 rounded-2xl items-center justify-center mx-auto mb-6'
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <svg
                className='w-12 h-12'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <h1
              className='text-5xl mb-4'
              style={{
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              How can we help you?
            </h1>
            <p
              className='text-xl mb-8'
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              Search our knowledge base or browse categories below
            </p>

            {/* Search Bar */}
            <div
              className='max-w-2xl mx-auto rounded-2xl p-2'
              style={{
                background: 'var(--me-surface)',
                boxShadow: 'var(--me-shadow-pop)',
              }}
            >
              <div className='relative'>
                <label htmlFor='help-search' className='sr-only'>
                  Search help articles
                </label>
                <input
                  id='help-search'
                  type='text'
                  role='searchbox'
                  placeholder='Search for help...'
                  aria-label='Search help articles'
                  className='w-full px-6 py-4 focus:outline-none'
                  style={{
                    borderRadius: 'var(--me-radius-input)',
                    color: 'var(--me-ink)',
                    background: 'var(--me-surface)',
                  }}
                />
                <svg
                  className='absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6'
                  style={{ color: 'var(--me-ink-3)' }}
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                  />
                </svg>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className='max-w-[1600px] mx-auto px-8 py-12'>
          {/* Categories Grid */}
          <div className='mb-16'>
            <h2 className='text-3xl mb-8 text-center' style={sectionHeading}>
              Browse by Category
            </h2>
            <MotionDiv
              className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              {categories.map((category) => (
                <MotionDiv
                  key={category.id}
                  variants={cardHover}
                  whileHover='hover'
                  whileTap='tap'
                >
                  <Link
                    href={`/faq#${category.id}`}
                    className='block p-8 transition-all group focus:outline-none'
                    style={cardStyle}
                  >
                    <div
                      className='mb-4'
                      style={{ color: 'var(--me-brand)' }}
                      aria-hidden='true'
                    >
                      {HELP_ICON_MAP[category.icon] || category.icon}
                    </div>
                    <h3
                      className='text-xl mb-2 transition-colors'
                      style={{ ...sectionHeading, fontSize: 22 }}
                    >
                      {category.name}
                    </h3>
                    <p
                      className='text-sm mb-4'
                      style={{ color: 'var(--me-ink-2)' }}
                    >
                      {category.articleCount} articles
                    </p>
                    <span
                      className='flex items-center font-semibold text-sm group-hover:gap-2 transition-all'
                      style={{ color: 'var(--me-brand)' }}
                    >
                      Browse articles
                      <span className='sr-only'>in {category.name}</span>
                      <svg
                        className='w-4 h-4 ml-1'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        aria-hidden='true'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 5l7 7-7 7'
                        />
                      </svg>
                    </span>
                  </Link>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>

          {/* Popular Articles */}
          <div className='mb-16'>
            <h2 className='text-3xl mb-8 text-center' style={sectionHeading}>
              Popular Articles
            </h2>
            <MotionDiv
              className='grid grid-cols-1 md:grid-cols-2 gap-6'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              {popularArticles.map((article) => (
                <MotionDiv key={article.id} variants={staggerItem}>
                  <Link
                    href={`/faq#article-${article.id}`}
                    className='block p-6 transition-all group focus:outline-none'
                    style={cardStyle}
                  >
                    <div className='flex items-start justify-between mb-3'>
                      <span
                        className='px-3 py-1 rounded-lg text-xs font-semibold'
                        style={{
                          background: 'var(--me-brand-soft)',
                          color: 'var(--me-brand)',
                        }}
                      >
                        {article.category}
                      </span>
                      <span
                        className='text-xs flex items-center gap-1'
                        style={{ color: 'var(--me-ink-3)' }}
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                          aria-hidden='true'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                          />
                        </svg>
                        {(article.views ?? 0).toLocaleString()} views
                      </span>
                    </div>
                    <h3
                      className='text-lg mb-2 transition-colors'
                      style={{ ...sectionHeading, fontSize: 19 }}
                    >
                      {article.title}
                    </h3>
                    <p className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
                      {article.description}
                    </p>
                  </Link>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>

          {/* Contact Support */}
          <MotionDiv
            className='rounded-3xl p-12 text-center'
            style={{
              background:
                'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
              color: 'var(--me-on-brand)',
            }}
            variants={fadeIn}
            initial='initial'
            animate='animate'
          >
            <div className='max-w-2xl mx-auto'>
              <h2
                className='text-3xl mb-4'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                }}
              >
                Still need help?
              </h2>
              <p
                className='text-lg mb-8'
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                Our support team is available 24/7 to assist you with any
                questions
              </p>
              <div className='flex items-center justify-center gap-4'>
                <Link
                  href='/contact'
                  className='px-8 py-4 font-bold transition-all focus:outline-none'
                  style={{
                    background: 'var(--me-surface)',
                    color: 'var(--me-brand)',
                    borderRadius: 'var(--me-radius-btn)',
                  }}
                >
                  Contact Support
                </Link>
                <Link
                  href='/contact'
                  className='px-8 py-4 font-bold transition-all focus:outline-none'
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: 'var(--me-on-brand)',
                    borderRadius: 'var(--me-radius-btn)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  Live Chat
                </Link>
              </div>
            </div>
          </MotionDiv>
        </div>
      </main>

      <Footer2025 />
    </div>
  );
}
