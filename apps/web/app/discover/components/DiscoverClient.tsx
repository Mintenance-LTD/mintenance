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

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import type { User } from '@mintenance/types';
import { DiscoverHeader } from './DiscoverHeader';
import { DiscoverEmptyState } from './DiscoverEmptyState';
import { CardStack } from './CardStack';
import { SwipeActionButtons } from './SwipeActionButtons';
import { JobCard } from './JobCard';
import { ContractorCard } from './ContractorCard';

interface DiscoverClientProps {
  user: Pick<User, "id" | "role" | "email">;
  contractors: any[];
  jobs: any[];
}

export function DiscoverClient({ user, contractors, jobs }: DiscoverClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const isContractor = user?.role === 'contractor';
  const items = isContractor ? jobs : contractors;
  const hasMoreItems = currentIndex < items.length;
  const remainingCount = items.length - currentIndex;

  const handleSwipe = async (action: 'like' | 'pass' | 'super_like' | 'maybe') => {
    // TODO: Send action to API
    // await fetch('/api/matches', {
    //   method: 'POST',
    //   body: JSON.stringify({ action, itemId: items[currentIndex].id })
    // });

    // Move to next item
    setCurrentIndex(prev => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: theme.colors.surfaceSecondary }}>
      <DiscoverHeader userRole={user?.role} remainingCount={remainingCount} />

      {/* Main Content */}
      <div style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'calc(100vh - 140px)'
      }}>
        {!hasMoreItems ? (
          <DiscoverEmptyState userRole={user?.role} onRestart={handleRestart} />
        ) : (
          <>
            <CardStack
              items={items}
              currentIndex={currentIndex}
              onSwipeLeft={() => handleSwipe('pass')}
              onSwipeRight={() => handleSwipe('like')}
              onSwipeUp={() => handleSwipe('super_like')}
              onSwipeDown={() => handleSwipe('maybe')}
              renderCard={(item) => 
                isContractor ? <JobCard job={item} /> : <ContractorCard contractor={item} />
              }
            />

            <SwipeActionButtons
              userRole={user?.role}
              onPass={() => handleSwipe('pass')}
              onLike={() => handleSwipe('like')}
              onSuperLike={!isContractor ? () => handleSwipe('super_like') : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
