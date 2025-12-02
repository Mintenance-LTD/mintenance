'use client';

/**
 * CONTRACTOR DISCOVER CLIENT
 * Modernized discover page for contractors within the contractor layout
 * 
 * Component Structure:
 * - DiscoverClient (this file): Main orchestrator
 * - DiscoverEmptyState: Empty state when all items reviewed
 * - CardStack: Card stack with swipe functionality
 * - SwipeActionButtons: Action buttons for swiping
 * - JobCard: Job details card for contractors
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';
import type { User } from '@mintenance/types';
import { DiscoverEmptyState } from './DiscoverEmptyState';
import { CardStack } from './CardStack';
import { SwipeActionButtons } from './SwipeActionButtons';
import { JobCard } from './JobCard';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { logger } from '@mintenance/shared';

interface SwipeHistory {
  index: number;
  itemId: string;
  action: 'like' | 'pass' | 'super_like' | 'maybe';
}

interface JobData {
  id: string;
  title?: string;
  description?: string;
  budget?: number;
  category?: string;
  city?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  photoUrls?: string[];
  status?: 'posted' | 'assigned' | 'in_progress' | 'completed';
  created_at?: string;
  updated_at?: string;
  skills?: string[];
  timeline?: string;
  homeowner?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    rating?: number;
    jobs_count?: number;
    city?: string;
    country?: string;
  };
  homeowner_id?: string;
  contractor_id?: string;
}

interface DiscoverClientProps {
  user: Pick<User, "id" | "role" | "email">;
  jobs: JobData[];
  contractorLocation?: { latitude: number; longitude: number } | null;
  contractorSkills?: string[];
}

export function DiscoverClient({ 
  user, 
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

  const items = jobs;
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
          itemType: 'job',
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
      logger.error('Error saving swipe:', err);
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
  }, [currentIndex, items, isLoading, hasMoreItems]);

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
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surfaceSecondary }}>
      {/* Progress Bar */}
      {items.length > 0 && (
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: theme.colors.border,
          position: 'relative'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: theme.colors.primary,
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: theme.colors.error,
          color: 'white',
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          borderRadius: theme.borderRadius.md,
          boxShadow: theme.shadows.lg,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2]
        }}>
          <Icon name="xCircle" size={20} color="white" />
          <span>{error}</span>
        </div>
      )}

      {/* Match Celebration Dialog */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <div className="text-5xl mb-4">🎉</div>
            <DialogTitle className="text-2xl">It's a Match!</DialogTitle>
            <DialogDescription className="text-base">
              The homeowner is interested in working with you!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => setShowMatchModal(false)}
              className="w-full"
            >
              Great!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 140px)',
        position: 'relative'
      }}>
        {!hasMoreItems ? (
          <DiscoverEmptyState userRole="contractor" onRestart={handleRestart} />
        ) : (
          <>
            {/* Undo Button */}
            {showUndo && swipeHistory.length > 0 && (
              <button
                onClick={handleUndo}
                disabled={isLoading}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  boxShadow: theme.shadows.sm,
                  zIndex: 100
                }}
              >
                <Icon name="arrowLeft" size={16} color={theme.colors.textPrimary} />
                Undo
              </button>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
              }}>
                <Icon name="loader" size={32} color={theme.colors.primary} className="animate-spin" />
              </div>
            )}

            <CardStack
              items={items}
              currentIndex={currentIndex}
              onSwipeLeft={() => handleSwipe('pass')}
              onSwipeRight={() => handleSwipe('like')}
              onSwipeUp={() => handleSwipe('super_like')}
              onSwipeDown={() => handleSwipe('maybe')}
              renderCard={(item: JobData) => (
                <JobCard 
                  job={item as Parameters<typeof JobCard>[0]['job']} 
                  contractorLocation={contractorLocation}
                  contractorSkills={contractorSkills}
                />
              )}
            />

            <SwipeActionButtons
              userRole="contractor"
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

