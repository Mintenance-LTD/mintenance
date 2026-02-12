'use client';

import React from 'react';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
import { Rocket, FileEdit, Search, CreditCard, MessageSquare, Lock } from 'lucide-react';
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
  icon: React.ReactNode;
  articleCount: number;
}

export default function HelpCentrePage() {
  const categories: Category[] = [
    { id: 'getting-started', name: 'Getting Started', icon: <Rocket className="w-12 h-12" />, articleCount: 12 },
    { id: 'posting-jobs', name: 'Posting Jobs', icon: <FileEdit className="w-12 h-12" />, articleCount: 18 },
    { id: 'finding-contractors', name: 'Finding Contractors', icon: <Search className="w-12 h-12" />, articleCount: 15 },
    { id: 'payments', name: 'Payments & Billing', icon: <CreditCard className="w-12 h-12" />, articleCount: 10 },
    { id: 'messaging', name: 'Messaging', icon: <MessageSquare className="w-12 h-12" />, articleCount: 8 },
    { id: 'security', name: 'Security & Privacy', icon: <Lock className="w-12 h-12" />, articleCount: 14 },
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
      description: 'Tips for evaluating contractor profiles and selecting the best match',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <LandingNavigation />

      <main id="main-content" tabIndex={-1}>
        {/* Hero Section */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-16 text-center">
            <div className="flex w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center border border-white/30 mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold mb-4">How can we help you?</h1>
            <p className="text-teal-100 text-xl mb-8">Search our knowledge base or browse categories below</p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-2">
              <div className="relative">
                <label htmlFor="help-search" className="sr-only">Search help articles</label>
                <input
                  id="help-search"
                  type="text"
                  role="searchbox"
                  placeholder="Search for help..."
                  aria-label="Search help articles"
                  className="w-full px-6 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-12">
          {/* Categories Grid */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
            <MotionDiv
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {categories.map((category) => (
                <MotionDiv
                  key={category.id}
                  variants={cardHover}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Link
                    href={`/help/${category.id}`}
                    className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-lg transition-all group focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <div className="mb-4 text-teal-600" aria-hidden="true">{category.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">{category.articleCount} articles</p>
                    <span className="flex items-center text-teal-600 font-semibold text-sm group-hover:gap-2 transition-all">
                      Browse articles
                      <span className="sr-only">in {category.name}</span>
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>

          {/* Popular Articles */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Popular Articles</h2>
            <MotionDiv
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {popularArticles.map((article) => (
                <MotionDiv
                  key={article.id}
                  variants={staggerItem}
                >
                  <Link
                    href={`/help/article/${article.id}`}
                    className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all group focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold">
                        {article.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {(article.views ?? 0).toLocaleString()} views
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{article.description}</p>
                  </Link>
                </MotionDiv>
              ))}
            </MotionDiv>
          </div>

          {/* Contact Support */}
          <MotionDiv
            className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-12 text-white text-center"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
              <p className="text-teal-100 text-lg mb-8">
                Our support team is available 24/7 to assist you with any questions
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-white text-teal-600 rounded-xl font-bold hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
                >
                  Contact Support
                </Link>
                <Link
                  href="/contact"
                  className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold hover:bg-white/30 transition-all border border-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
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
