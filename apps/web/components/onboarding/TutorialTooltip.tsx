'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface TutorialTooltipProps {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  isVisible: boolean;
  onNext: () => void;
  onDismiss: () => void;
  stepNumber?: number;
  totalSteps?: number;
}

export function TutorialTooltip({
  targetId,
  title,
  description,
  position = 'bottom',
  isVisible,
  onNext,
  onDismiss,
  stepNumber,
  totalSteps,
}: TutorialTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible || !mounted) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(`[data-tutorial="${targetId}"]`);
      if (!targetElement || !tooltipRef.current) return;

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top + scrollY - tooltipRect.height - 12;
          left = targetRect.left + scrollX + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = targetRect.bottom + scrollY + 12;
          left = targetRect.left + scrollX + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = targetRect.top + scrollY + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left + scrollX - tooltipRect.width - 12;
          break;
        case 'right':
          top = targetRect.top + scrollY + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + scrollX + 12;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight + scrollY - padding) {
        top = window.innerHeight + scrollY - tooltipRect.height - padding;
      }

      setTooltipPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isVisible, targetId, position, mounted]);

  if (!isVisible || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop highlight */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      />
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing[4],
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          maxWidth: '320px',
          border: `2px solid ${theme.colors.primary}`,
        }}
      >
        {/* Arrow indicator */}
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...(position === 'bottom' && {
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '0 8px 8px 8px',
              borderColor: `transparent transparent ${theme.colors.primary} transparent`,
            }),
            ...(position === 'top' && {
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '8px 8px 0 8px',
              borderColor: `${theme.colors.primary} transparent transparent transparent`,
            }),
            ...(position === 'left' && {
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '8px 0 8px 8px',
              borderColor: `transparent transparent transparent ${theme.colors.primary}`,
            }),
            ...(position === 'right' && {
              left: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '8px 8px 8px 0',
              borderColor: `transparent ${theme.colors.primary} transparent transparent`,
            }),
          }}
        />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[2] }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
            }}>
              {title}
            </h3>
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: theme.spacing[1],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss"
            >
              <Icon name="x" size={16} color={theme.colors.textSecondary} />
            </button>
          </div>

          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            lineHeight: 1.6,
            margin: 0,
          }}>
            {description}
          </p>

          {/* Step indicator */}
          {stepNumber && totalSteps && (
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textTertiary,
              textAlign: 'center',
            }}>
              Step {stepNumber} of {totalSteps}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: theme.spacing[2],
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onDismiss}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                backgroundColor: 'transparent',
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={onNext}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.primary,
                color: theme.colors.textInverse,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

