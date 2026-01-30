'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Clock, User, ArrowRight, BookOpen } from 'lucide-react';
import type { ResourceArticle } from './resources-data';

interface ResourcesClientProps {
  articles: ResourceArticle[];
  categories: string[];
  loginRedirect: string;
}

export function ResourcesClient({ articles, categories, loginRedirect }: ResourcesClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Search */}
      <div className="relative max-w-2xl mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search resources..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          aria-label="Search resources"
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-8">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedCategory === category
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Article count */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        {selectedCategory === 'All' ? 'All resources' : selectedCategory}
        <span className="text-gray-500 font-normal text-base ml-2">({filteredArticles.length})</span>
      </h2>

      {/* Article grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-600">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-teal-300" aria-hidden />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" aria-hidden />
                    {article.readingTime} min
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" aria-hidden />
                    {article.author}
                  </span>
                  <Link
                    href={loginRedirect}
                    className="inline-flex items-center gap-1 text-teal-600 font-semibold text-sm hover:gap-2 transition-all"
                  >
                    Sign in to read
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
