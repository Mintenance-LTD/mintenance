'use client';

import React from 'react';
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
}

interface ContentShowcaseProps {
  featuredArticle: Article;
  articles: Article[];
  newsletterTitle?: string;
  newsletterDescription?: string;
  onNewsletterSubmit?: (email: string) => Promise<void>;
}

export function ContentShowcase({
  featuredArticle,
  articles,
  newsletterTitle,
  newsletterDescription,
  onNewsletterSubmit,
}: ContentShowcaseProps) {
  // Ensure we have at least 2 articles for the smaller cards
  const displayArticles = articles.slice(0, 2);

  return (
    <div style={{ width: '100%' }}>
      <BentoGrid>
        {/* Featured Article (2x2) */}
        <BentoItem colSpan={2} rowSpan={2}>
          <FeaturedArticle
            title={featuredArticle.title}
            excerpt={featuredArticle.excerpt}
            coverImage={featuredArticle.coverImage}
            author={featuredArticle.author}
            publishedDate={featuredArticle.publishedDate}
            category={featuredArticle.category}
            href={featuredArticle.href}
          />
        </BentoItem>

        {/* Newsletter Signup Sidebar (1x3) */}
        <BentoItem colSpan={1} rowSpan={2}>
          <NewsletterSignup
            title={newsletterTitle}
            description={newsletterDescription}
            onSubmit={onNewsletterSubmit}
          />
        </BentoItem>

        {/* Two Smaller Article Cards (1x1 each) */}
        {displayArticles.map((article, index) => (
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

