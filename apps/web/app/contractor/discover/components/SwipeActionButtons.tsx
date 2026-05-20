'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface SwipeActionButtonsProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  onPass: () => void;
  onLike: () => void;
  onSuperLike?: () => void;
  disabled?: boolean;
}

/**
 * Action buttons for swipe interactions
 * Shows pass, like, and optional super-like buttons
 */
export function SwipeActionButtons({
  userRole,
  onPass,
  onLike,
  onSuperLike,
  disabled = false,
}: SwipeActionButtonsProps) {
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
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.95)';
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <div
      data-theme='mint-editorial'
      style={{ fontFamily: 'var(--me-font-body)' }}
    >
      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Pass Button - Enhanced */}
        <button
          onClick={onPass}
          disabled={disabled}
          style={{
            ...buttonStyle(60, 'var(--me-err-fg)'),
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'var(--me-err-fg)',
          }}
          onMouseDown={disabled ? undefined : handleMouseDown}
          onMouseUp={disabled ? undefined : handleMouseUp}
          onMouseLeave={disabled ? undefined : handleMouseUp}
          aria-label='Pass'
          onMouseEnter={
            disabled
              ? undefined
              : (e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
                  e.currentTarget.style.boxShadow = 'var(--me-shadow-pop)';
                }
          }
          className='group'
        >
          <svg
            width='24'
            height='24'
            fill='white'
            viewBox='0 0 20 20'
            className='transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90'
          >
            <path
              fillRule='evenodd'
              d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        </button>

        {/* Like Button - Leaf Icon */}
        <button
          onClick={onLike}
          disabled={disabled}
          style={{
            ...buttonStyle(64, 'var(--me-brand)'),
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled
              ? 'var(--me-brand)'
              : 'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
          }}
          onMouseDown={disabled ? undefined : handleMouseDown}
          onMouseUp={disabled ? undefined : handleMouseUp}
          onMouseLeave={disabled ? undefined : handleMouseUp}
          aria-label={isContractor ? 'Show Interest' : 'Like'}
          onMouseEnter={
            disabled
              ? undefined
              : (e) => {
                  e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
                  e.currentTarget.style.boxShadow = 'var(--me-shadow-pop)';
                }
          }
          className='group'
        >
          <svg
            width='28'
            height='28'
            viewBox='0 0 24 24'
            fill='none'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12'
          >
            <path d='M11 20A7 7 0 0 1 9.5 5c.5-1.5 1.5-2.5 3-3 1.5.5 2.5 1.5 3 3A7 7 0 0 1 11 20z' />
            <path d='M9 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0z' />
          </svg>
        </button>
      </div>

      {/* Instructions - Enhanced */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '24px',
        }}
      >
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: 'var(--me-ink-2)',
            margin: 0,
            fontWeight: theme.typography.fontWeight.medium,
            letterSpacing: '0.025em',
          }}
        >
          {isContractor ? (
            <>
              <span style={{ color: 'var(--me-err-fg)' }}>←</span> Swipe left to
              pass • Swipe right to show interest{' '}
              <span style={{ color: 'var(--me-brand)' }}>→</span>
              <br />
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'var(--me-ink-3)',
                  fontWeight: theme.typography.fontWeight.normal,
                }}
              >
                Tap buttons below to choose
              </span>
            </>
          ) : (
            <>
              <span style={{ color: 'var(--me-err-fg)' }}>←</span> Swipe left to
              pass • Swipe right to like{' '}
              <span style={{ color: 'var(--me-brand)' }}>→</span>
              <br />
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'var(--me-ink-3)',
                  fontWeight: theme.typography.fontWeight.normal,
                }}
              >
                Tap buttons below to choose
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
