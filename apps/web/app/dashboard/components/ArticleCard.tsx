'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface ArticleCardProps {
  title: string;
  excerpt: string;
  image?: string;
  author?: string;
  publishedDate?: string;
  category?: string;
  href: string;
}

export function ArticleCard({
  title,
  excerpt,
  image = '/api/placeholder/400/300',
  author = 'Editorial Team',
  publishedDate,
  category,
  href,
}: ArticleCardProps) {
  const formattedDate = publishedDate
    ? new Date(publishedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.xl,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
        overflow: 'hidden',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = theme.shadows.lg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
      }}
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          height: '200px',
          backgroundImage: `url(${image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {category && (
          <div
            style={{
              position: 'absolute',
              top: theme.spacing[3],
              left: theme.spacing[3],
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary,
              color: theme.colors.white,
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
            }}
          >
            {category}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          padding: theme.spacing[5],
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {/* Title */}
        <h3
          style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing[2],
            lineHeight: theme.typography.lineHeight.tight,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </h3>

        {/* Excerpt */}
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0,
            marginBottom: theme.spacing[4],
            lineHeight: theme.typography.lineHeight.relaxed,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}
        >
          {excerpt}
        </p>

        {/* Meta Information */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textTertiary,
            paddingTop: theme.spacing[3],
            borderTop: `1px solid ${theme.colors.borderLight}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon name="user" size={12} color={theme.colors.textTertiary} />
            <span>{author}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Icon name="calendar" size={12} color={theme.colors.textTertiary} />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

