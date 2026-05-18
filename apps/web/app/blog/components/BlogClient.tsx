'use client';

import React, { useState, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/MotionDiv';
import { BlogPostList } from './BlogPostList';
import { BlogSidebar } from './BlogSidebar';
import { blogPosts, categories } from './blogData';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function BlogClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    return blogPosts.filter((post) => {
      const matchesCategory =
        selectedCategory === 'all' || post.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const featuredPosts = blogPosts.filter((post) => post.featured);
  const popularPosts = [...blogPosts]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return (
    <div
      data-theme='mint-editorial'
      className='min-h-screen'
      style={{ background: 'var(--me-bg)', fontFamily: 'var(--me-font-body)' }}
    >
      <MotionDiv
        initial='hidden'
        animate='visible'
        variants={fadeIn}
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          color: 'var(--me-on-brand)',
        }}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
          <div className='text-center'>
            <MotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className='p-4 rounded-full inline-block mb-6'
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <BookOpen className='w-12 h-12' aria-hidden='true' />
            </MotionDiv>
            <MotionH1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='text-5xl md:text-6xl mb-6'
              style={{
                fontFamily: 'var(--me-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Blog & Insights
            </MotionH1>
            <MotionP
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='text-xl md:text-2xl max-w-3xl mx-auto'
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              Expert advice, tips, and updates from the home maintenance
              industry
            </MotionP>
          </div>
        </div>
      </MotionDiv>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='p-6 mb-12'
          style={{
            background: 'var(--me-surface)',
            borderRadius: 'var(--me-radius-card)',
            border: '1px solid var(--me-line)',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search
                className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5'
                style={{ color: 'var(--me-ink-3)' }}
              />
              <input
                type='text'
                placeholder='Search articles...'
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className='w-full pl-10 pr-4 py-3'
                style={{
                  background: 'var(--me-surface)',
                  border: '1px solid var(--me-line)',
                  borderRadius: 'var(--me-radius-input)',
                  color: 'var(--me-ink)',
                }}
                aria-label='Search blog articles'
              />
            </div>

            <div className='flex gap-2 overflow-x-auto pb-2 md:pb-0'>
              {categories.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className='px-4 py-2 font-medium whitespace-nowrap transition-colors'
                    style={{
                      borderRadius: 'var(--me-radius-input)',
                      background: active ? 'var(--me-brand)' : 'var(--me-bg-2)',
                      color: active ? 'var(--me-on-brand)' : 'var(--me-ink-2)',
                    }}
                    aria-pressed={active}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </MotionDiv>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-12'>
          <div className='lg:col-span-2'>
            <BlogPostList
              filteredPosts={filteredPosts}
              featuredPosts={featuredPosts}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
            />
          </div>

          <div className='lg:col-span-1'>
            <BlogSidebar
              popularPosts={popularPosts}
              categories={categories}
              blogPosts={blogPosts}
              setSelectedCategory={setSelectedCategory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
