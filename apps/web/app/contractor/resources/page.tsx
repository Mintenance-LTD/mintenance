'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Image from 'next/image';
import { MotionDiv, MotionA } from '@/components/ui/MotionDiv';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: number;
  publishedDate: string;
  author: string;
  coverImage?: string;
  href: string;
}

const articles: Article[] = [
  {
    id: '1',
    title: 'Maximize Your Earnings: 10 Proven Strategies for Contractors',
    excerpt: 'Discover expert tips and strategies to grow your contracting business, increase your revenue, and build lasting relationships with homeowners.',
    category: 'Business Tips',
    readingTime: 5,
    publishedDate: new Date().toISOString(),
    author: 'Contractor Success Team',
    href: '/contractor/resources/maximize-earnings',
  },
  {
    id: '2',
    title: 'How to Write Winning Bids That Get Accepted',
    excerpt: 'Learn the art of crafting compelling bids that stand out and win more projects.',
    category: 'Bidding',
    readingTime: 4,
    publishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Bid Expert',
    href: '/contractor/resources/winning-bids',
  },
  {
    id: '3',
    title: 'Customer Communication Best Practices',
    excerpt: 'Master professional communication to keep clients happy and projects running smoothly.',
    category: 'Communication',
    readingTime: 6,
    publishedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Communication Coach',
    href: '/contractor/resources/customer-communication',
  },
  {
    id: '4',
    title: 'Pricing Strategies for Maximum Profit',
    excerpt: 'Discover how to price your services competitively while maximizing your profit margins.',
    category: 'Finance',
    readingTime: 7,
    publishedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Business Advisor',
    href: '/contractor/resources/pricing-strategies',
  },
  {
    id: '5',
    title: 'Building Your Online Presence',
    excerpt: 'Learn how to create a professional online presence that attracts more clients.',
    category: 'Marketing',
    readingTime: 5,
    publishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Marketing Expert',
    href: '/contractor/resources/online-presence',
  },
  {
    id: '6',
    title: 'Time Management for Contractors',
    excerpt: 'Efficient time management techniques to help you complete more projects.',
    category: 'Productivity',
    readingTime: 4,
    publishedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Productivity Coach',
    href: '/contractor/resources/time-management',
  },
  {
    id: '7',
    title: 'Safety First: Essential Guidelines for Every Job',
    excerpt: 'Comprehensive safety protocols and best practices to keep you and your team safe on every project.',
    category: 'Safety',
    readingTime: 8,
    publishedDate: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Safety Consultant',
    href: '/contractor/resources/safety-guidelines',
  },
  {
    id: '8',
    title: 'Tax Tips for Self-Employed Contractors',
    excerpt: 'Navigate tax season with confidence using these essential tax tips and deductions.',
    category: 'Finance',
    readingTime: 9,
    publishedDate: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString(),
    author: 'Tax Advisor',
    href: '/contractor/resources/tax-tips',
  },
];

const categories = ['All', 'Business Tips', 'Bidding', 'Communication', 'Finance', 'Marketing', 'Productivity', 'Safety'];

export default function ContractorResourcesPage2025() {
  const { user } = useCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articles[0];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="contractor"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Learning Resources</h1>
                <p className="text-teal-100 text-lg">Guides, tips, and best practices to grow your business</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-teal-100 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-teal-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          {/* Category Tabs */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Featured Article */}
          {selectedCategory === 'All' && searchQuery === '' && (
            <MotionDiv
              className="mb-8"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Featured</h2>
              <MotionA
                href={featuredArticle.href}
                className="block bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group"
                variants={cardHover}
                whileHover="hover"
                whileTap="tap"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 text-white">
                  <div className="flex flex-col justify-center">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold mb-4 w-fit">
                      {featuredArticle.category}
                    </span>
                    <h3 className="text-3xl font-bold mb-4">{featuredArticle.title}</h3>
                    <p className="text-teal-100 mb-6">{featuredArticle.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-teal-100 mb-6">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {featuredArticle.author}
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {featuredArticle.readingTime} min read
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all">
                      Read Article
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center justify-center">
                    <div className="w-full h-64 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                      <svg className="w-32 h-32 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                </div>
              </MotionA>
            </MotionDiv>
          )}

          {/* Articles Grid */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory === 'All' ? 'All Resources' : selectedCategory}
              <span className="text-gray-500 text-lg ml-2">({filteredArticles.length})</span>
            </h2>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No resources found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <MotionDiv
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredArticles.map((article) => (
                <MotionA
                  key={article.id}
                  href={article.href}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all"
                  variants={cardHover}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {/* Placeholder Image */}
                  <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                    <svg className="w-16 h-16 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold">
                        {article.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {article.readingTime} min
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-teal-600 transition-colors">
                      {article.title}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {article.author}
                      </div>
                      <div className="flex items-center gap-1 text-teal-600 font-semibold text-sm group-hover:gap-2 transition-all">
                        Read
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </MotionA>
              ))}
            </MotionDiv>
          )}
        </div>
      </main>
    </div>
  );
}
