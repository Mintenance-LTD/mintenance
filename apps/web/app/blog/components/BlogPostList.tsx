'use client';

import type React from 'react';
import {
  BookOpen,
  Calendar,
  User,
  Clock,
  Tag,
  TrendingUp,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import type { BlogPost } from './blogData';

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

interface BlogPostListProps {
  filteredPosts: BlogPost[];
  featuredPosts: BlogPost[];
  selectedCategory: string;
  searchQuery: string;
}

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

const categoryPill: React.CSSProperties = {
  background: 'var(--me-brand-soft)',
  color: 'var(--me-brand)',
};

const readMoreStyle: React.CSSProperties = {
  color: 'var(--me-brand)',
  fontWeight: 600,
};

export function BlogPostList({
  filteredPosts,
  featuredPosts,
  selectedCategory,
  searchQuery,
}: BlogPostListProps) {
  return (
    <>
      {selectedCategory === 'all' && !searchQuery && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='mb-12'
        >
          <h2 className='text-2xl mb-6' style={sectionHeading}>
            Featured Articles
          </h2>
          <div className='space-y-6'>
            {featuredPosts.slice(0, 2).map((post) => (
              <MotionDiv
                key={post.id}
                whileHover={{ y: -4 }}
                className='overflow-hidden transition-all'
                style={cardStyle}
              >
                <div
                  className='aspect-video flex items-center justify-center'
                  style={{ background: 'var(--me-brand-soft)' }}
                >
                  <BookOpen
                    className='w-16 h-16'
                    style={{ color: 'var(--me-brand)' }}
                    aria-hidden='true'
                  />
                </div>
                <div className='p-6'>
                  <div className='flex items-center gap-3 mb-3'>
                    <span
                      className='px-3 py-1 rounded-full text-sm font-medium'
                      style={categoryPill}
                    >
                      {post.category}
                    </span>
                    <div
                      className='flex items-center gap-1 text-sm'
                      style={{ color: 'var(--me-ink-3)' }}
                    >
                      <Eye className='w-4 h-4' aria-hidden='true' />
                      <span>{post.views.toLocaleString()} views</span>
                    </div>
                  </div>
                  <h3
                    className='text-2xl mb-3 cursor-pointer'
                    style={{ ...sectionHeading, fontSize: 26 }}
                  >
                    {post.title}
                  </h3>
                  <p className='mb-4' style={{ color: 'var(--me-ink-2)' }}>
                    {post.excerpt}
                  </p>
                  <div className='flex items-center justify-between'>
                    <div
                      className='flex items-center gap-4 text-sm'
                      style={{ color: 'var(--me-ink-2)' }}
                    >
                      <div className='flex items-center gap-2'>
                        <User className='w-4 h-4' aria-hidden='true' />
                        <span>{post.author}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Calendar className='w-4 h-4' aria-hidden='true' />
                        <span>{post.date}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4' aria-hidden='true' />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <MotionButton
                      whileHover={{ x: 4 }}
                      className='flex items-center gap-1'
                      style={readMoreStyle}
                    >
                      Read More
                      <ChevronRight className='w-4 h-4' />
                    </MotionButton>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
      )}

      <MotionDiv
        variants={staggerContainer}
        initial='hidden'
        whileInView='visible'
        viewport={{ once: true }}
      >
        <h2 className='text-2xl mb-6' style={sectionHeading}>
          {selectedCategory === 'all'
            ? 'Latest Articles'
            : `${selectedCategory} Articles`}
        </h2>
        <div className='space-y-6'>
          {filteredPosts.map((post) => (
            <MotionDiv
              key={post.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className='p-6 transition-all'
              style={cardStyle}
            >
              <div className='flex items-center gap-3 mb-3'>
                <span
                  className='px-3 py-1 rounded-full text-sm font-medium'
                  style={categoryPill}
                >
                  {post.category}
                </span>
                {post.featured && (
                  <span
                    className='px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1'
                    style={{
                      background: 'var(--me-warn-bg)',
                      color: 'var(--me-warn-fg)',
                    }}
                  >
                    <TrendingUp className='w-3 h-3' />
                    Featured
                  </span>
                )}
                <div
                  className='flex items-center gap-1 text-sm'
                  style={{ color: 'var(--me-ink-3)' }}
                >
                  <Eye className='w-4 h-4' />
                  <span>{post.views.toLocaleString()}</span>
                </div>
              </div>
              <h3
                className='text-xl mb-2 cursor-pointer'
                style={{ ...sectionHeading, fontSize: 22 }}
              >
                {post.title}
              </h3>
              <p className='mb-4' style={{ color: 'var(--me-ink-2)' }}>
                {post.excerpt}
              </p>
              <div className='flex flex-wrap items-center gap-2 mb-4'>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className='px-2 py-1 rounded text-xs flex items-center gap-1'
                    style={{
                      background: 'var(--me-bg-2)',
                      color: 'var(--me-ink-2)',
                    }}
                  >
                    <Tag className='w-3 h-3' />
                    {tag}
                  </span>
                ))}
              </div>
              <div
                className='flex items-center justify-between pt-4'
                style={{ borderTop: '1px solid var(--me-line)' }}
              >
                <div
                  className='flex items-center gap-4 text-sm'
                  style={{ color: 'var(--me-ink-2)' }}
                >
                  <div className='flex items-center gap-2'>
                    <User className='w-4 h-4' />
                    <span>{post.author}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Calendar className='w-4 h-4' />
                    <span>{post.date}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Clock className='w-4 h-4' />
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <MotionButton
                  whileHover={{ x: 4 }}
                  className='flex items-center gap-1'
                  style={readMoreStyle}
                >
                  Read More
                  <ChevronRight className='w-4 h-4' />
                </MotionButton>
              </div>
            </MotionDiv>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className='p-12 text-center' style={cardStyle}>
            <BookOpen
              className='w-16 h-16 mx-auto mb-4'
              style={{ color: 'var(--me-ink-3)' }}
            />
            <h3
              className='text-xl font-semibold mb-2'
              style={{ color: 'var(--me-ink)' }}
            >
              No articles found
            </h3>
            <p style={{ color: 'var(--me-ink-3)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </MotionDiv>
    </>
  );
}
