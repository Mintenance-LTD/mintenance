'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface SwipeActionButtonsProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  onPass: () => void;
  onLike: () => void;
  onSuperLike?: () => void;
}

/**
 * Action buttons for swipe interactions
 * Shows pass, like, and optional super-like buttons
 */
export function SwipeActionButtons({ userRole, onPass, onLike, onSuperLike }: SwipeActionButtonsProps) {
  const isContractor = userRole === 'contractor';
  
  const buttonStyle = (size: number, bgColor: string) => ({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: bgColor,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease'
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.95)';
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <>
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Pass Button */}
        <button
          onClick={onPass}
          style={buttonStyle(60, theme.colors.error)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          aria-label="Pass"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
          }}
        >
          <svg width="24" height="24" fill="white" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Like Button - Mint Leaf */}
        <button
          onClick={onLike}
          style={buttonStyle(64, '#10B981')}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          aria-label={isContractor ? "Interested" : "Like"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.35)';
          }}
        >
          {isContractor ? (
            <svg width="28" height="28" fill="white" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
              {/* Mint Leaf Icon - Multiple leaves in a circular pattern */}
              <path d="M12 2 L9 7 L3 8 L7.5 11.5 L6 17 L12 14.5 L18 17 L16.5 11.5 L21 8 L15 7 Z" fill="white"/>
              <path d="M12 5 L10.5 8 L7 8.5 L9.5 10.5 L9 13 L12 11.5 L15 13 L14.5 10.5 L17 8.5 L13.5 8 Z" fill="#10B981" opacity="0.5"/>
            </svg>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        opacity: 0.7
      }}>
        <p style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textTertiary,
          margin: 0
        }}>
          {isContractor ? (
            <>← Swipe left to pass • Swipe right to show interest →<br />Tap buttons below to choose</>
          ) : (
            <>← Swipe left to pass • Swipe right to like →<br />Tap buttons below to choose</>
          )}
        </p>
      </div>
    </>
  );
}

