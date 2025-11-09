'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface FeaturedArticleProps {
  title: string;
  excerpt: string;
  coverImage?: string;
  author?: string;
  publishedDate?: string;
  category?: string;
  href: string;
}

export function FeaturedArticle({
  title,
  excerpt,
  coverImage = '/api/placeholder/800/600',
  author = 'Editorial Team',
  publishedDate,
  category = 'Featured',
  href,
}: FeaturedArticleProps) {
  const formattedDate = publishedDate
    ? new Date(publishedDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'block',
        height: '100%',
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = theme.shadows.xl;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Cover Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1,
        }}
      >
        {/* Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)',
            zIndex: 2,
          }}
        />
      </div>

      {/* Content Overlay */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: theme.spacing[8],
          color: theme.colors.white,
        }}
      >
        {/* Category Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[1],
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.primary,
            color: theme.colors.white,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing[4],
            width: 'fit-content',
          }}
        >
          {category}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: theme.typography.fontSize['4xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.white,
            margin: 0,
            marginBottom: theme.spacing[3],
            lineHeight: theme.typography.lineHeight.tight,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </h2>

        {/* Excerpt */}
        <p
          style={{
            fontSize: theme.typography.fontSize.lg,
            color: 'rgba(255, 255, 255, 0.9)',
            margin: 0,
            marginBottom: theme.spacing[4],
            lineHeight: theme.typography.lineHeight.relaxed,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </p>

        {/* Meta Information */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[4],
            fontSize: theme.typography.fontSize.sm,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Icon name="user" size={14} color="rgba(255, 255, 255, 0.8)" />
            <span>{author}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Icon name="calendar" size={14} color="rgba(255, 255, 255, 0.8)" />
            <span>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1], marginLeft: 'auto' }}>
            <span>Read More</span>
            <Icon name="arrowRight" size={14} color="rgba(255, 255, 255, 0.8)" />
          </div>
        </div>
      </div>
    </Link>
  );
}

