'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { X, Image as ImageIcon, User, Calendar, Clock, ArrowRight } from 'lucide-react';

interface FeaturedArticleProps {
  id: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  author?: string;
  publishedDate?: string;
  category?: string;
  href: string;
  readingTime?: number;
  onDismiss?: () => void;
}

const DISMISS_STORAGE_KEY = 'featured_article_dismissed';

// Calculate reading time based on excerpt length
// Moved outside component to ensure consistent calculation
const calculateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

export function FeaturedArticle({
  id,
  title,
  excerpt,
  coverImage = '/api/placeholder/800/600',
  author = 'Editorial Team',
  publishedDate,
  category = 'Featured',
  href,
  readingTime,
  onDismiss,
}: FeaturedArticleProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const onDismissRef = useRef(onDismiss);
  
  // Calculate reading time if not provided - use useMemo to ensure consistency
  const estimatedReadingTime = React.useMemo(() => {
    return readingTime || calculateReadingTime(excerpt);
  }, [readingTime, excerpt]);

  // Update ref when callback changes
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    setIsMounted(true);
    // Check if this article was dismissed - only after mount
    const dismissedIds = JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || '[]');
    if (dismissedIds.includes(id)) {
      setIsDismissed(true);
      // Call onDismiss using ref to avoid dependency issues
      onDismissRef.current?.();
    }
  }, [id]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dismissedIds = JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) || '[]');
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(dismissedIds));
    }
    
    setIsDismissed(true);
    onDismissRef.current?.();
  };

  const formattedDate = React.useMemo(() => {
    if (!publishedDate) {
      // Use a fixed fallback date to ensure consistency between server and client
      const fallbackDate = new Date('2024-01-01');
      return fallbackDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    try {
      const date = new Date(publishedDate);
      // Ensure valid date
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [publishedDate]);

  // Always render the same structure to avoid hydration mismatch
  // Hide content after mount if dismissed
  if (isMounted && isDismissed) {
    return null;
  }

  return (
    <div className="relative h-full rounded-xl overflow-hidden transition-all duration-300 bg-white border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1">
      {/* Cover Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        {!imageError && coverImage ? (
          <>
            <Image
              src={coverImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              priority
              unoptimized={coverImage.startsWith('data:') || coverImage.startsWith('/api/placeholder')}
            />
            {imageLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: theme.colors.backgroundSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `3px solid ${theme.colors.border}`,
                    borderTopColor: theme.colors.primary,
                    borderRadius: theme.borderRadius.full,
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme.colors.backgroundSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: theme.spacing[2],
            }}
          >
            <ImageIcon className="h-12 w-12 text-gray-400" />
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
              }}
            >
              Image unavailable
            </span>
          </div>
        )}
        
        {/* Green Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to bottom, rgba(16,185,129,0) 0%, rgba(16,185,129,0.2) 50%, rgba(16,185,129,0.7) 100%)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Dismiss Button */}
      <Button
        onClick={handleDismiss}
        aria-label="Dismiss article"
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 z-4 w-8 h-8 p-0 rounded-full bg-white/90 hover:bg-white shadow-sm"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Content Overlay */}
      <Link
        href={href}
        style={{
          position: 'relative',
          zIndex: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: theme.spacing[6],
          color: theme.colors.white,
          textDecoration: 'none',
        }}
      >
        {/* Category Badge */}
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-600 text-white text-xs font-[560] mb-3 w-fit">
          {category}
        </div>

        {/* Title */}
        <h2 className="text-xl font-[640] text-white mb-2 leading-tight tracking-tighter" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {title}
        </h2>

        {/* Excerpt */}
        <p className="text-sm font-[460] text-white/95 mb-3 leading-normal line-clamp-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          {excerpt}
        </p>

        {/* Meta Information */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            fontSize: theme.typography.fontSize.xs,
            color: 'rgba(255, 255, 255, 0.9)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <User className="h-3 w-3 text-white/90" />
            <span>{author}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Calendar className="h-3 w-3 text-white/90" />
            <span>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Clock className="h-3 w-3 text-white/90" />
            <span>{estimatedReadingTime} min read</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1], marginLeft: 'auto' }}>
            <span>Read More</span>
            <ArrowRight className="h-3 w-3 text-white/90" />
          </div>
        </div>
      </Link>
      
      {/* Loading Spinner Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `
      }} />
    </div>
  );
}
