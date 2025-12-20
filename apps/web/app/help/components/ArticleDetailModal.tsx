'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { X, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  title: string;
  content: string;
  fullContent?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  articles: Article[];
}

interface ArticleDetailModalProps {
  article: Article;
  category: Category;
  onClose: () => void;
  onNavigateArticle?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

/**
 * Article Detail Modal
 * Displays full article content in a modal dialog
 */
export function ArticleDetailModal({ 
  article, 
  category, 
  onClose,
  onNavigateArticle,
  canNavigatePrev = false,
  canNavigateNext = false,
}: ArticleDetailModalProps) {
  const [wasHelpful, setWasHelpful] = React.useState<boolean | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Arrow keys for navigation (only if not typing in an input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' && canNavigatePrev && onNavigateArticle) {
        e.preventDefault();
        onNavigateArticle('prev');
      } else if (e.key === 'ArrowRight' && canNavigateNext && onNavigateArticle) {
        e.preventDefault();
        onNavigateArticle('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigateArticle, canNavigatePrev, canNavigateNext]);

  const handleFeedback = async (helpful: boolean) => {
    setWasHelpful(helpful);
    setFeedbackSubmitted(true);
    
    // Track feedback
    try {
      await fetch('/api/help/articles/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          articleTitle: article.title,
          wasHelpful: helpful 
        }),
      });
    } catch {
      // Silently fail if tracking fails
    }
  };

  const content = article.fullContent || article.content;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="article-title"
        aria-describedby="article-content"
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl" aria-hidden="true">{category.icon}</span>
                <span className="text-sm font-medium text-gray-600">{category.name}</span>
              </div>
              <DialogTitle id="article-title" className="text-2xl font-bold text-primary pr-8">
                {article.title}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Navigation buttons */}
              {onNavigateArticle && (
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={() => onNavigateArticle('prev')}
                    disabled={!canNavigatePrev}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                      canNavigatePrev
                        ? "text-gray-600 hover:bg-gray-100 hover:text-primary"
                        : "text-gray-300 cursor-not-allowed"
                    )}
                    aria-label="Previous article"
                    title="Previous article (←)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onNavigateArticle('next')}
                    disabled={!canNavigateNext}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                      canNavigateNext
                        ? "text-gray-600 hover:bg-gray-100 hover:text-primary"
                        : "text-gray-300 cursor-not-allowed"
                    )}
                    aria-label="Next article"
                    title="Next article (→)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary"
                aria-label="Close article (ESC)"
                title="Close (ESC)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div 
          id="article-content"
          className="prose prose-lg max-w-none mt-6"
        >
          {content.split('\n\n').map((paragraph, idx) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;

            // Headers
            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={idx} className="text-3xl font-bold text-primary mb-4 mt-8 first:mt-0">
                  {trimmed.slice(2)}
                </h1>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={idx} className="text-2xl font-semibold text-primary mb-3 mt-6 first:mt-0">
                  {trimmed.slice(3)}
                </h2>
              );
            }
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={idx} className="text-xl font-semibold text-gray-800 mb-2 mt-4 first:mt-0">
                  {trimmed.slice(4)}
                </h3>
              );
            }

            // Lists
            if (trimmed.includes('\n- ')) {
              const lines = trimmed.split('\n');
              const listItems = lines.filter(line => line.startsWith('- '));
              if (listItems.length > 0) {
                return (
                  <ul key={idx} className="list-disc list-inside mb-4 space-y-2 ml-4">
                    {listItems.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-gray-700 leading-relaxed">
                        {item.slice(2)}
                      </li>
                    ))}
                  </ul>
                );
              }
            }

            // Regular paragraphs
            return (
              <p key={idx} className="mb-4 text-gray-700 leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* Feedback Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-4">Was this article helpful?</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleFeedback(true)}
              disabled={feedbackSubmitted}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                wasHelpful === true
                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent",
                feedbackSubmitted && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Mark article as helpful"
            >
              <ThumbsUp className="w-5 h-5" />
              <span>Yes</span>
            </button>
            <button
              onClick={() => handleFeedback(false)}
              disabled={feedbackSubmitted}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                wasHelpful === false
                  ? "bg-red-100 text-red-700 border-2 border-red-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent",
                feedbackSubmitted && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Mark article as not helpful"
            >
              <ThumbsDown className="w-5 h-5" />
              <span>No</span>
            </button>
          </div>
          {feedbackSubmitted && (
            <p className="text-sm text-gray-600 mt-3">Thank you for your feedback!</p>
          )}
        </div>

        {/* Related Articles */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Related Articles</p>
          <p className="text-sm text-gray-600">
            Browse more articles in <span className="font-medium text-primary">{category.name}</span> or{' '}
            <button
              onClick={onClose}
              className="text-secondary hover:underline font-medium"
            >
              return to help center
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

