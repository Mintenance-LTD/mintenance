'use client';

import React from 'react';
import { SwipeableCard } from '@/components/SwipeableCard';
import { theme } from '@/lib/theme';

interface CardStackProps<T extends { id: string | number }> {
  items: T[];
  currentIndex: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  renderCard: (item: T) => React.ReactNode;
}

/**
 * Card stack component with swipe functionality
 * Shows the current card and a preview of upcoming cards
 */
export function CardStack<T extends { id: string | number }>({
  items,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  renderCard
}: CardStackProps<T>): React.ReactNode {
  const currentItem = items[currentIndex];
  const upcomingItems = items.slice(currentIndex + 1, currentIndex + 3);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '400px',
      aspectRatio: '3/4',
      marginBottom: '30px'
    }}>
      {/* Background Cards (Preview of upcoming items) */}
      {upcomingItems.map((item, index) => (
        <div
          key={item.id || `upcoming-${index}`}
          style={{
            position: 'absolute',
            top: `${(index + 1) * 4}px`,
            left: `${(index + 1) * 2}px`,
            right: `${(index + 1) * 2}px`,
            bottom: 0,
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: index + 1,
            opacity: 1 - (index + 1) * 0.2,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `scale(${1 - (index + 1) * 0.02})`,
          }}
        />
      ))}

      {/* Active Card */}
      {currentItem && (
        <SwipeableCard
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          onSwipeUp={onSwipeUp}
          onSwipeDown={onSwipeDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {renderCard(currentItem)}
        </SwipeableCard>
      )}
    </div>
  );
}

