'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { theme } from '@/lib/theme';

interface ArticleNavigationProps {
  prevArticle: { title: string; slug: string } | null;
  nextArticle: { title: string; slug: string } | null;
  category: string;
}

export function ArticleNavigation({ prevArticle, nextArticle, category }: ArticleNavigationProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing[8],
      paddingTop: theme.spacing[6],
      borderTop: `1px solid ${theme.colors.border}`,
    }}>
      {prevArticle ? (
        <Link
          href={`/help/${category}/${prevArticle.slug}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            textDecoration: 'none',
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.backgroundColor = theme.colors.white;
          }}
        >
          <ChevronLeft className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Previous
            </span>
            <span>{prevArticle.title}</span>
          </div>
        </Link>
      ) : (
        <div></div>
      )}

      {nextArticle && (
        <Link
          href={`/help/${category}/${nextArticle.slug}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            textDecoration: 'none',
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.backgroundColor = theme.colors.white;
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Next
            </span>
            <span>{nextArticle.title}</span>
          </div>
          <ChevronRight className="h-5 w-5" style={{ color: theme.colors.textSecondary }} />
        </Link>
      )}
    </div>
  );
}

