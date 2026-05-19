'use client';

import type React from 'react';
import { TrendingUp, Eye } from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { BlogPost } from './blogData';

interface BlogSidebarProps {
  popularPosts: BlogPost[];
  categories: string[];
  blogPosts: BlogPost[];
  setSelectedCategory: (category: string) => void;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  borderRadius: 'var(--me-radius-card)',
  border: '1px solid var(--me-line)',
  boxShadow: 'var(--me-shadow-card)',
};

export function BlogSidebar({
  popularPosts,
  categories,
  blogPosts,
  setSelectedCategory,
}: BlogSidebarProps) {
  return (
    <div className='sticky top-8 space-y-8'>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='p-6'
        style={cardStyle}
      >
        <div className='flex items-center gap-2 mb-4'>
          <TrendingUp
            className='w-5 h-5'
            style={{ color: 'var(--me-brand)' }}
          />
          <h3
            className='text-lg'
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--me-ink)',
            }}
          >
            Popular Articles
          </h3>
        </div>
        <div className='space-y-4'>
          {popularPosts.map((post, index) => (
            <div key={post.id} className='flex gap-3 group cursor-pointer'>
              <span
                className='text-2xl'
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  color: 'var(--me-brand)',
                }}
              >
                {index + 1}
              </span>
              <div className='flex-1'>
                <h4
                  className='font-semibold mb-1 transition-colors'
                  style={{ color: 'var(--me-ink)' }}
                >
                  {post.title}
                </h4>
                <div
                  className='flex items-center gap-2 text-xs'
                  style={{ color: 'var(--me-ink-3)' }}
                >
                  <Eye className='w-3 h-3' />
                  <span>{post.views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='p-6'
        style={{
          background:
            'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          borderRadius: 'var(--me-radius-card)',
          color: 'var(--me-on-brand)',
        }}
      >
        <h3
          className='text-xl mb-3'
          style={{
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Subscribe to our Newsletter
        </h3>
        <p className='mb-4' style={{ color: 'rgba(255,255,255,0.85)' }}>
          Get the latest articles and tips delivered to your inbox weekly.
        </p>
        <input
          type='email'
          placeholder='Enter your email'
          className='w-full px-4 py-3 mb-3'
          style={{
            background: 'var(--me-surface)',
            borderRadius: 'var(--me-radius-input)',
            color: 'var(--me-ink)',
            border: '1px solid var(--me-line)',
          }}
          aria-label='Email address for newsletter'
        />
        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className='w-full px-4 py-3 font-semibold transition-shadow'
          style={{
            background: 'var(--me-surface)',
            color: 'var(--me-brand)',
            borderRadius: 'var(--me-radius-btn)',
          }}
        >
          Subscribe
        </MotionButton>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className='p-6'
        style={cardStyle}
      >
        <h3
          className='text-lg mb-4'
          style={{
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: 'var(--me-ink)',
          }}
        >
          Categories
        </h3>
        <div className='space-y-2'>
          {categories.slice(1).map((category) => {
            const count = blogPosts.filter(
              (p) => p.category === category
            ).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className='w-full flex items-center justify-between px-4 py-2 transition-colors text-left'
                style={{ borderRadius: 'var(--me-radius-input)' }}
              >
                <span style={{ color: 'var(--me-ink-2)' }}>{category}</span>
                <span className='text-sm' style={{ color: 'var(--me-ink-3)' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </MotionDiv>
    </div>
  );
}
