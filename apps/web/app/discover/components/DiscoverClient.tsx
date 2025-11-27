'use client';

/**
 * REFACTORED DISCOVER CLIENT
 * This file has been split into smaller components for better maintainability
 * 
 * Component Structure:
 * - DiscoverClient (this file): Main orchestrator
 * - DiscoverHeader: Logo and title section
 * - DiscoverEmptyState: Empty state when all items reviewed
 * - CardStack: Card stack with swipe functionality
 * - SwipeActionButtons: Action buttons for swiping
 * - JobCard: Job details card for contractors
 * - ContractorCard: Contractor details card for homeowners
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';
import type { User } from '@mintenance/types';
import { DiscoverHeader } from './DiscoverHeader';
import { DiscoverEmptyState } from './DiscoverEmptyState';
import { CardStack } from './CardStack';
import { SwipeActionButtons } from './SwipeActionButtons';
import { JobCard } from './JobCard';
import { ContractorCard } from './ContractorCard';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';

interface SwipeHistory {
  index: number;
  itemId: string;
  action: 'like' | 'pass' | 'super_like' | 'maybe';
}

interface DiscoverClientProps {
  user: Pick<User, "id" | "role" | "email">;
  contractors: any[];
  jobs: any[];
  contractorLocation?: { latitude: number; longitude: number } | null;
  contractorSkills?: string[];
}

export function DiscoverClient({
  user,
  contractors,
  jobs,
  contractorLocation,
  contractorSkills
}: DiscoverClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistory[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isContractor = user?.role === 'contractor';
  const items = isContractor ? jobs : contractors;
  const hasMoreItems = currentIndex < items.length;
  const remainingCount = items.length - currentIndex;
  const progressPercentage = items.length > 0
    ? Math.round((currentIndex / items.length) * 100)
    : 0;

  // Clear undo timeout when component unmounts
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleSwipe = useCallback(async (action: 'like' | 'pass' | 'super_like' | 'maybe') => {
    if (isLoading || !hasMoreItems) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Save to history for undo
    const historyEntry: SwipeHistory = {
      index: currentIndex,
      itemId: currentItem.id,
      action,
    };

    // Optimistic update: move to next item immediately
    const previousIndex = currentIndex;
    setCurrentIndex(prev => prev + 1);
    setSwipeHistory(prev => [...prev.slice(-4), historyEntry]); // Keep last 5 swipes
    setShowUndo(true);
    setIsLoading(true);
    setError(null);

    // Clear previous undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Hide undo button after 3 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
    }, 3000);

    try {
      // Call API to save swipe action
      const response = await fetch('/api/discover/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          itemId: currentItem.id,
          itemType: isContractor ? 'job' : 'contractor',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save swipe action');
      }

      const data = await response.json();

      // Check for match
      if (data.matched) {
        setMatchCount(prev => prev + 1);
        setShowMatchModal(true);
        // Auto-hide match modal after 3 seconds
        setTimeout(() => setShowMatchModal(false), 3000);
      }
    } catch (err) {
      console.error('Error saving swipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to save action');

      // Rollback: restore previous index
      setCurrentIndex(previousIndex);
      setSwipeHistory(prev => prev.slice(0, -1));
      setShowUndo(false);

      // Show error toast for 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [currentIndex, items, isLoading, hasMoreItems, isContractor]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoading || !hasMoreItems) return;

      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        handleSwipe('pass');
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleSwipe('like');
      } else if (e.key === 'ArrowUp') {
        handleSwipe('super_like');
      } else if (e.key === 'ArrowDown') {
        handleSwipe('maybe');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSwipe, isLoading, hasMoreItems]);

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || isLoading) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    if (!lastSwipe) return;

    // Restore previous index
    setCurrentIndex(lastSwipe.index);
    setSwipeHistory(prev => prev.slice(0, -1));
    setShowUndo(false);

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  }, [swipeHistory, isLoading]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSwipeHistory([]);
    setShowUndo(false);
    setError(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DiscoverHeader
        userRole={user?.role}
        remainingCount={remainingCount}
        progressPercentage={progressPercentage}
        matchCount={matchCount}
      />

      {/* Progress Bar */}
      {items.length > 0 && (
        <div className="w-full h-1 bg-gray-200 relative">
          <div
            className="h-full bg-primary-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
          <Icon name="xCircle" size={20} color="white" />
          <span>{error}</span>
        </div>
      )}

      {/* Match Celebration Dialog */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <div className="text-5xl mb-4 animate-bounce">🎉</div>
            <DialogTitle className="text-2xl font-bold text-gray-900">It's a Match!</DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {isContractor
                ? 'The homeowner is interested in working with you!'
                : 'This contractor is interested in your job!'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => setShowMatchModal(false)}
              className="w-full bg-secondary-500 hover:bg-secondary-600 text-white"
            >
              Great!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col items-center min-h-[calc(100vh-140px)] relative">
        {!hasMoreItems ? (
          <DiscoverEmptyState userRole={user?.role} onRestart={handleRestart} />
        ) : (
          <>
            {/* Undo Button */}
            {showUndo && swipeHistory.length > 0 && (
              <button
                onClick={handleUndo}
                disabled={isLoading}
                className="absolute top-5 right-5 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2 shadow-sm z-10 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <Icon name="arrowLeft" size={16} />
                Undo
              </button>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 backdrop-blur-sm">
                <Icon name="loader" size={32} className="text-primary-600 animate-spin" />
              </div>
            )}

            <CardStack
              items={items}
              currentIndex={currentIndex}
              onSwipeLeft={() => handleSwipe('pass')}
              onSwipeRight={() => handleSwipe('like')}
              onSwipeUp={() => handleSwipe('super_like')}
              onSwipeDown={() => handleSwipe('maybe')}
              renderCard={(item) =>
                isContractor
                  ? <JobCard
                    job={item}
                    contractorLocation={contractorLocation}
                    contractorSkills={contractorSkills}
                  />
                  : <ContractorCard contractor={item} />
              }
            />

            <SwipeActionButtons
              userRole={user?.role}
              onPass={() => handleSwipe('pass')}
              onLike={() => handleSwipe('like')}
              disabled={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
