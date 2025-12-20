'use client';

/**
 * FeatureTooltip Component
 * Everboarding tooltip that shows hints for features users haven't discovered yet
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { shouldShowTooltip, markFeatureSeen, dismissTip } from '@/lib/onboarding/onboarding-state';

interface FeatureTooltipProps {
  children: React.ReactNode;
  feature: string; // Unique feature ID
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  actionLabel?: string;
  onAction?: () => void;
  requireCompletion?: number; // Min profile completion % to show
  maxDismissals?: number; // Max times user can dismiss before permanently hiding
  delay?: number; // Delay before showing (ms)
}

export function FeatureTooltip({
  children,
  feature,
  title,
  description,
  placement = 'bottom',
  actionLabel,
  onAction,
  requireCompletion,
  maxDismissals = 2,
  delay = 1000,
}: FeatureTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Check if tooltip should be shown
  useEffect(() => {
    const checkVisibility = () => {
      const shouldShow = shouldShowTooltip(feature, {
        maxDismissals,
        requireCompletion,
      });

      if (shouldShow && !hasShown) {
        const timer = setTimeout(() => {
          setIsVisible(true);
          setHasShown(true);
        }, delay);

        return () => clearTimeout(timer);
      }
    };

    checkVisibility();
  }, [feature, maxDismissals, requireCompletion, delay, hasShown]);

  // Calculate tooltip position
  useEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spacing = 12;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = containerRect.top - tooltipRect.height - spacing;
          left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = containerRect.bottom + spacing;
          left = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
          left = containerRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
          left = containerRect.right + spacing;
          break;
      }

      // Keep within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 10) left = 10;
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
      }
      if (top < 10) top = 10;
      if (top + tooltipRect.height > viewportHeight - 10) {
        top = viewportHeight - tooltipRect.height - 10;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, placement]);

  const handleDismiss = () => {
    dismissTip(feature);
    setIsVisible(false);
  };

  const handleGotIt = () => {
    markFeatureSeen(feature);
    setIsVisible(false);
  };

  const handleAction = () => {
    markFeatureSeen(feature);
    setIsVisible(false);
    onAction?.();
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}

      <AnimatePresence>
        {isVisible && (
          <>
            {/* Portal for tooltip */}
            {typeof document !== 'undefined' && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, scale: 0.95, y: placement === 'top' ? 10 : -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: placement === 'top' ? 10 : -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed z-[9998] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-xs"
                style={{
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                }}
                role="tooltip"
                aria-live="polite"
              >
                {/* Arrow */}
                <div
                  className="absolute w-3 h-3 bg-white border-gray-200 transform rotate-45"
                  style={{
                    [placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left']: -6,
                    [placement === 'left' || placement === 'right' ? 'top' : 'left']: '50%',
                    transform: placement === 'left' || placement === 'right'
                      ? 'translateY(-50%) rotate(45deg)'
                      : 'translateX(-50%) rotate(45deg)',
                    borderWidth: placement === 'top' ? '0 1px 1px 0' : placement === 'bottom' ? '1px 0 0 1px' : placement === 'left' ? '1px 1px 0 0' : '0 0 1px 1px',
                  }}
                />

                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Dismiss tip"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>

                {/* Icon */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 pr-6">
                    <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={handleGotIt}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                  >
                    Got it
                  </button>

                  {actionLabel && onAction && (
                    <button
                      onClick={handleAction}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      {actionLabel}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Pulsing indicator */}
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FeatureTooltip;
