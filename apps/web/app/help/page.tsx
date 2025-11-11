'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import Logo from '../components/Logo';
import { PopularArticlesSection } from './components/PopularArticlesSection';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, MessageCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { cn } from '@/lib/utils';
import { helpCategories, type Article, type Category } from './lib/categories';
import { generateSlug } from './lib/utils';

export default function HelpCentrePage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = React.useState<{ article: Article; category: Category } | null>(null);
  const [showLiveChatDialog, setShowLiveChatDialog] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  // Debounce search query
  React.useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  const categories = helpCategories;

  // Filter categories based on debounced search
  const filteredCategories = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return categories;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return categories
      .map(category => ({
        ...category,
        articles: category.articles.filter(article =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          article.fullContent?.toLowerCase().includes(query)
        ),
      }))
      .filter(category => category.articles.length > 0);
  }, [debouncedSearchQuery]);

  // Calculate total article count
  const totalArticleCount = useMemo(() => {
    return filteredCategories.reduce((sum, category) => sum + category.articles.length, 0);
  }, [filteredCategories]);

  const handleArticleClick = useCallback((article: Article, category: Category) => {
    setSelectedArticle({ article, category });
    // Track article view
    if (typeof window !== 'undefined') {
      fetch('/api/help/articles/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleTitle: article.title }),
      }).catch(() => {
        // Silently fail if tracking fails
      });
    }
  }, []);

  const handleNavigateArticle = useCallback((direction: 'prev' | 'next') => {
    if (!selectedArticle) return;

    const categoryArticles = selectedArticle.category.articles;
    const currentIndex = categoryArticles.findIndex(
      a => a.title === selectedArticle.article.title
    );

    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : categoryArticles.length - 1;
    } else {
      newIndex = currentIndex < categoryArticles.length - 1 ? currentIndex + 1 : 0;
    }

    const newArticle = categoryArticles[newIndex];
    if (newArticle) {
      setSelectedArticle({ article: newArticle, category: selectedArticle.category });
      // Track navigation
      if (typeof window !== 'undefined') {
        fetch('/api/help/articles/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleTitle: newArticle.title }),
        }).catch(() => {
          // Silently fail if tracking fails
        });
      }
    }
  }, [selectedArticle]);

  const getArticleNavigationState = useCallback(() => {
    if (!selectedArticle) {
      return { canNavigatePrev: false, canNavigateNext: false };
    }

    const categoryArticles = selectedArticle.category.articles;
    const currentIndex = categoryArticles.findIndex(
      a => a.title === selectedArticle.article.title
    );

    return {
      canNavigatePrev: categoryArticles.length > 1,
      canNavigateNext: categoryArticles.length > 1,
    };
  }, [selectedArticle]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveCategory(activeCategory === categoryId ? null : categoryId);
    }
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center" aria-label="Mintenance homepage">
              <Logo />
              <span className="ml-3 text-xl font-bold text-primary">Mintenance</span>
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-secondary transition-colors"
              aria-label="Back to home"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Search */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary-light" aria-labelledby="help-heading">
        <div className="max-w-4xl mx-auto text-center">
          <h1 id="help-heading" className="text-5xl md:text-6xl font-bold text-white mb-6">
            How Can We Help?
          </h1>
          <p className="text-xl text-gray-300 mb-10">
            Search our knowledge base or browse categories to find answers
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-12 py-4 text-lg"
              aria-label="Search help articles"
              aria-describedby="search-description"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" aria-hidden="true" />
            {isSearching && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            )}
            <p id="search-description" className="sr-only">
              Search through help articles by typing keywords
            </p>
            {debouncedSearchQuery.trim() && !isSearching && (
              <div className="mt-4 text-center">
                <p className="text-white/90 text-sm">
                  Found <span className="font-semibold">{totalArticleCount}</span> {totalArticleCount === 1 ? 'article' : 'articles'} matching "{debouncedSearchQuery}"
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 border-b border-gray-200" aria-label="Help center statistics">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-secondary mb-2" aria-label="150 plus help articles">150+</div>
              <div className="text-gray-600">Help Articles</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2" aria-label="9 categories">9</div>
              <div className="text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2" aria-label="24/7 support available">24/7</div>
              <div className="text-gray-600">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto">
          <h2 id="categories-heading" className="text-4xl font-bold text-primary mb-12 text-center">Browse by Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" role="list">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                role="listitem"
                className={cn(
                  "bg-white rounded-xl p-6 border-2 transition-all cursor-pointer group relative overflow-hidden",
                  "hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                  activeCategory === category.id ? "border-secondary shadow-lg" : "border-gray-200"
                )}
                onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                onKeyDown={(e) => handleKeyDown(e, category.id)}
                tabIndex={0}
                aria-expanded={activeCategory === category.id}
                aria-controls={`category-${category.id}-articles`}
              >
                {/* Gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10" aria-hidden="true"></div>
                <div className="flex items-center mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mr-4"
                    style={{ backgroundColor: category.color + '20' }}
                    aria-hidden="true"
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary">{category.name}</h3>
                    <p className="text-sm text-gray-600">
                      {category.articles.length} {category.articles.length === 1 ? 'article' : 'articles'}
                    </p>
                  </div>
                  {activeCategory === category.id ? (
                    <ChevronUp className="w-6 h-6 text-gray-400 transition-transform" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400 transition-transform" aria-hidden="true" />
                  )}
                </div>

                {/* Expanded Articles List */}
                {activeCategory === category.id && (
                  <div 
                    id={`category-${category.id}-articles`}
                    className="mt-4 pt-4 border-t border-gray-200 space-y-3"
                    role="list"
                  >
                    {category.articles.map((article, index) => (
                      <Link
                        key={index}
                        href={`/help/${category.id}/${generateSlug(article.title)}`}
                        role="listitem"
                        className="w-full text-left group/article hover:bg-gray-50 p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 block"
                        aria-label={`Read article: ${article.title}`}
                      >
                        <h4 className="font-medium text-primary group-hover/article:text-secondary transition-colors mb-1">
                          {article.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{article.content}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && debouncedSearchQuery.trim() && (
            <div className="text-center py-16" role="status" aria-live="polite">
              <svg
                className="w-20 h-20 mx-auto mb-6 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-2xl font-semibold text-gray-700 mb-3">No results found</h3>
              <p className="text-gray-600 mb-2 max-w-md mx-auto">
                We couldn't find any articles matching <span className="font-semibold">"{debouncedSearchQuery}"</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Try different keywords or browse all categories below
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleClearSearch} variant="outline">
                  Clear Search
                </Button>
                <Link href="/contact">
                  <Button variant="primary">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Popular Articles */}
      <PopularArticlesSection categories={categories} />

      {/* Contact Support CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-secondary to-secondary-dark" aria-labelledby="support-heading">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="support-heading" className="text-4xl md:text-5xl font-bold text-white mb-6">
            Still Need Help?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Can't find what you're looking for? Our support team is here to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/contact" aria-label="Contact support">
              <Button variant="primary" size="lg" className="bg-white text-secondary hover:bg-gray-100">
                Contact Support
              </Button>
            </Link>
            <Dialog open={showLiveChatDialog} onOpenChange={setShowLiveChatDialog}>
              <DialogTrigger asChild>
                <Button variant="primary" size="lg" className="bg-primary text-white hover:bg-primary-light" aria-label="Start live chat">
                  Start Live Chat
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby="live-chat-description">
                <DialogHeader>
                  <DialogTitle>Live Chat Coming Soon</DialogTitle>
                  <DialogDescription id="live-chat-description">
                    Our live chat feature is currently under development.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                  <MessageCircle className="w-16 h-16 text-purple-500 mx-auto mb-4" aria-hidden="true" />
                  <p className="text-gray-600 mb-6">
                    Our live chat feature is currently under development and will be available soon!
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    In the meantime, please reach out to us via email and we'll respond as quickly as possible.
                  </p>
                  <a href="mailto:support@mintenance.co.uk" className="inline-block" aria-label="Email support at support@mintenance.co.uk">
                    <Button variant="primary">
                      Email Us: support@mintenance.co.uk
                    </Button>
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-white py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <Logo />
            <span className="ml-3 text-xl font-bold">Mintenance</span>
          </div>
          <nav aria-label="Footer navigation">
            <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
              <Link href="/" className="text-gray-400 hover:text-secondary transition-colors">Home</Link>
              <Link href="/about" className="text-gray-400 hover:text-secondary transition-colors">About Us</Link>
              <Link href="/contact" className="text-gray-400 hover:text-secondary transition-colors">Contact</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-secondary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-secondary transition-colors">Terms of Service</Link>
            </div>
          </nav>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Mintenance Ltd. All rights reserved. Company No. 16542104
          </p>
        </div>
      </footer>

      {/* Article Detail Modal */}
      {selectedArticle && (() => {
        const navState = getArticleNavigationState();
        return (
          <ArticleDetailModal
            article={selectedArticle.article}
            category={selectedArticle.category}
            onClose={() => setSelectedArticle(null)}
            onNavigateArticle={handleNavigateArticle}
            canNavigatePrev={navState.canNavigatePrev}
            canNavigateNext={navState.canNavigateNext}
          />
        );
      })()}
    </div>
  );
}
