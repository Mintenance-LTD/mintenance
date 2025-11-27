import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { User, Calendar, Clock, ArrowRight, FileText } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  author?: string;
  publishedDate?: string;
  category?: string;
  href: string;
  readingTime?: number;
}

const articles: Article[] = [
  {
    id: 'featured-1',
    title: 'Maximize Your Earnings: 10 Proven Strategies for Contractors',
    excerpt: 'Discover expert tips and strategies to grow your contracting business, increase your revenue, and build lasting relationships with homeowners.',
    coverImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzBGMUcyQSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db250cmFjdG9yIFRpcHM8L3RleHQ+PC9zdmc+',
    author: 'Contractor Success Team',
    publishedDate: new Date().toISOString(),
    category: 'Business Tips',
    href: '/contractor/resources/maximize-earnings',
    readingTime: 5,
  },
  {
    id: 'article-1',
    title: 'How to Write Winning Bids That Get Accepted',
    excerpt: 'Learn the art of crafting compelling bids that stand out and win more projects.',
    coverImage: '/api/placeholder/400/300',
    author: 'Bid Expert',
    publishedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Bidding',
    href: '/contractor/resources/winning-bids',
    readingTime: 4,
  },
  {
    id: 'article-2',
    title: 'Customer Communication Best Practices',
    excerpt: 'Master professional communication to keep clients happy and projects running smoothly.',
    coverImage: '/api/placeholder/400/300',
    author: 'Communication Coach',
    publishedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Communication',
    href: '/contractor/resources/customer-communication',
    readingTime: 6,
  },
  {
    id: 'article-3',
    title: 'Pricing Strategies for Maximum Profit',
    excerpt: 'Discover how to price your services competitively while maximizing your profit margins.',
    coverImage: '/api/placeholder/400/300',
    author: 'Business Advisor',
    publishedDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Finance',
    href: '/contractor/resources/pricing-strategies',
    readingTime: 7,
  },
  {
    id: 'article-4',
    title: 'Building Your Online Presence',
    excerpt: 'Learn how to create a professional online presence that attracts more clients.',
    coverImage: '/api/placeholder/400/300',
    author: 'Marketing Expert',
    publishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Marketing',
    href: '/contractor/resources/online-presence',
    readingTime: 5,
  },
  {
    id: 'article-5',
    title: 'Time Management for Contractors',
    excerpt: 'Efficient time management techniques to help you complete more projects.',
    coverImage: '/api/placeholder/400/300',
    author: 'Productivity Coach',
    publishedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'Productivity',
    href: '/contractor/resources/time-management',
    readingTime: 4,
  },
];

function FeaturedArticleCard({ article }: { article: Article }) {
  const formattedDate = article.publishedDate
    ? new Date(article.publishedDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Link
      href={article.href}
      className="group relative h-full rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      {/* Cover Image Background */}
      <div className="absolute inset-0 z-0">
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
            unoptimized={article.coverImage.startsWith('data:') || article.coverImage.startsWith('/api/placeholder')}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500" />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-900/40 to-primary-900/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 text-white">
        {/* Category Badge */}
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-[560] mb-3 w-fit">
          {article.category}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-[640] text-white mb-2 leading-tight tracking-tighter" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {article.title}
        </h2>

        {/* Excerpt */}
        <p className="text-sm font-[460] text-white/95 mb-4 leading-relaxed line-clamp-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          {article.excerpt}
        </p>

        {/* Meta Information */}
        <div className="flex items-center gap-4 text-xs text-white/90 flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-white/90" />
            <span>{article.author}</span>
          </div>
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-white/90" />
              <span>{formattedDate}</span>
            </div>
          )}
          {article.readingTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-white/90" />
              <span>{article.readingTime} min read</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span>Read More</span>
            <ArrowRight className="h-3 w-3 text-white/90" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const formattedDate = article.publishedDate
    ? new Date(article.publishedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Link
      href={article.href}
      className="group h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
    >
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
      {/* Image */}
      <div className="relative w-full h-40 overflow-hidden bg-gray-100">
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={article.coverImage.startsWith('data:') || article.coverImage.startsWith('/api/placeholder')}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <FileText className="h-8 w-8" style={{ color: theme.colors.textTertiary }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        {/* Category */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-[560] mb-2 w-fit">
          {article.category}
        </div>

        {/* Title */}
        <h3 className="text-base font-[560] text-gray-900 mb-2 line-clamp-2 leading-snug">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm font-[460] text-gray-600 mb-3 line-clamp-2 flex-1">
          {article.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {formattedDate && <span>{formattedDate}</span>}
            {article.readingTime && (
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" style={{ color: theme.colors.textTertiary }} />
                {article.readingTime} min
              </span>
            )}
          </div>
          <ArrowRight className="h-3.5 w-3.5" style={{ color: theme.colors.textSecondary }} />
        </div>
      </div>
    </Link>
  );
}

export function ResourcesPageClient() {
  const featuredArticle = articles[0];
  const regularArticles = articles.slice(1);

  return (
    <div style={{ padding: theme.spacing[6], maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-[640] text-gray-900 mb-2 tracking-tight">
          Resources & Insights
        </h1>
        <p className="text-base font-[460] text-gray-600">
          Expert tips, strategies, and resources to grow your contracting business
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="bento-resources-grid">
        {/* Featured Article - Large (spans 2 columns, 2 rows) */}
        <div className="bento-item featured-article" style={{ gridColumn: 'span 2', gridRow: 'span 2' }}>
          <FeaturedArticleCard article={featuredArticle} />
        </div>

        {/* Regular Articles - Mixed sizes */}
        {regularArticles.map((article, index) => {
          // Create varied sizes: some span 1 column, some span 2
          // Alternate between single and double column spans for visual interest
          const colSpan = index % 3 === 0 ? 2 : 1;
          const rowSpan = index % 3 === 0 ? 1 : 1;
          
          return (
            <div
              key={article.id}
              className="bento-item"
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
              }}
            >
              <ArticleCard article={article} />
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .bento-resources-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          width: 100%;
        }

        .bento-item {
          min-height: 200px;
        }

        .featured-article {
          min-height: 400px;
        }

        @media (max-width: 1280px) {
          .bento-resources-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .featured-article {
            grid-column: span 2 !important;
            grid-row: span 2 !important;
          }
        }

        @media (max-width: 1024px) {
          .bento-resources-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .featured-article {
            grid-column: span 2 !important;
            grid-row: span 2 !important;
          }
        }

        @media (max-width: 640px) {
          .bento-resources-grid {
            grid-template-columns: 1fr;
          }
          
          .featured-article {
            grid-column: span 1 !important;
            grid-row: span 1 !important;
            min-height: 300px;
          }
          
          .bento-item {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
}

