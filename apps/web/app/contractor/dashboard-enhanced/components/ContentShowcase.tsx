'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { BentoGrid, BentoItem } from './BentoGrid';
import { FeaturedArticle } from './FeaturedArticle';
import { NewsletterSignup } from './NewsletterSignup';
import { ArticleCard } from './ArticleCard';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  image?: string;
  author?: string;
  publishedDate?: string;
  category?: string;
  href: string;
  readingTime?: number;
}

interface ContentShowcaseProps {
  featuredArticle: Article;
  articles: Article[];
  newsletterTitle?: string;
  newsletterDescription?: string;
  hasNewContent?: boolean; // Only show newsletter and articles when true
}

export function ContentShowcase({
  featuredArticle,
  articles,
  newsletterTitle,
  newsletterDescription,
  hasNewContent = false,
}: ContentShowcaseProps) {
  const [isFeaturedDismissed, setIsFeaturedDismissed] = useState(false);

  // Handle newsletter submission on the client side
  const handleNewsletterSubmit = async (email: string) => {
    try {
      // You can add API call here if needed
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      // Handle error - the NewsletterSignup component will show error message
      throw error;
    }
  };

  // Ensure we have at least 2 articles for the smaller cards
  const displayArticles = articles.slice(0, 2);

  // If featured article is dismissed, don't render anything
  if (isFeaturedDismissed) {
    return null;
  }

  return (
    <div style={{ width: '100%' }}>
      <BentoGrid>
        {/* Featured Article (2x1 - smaller than before) */}
        <BentoItem colSpan={2} rowSpan={1}>
          <FeaturedArticle
            id={featuredArticle.id}
            title={featuredArticle.title}
            excerpt={featuredArticle.excerpt}
            coverImage={featuredArticle.coverImage}
            author={featuredArticle.author}
            publishedDate={featuredArticle.publishedDate}
            category={featuredArticle.category}
            href={featuredArticle.href}
            readingTime={featuredArticle.readingTime}
            onDismiss={() => setIsFeaturedDismissed(true)}
          />
        </BentoItem>

        {/* Newsletter Signup Sidebar - Only show when there's new content */}
        {hasNewContent && (
          <BentoItem colSpan={1} rowSpan={1}>
            <NewsletterSignup
              title={newsletterTitle}
              description={newsletterDescription}
              onSubmit={handleNewsletterSubmit}
            />
          </BentoItem>
        )}

        {/* Two Smaller Article Cards - Only show when there's new content */}
        {hasNewContent && displayArticles.map((article) => (
          <BentoItem key={article.id} colSpan={1} rowSpan={1}>
            <ArticleCard
              title={article.title}
              excerpt={article.excerpt}
              image={article.image || article.coverImage}
              author={article.author}
              publishedDate={article.publishedDate}
              category={article.category}
              href={article.href}
            />
          </BentoItem>
        ))}
      </BentoGrid>
    </div>
  );
}

