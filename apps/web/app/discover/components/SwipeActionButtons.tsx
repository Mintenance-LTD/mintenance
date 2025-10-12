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
    boxShadow: theme.shadows.lg,
    transition: 'transform 0.1s ease'
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
        >
          <svg width="24" height="24" fill={theme.colors.white} viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Super Like Button (Homeowner only) */}
        {!isContractor && onSuperLike && (
          <button
            onClick={onSuperLike}
            style={buttonStyle(50, theme.colors.info)}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            aria-label="Super like"
          >
            <svg width="20" height="20" fill={theme.colors.white} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}

        {/* Like Button */}
        <button
          onClick={onLike}
          style={buttonStyle(60, theme.colors.success)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          aria-label={isContractor ? "Interested" : "Like"}
        >
          {isContractor ? (
            <svg width="24" height="24" fill={theme.colors.white} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="24" height="24" fill={theme.colors.white} viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
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
            <>← Swipe left to pass • Swipe right to bid →<br />Tap buttons to choose</>
          ) : (
            <>← Swipe left to pass • Swipe right to like →<br />↑ Swipe up for super like • Tap buttons to choose</>
          )}
        </p>
      </div>
    </>
  );
}

