'use client';

import { useEffect, useState } from 'react';

interface Article {
  title: string;
  category: string;
  views: string;
  viewCount: number;
}

/**
 * Popular Articles Section
 * Displays help articles sorted by real view counts from the database
 */
export function PopularArticlesSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPopularArticles() {
      try {
        const response = await fetch('/api/help/articles/popular');
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Error fetching popular articles:', error);
        // Fallback to empty array
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPopularArticles();
  }, []);

  // Show loading state or fallback if no articles
  if (loading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-primary mb-12 text-center">Most Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If no articles, show fallback with default articles (0 views)
  const displayArticles = articles.length > 0 ? articles : [
    { title: 'How to create an account', category: 'Getting Started', views: '0', viewCount: 0 },
    { title: 'How to post a job', category: 'Posting Jobs', views: '0', viewCount: 0 },
    { title: 'How payments work', category: 'Payments & Billing', views: '0', viewCount: 0 },
    { title: 'Receiving and comparing quotes', category: 'Bids & Quotes', views: '0', viewCount: 0 },
    { title: 'Finding jobs near you', category: 'For Tradespeople', views: '0', viewCount: 0 },
    { title: 'Our verification process', category: 'Safety & Trust', views: '0', viewCount: 0 },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-primary mb-12 text-center">Most Popular Articles</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayArticles.map((article, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden"
            >
              {/* Gradient bar - appears on hover, always visible on large screens */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-primary flex-1">{article.title}</h3>
                <span className="text-sm text-gray-500 ml-4">{article.views} views</span>
              </div>
              <p className="text-sm text-secondary font-medium">{article.category}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

