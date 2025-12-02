'use client';

/**
 * TutorialSpotlight Component
 * Interactive tutorial with spotlight effect highlighting target elements
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { OnboardingStep } from '@/lib/onboarding/flows';

interface TutorialSpotlightProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TutorialSpotlight({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  isFirstStep,
  isLastStep,
}: TutorialSpotlightProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  // Find and track target element
  useEffect(() => {
    if (!step.targetSelector) return;

    const findElement = () => {
      const element = document.querySelector(
        step.targetSelector!
      ) as HTMLElement;
      if (element) {
        setTargetElement(element);
        updatePositions(element);
      }
    };

    // Initial find
    findElement();

    // Retry after delay (for dynamic content)
    const timer = setTimeout(findElement, 300);

    // Update on scroll/resize
    const handleUpdate = () => {
      if (targetElement) {
        updatePositions(targetElement);
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [step.targetSelector]);

  // Calculate positions for tooltip and highlight
  const updatePositions = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setHighlightRect(rect);

    // Calculate tooltip position based on preferred position
    const position = step.position || 'bottom';
    const spacing = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 200; // Approximate

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - spacing;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + spacing;
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 10) left = 10;
    if (left + tooltipWidth > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth - 10;
    }
    if (top < 10) top = 10;
    if (top + tooltipHeight > viewportHeight - 10) {
      top = viewportHeight - tooltipHeight - 10;
    }

    setTooltipPosition({ top, left });
  }, [step.position]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isLastStep) {
          onComplete();
        } else {
          onNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowLeft' && !isFirstStep && onPrevious) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && !isLastStep) {
        e.preventDefault();
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrevious, onSkip, onComplete]);

  // Prevent body scroll while tutorial is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        {/* Dark overlay with cutout for highlighted element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* SVG mask for spotlight effect */}
          {highlightRect && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={highlightRect.left - 8}
                    y={highlightRect.top - 8}
                    width={highlightRect.width + 16}
                    height={highlightRect.height + 16}
                    rx="12"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.7)"
                mask="url(#spotlight-mask)"
              />
            </svg>
          )}
        </motion.div>

        {/* Highlighted element ring */}
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute pointer-events-none"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              borderRadius: 12,
              border: '3px solid #0066CC',
              boxShadow: '0 0 0 4px rgba(0, 102, 204, 0.2)',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute bg-white rounded-2xl shadow-2xl p-6 max-w-md"
          style={{
            top: step.targetSelector ? tooltipPosition.top : '50%',
            left: step.targetSelector ? tooltipPosition.left : '50%',
            transform: step.targetSelector ? 'none' : 'translate(-50%, -50%)',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
          }}
        >
          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close tutorial"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex
                    ? 'w-8 bg-blue-600'
                    : idx < stepIndex
                    ? 'w-2 bg-blue-600'
                    : 'w-2 bg-gray-300'
                }`}
                role="progressbar"
                aria-valuenow={stepIndex + 1}
                aria-valuemin={1}
                aria-valuemax={totalSteps}
                aria-label={`Step ${idx + 1} of ${totalSteps}`}
              />
            ))}
          </div>

          {/* Step counter */}
          <div className="text-sm font-medium text-blue-600 mb-2">
            Step {stepIndex + 1} of {totalSteps}
          </div>

          {/* Title */}
          <h2 id="tutorial-title" className="text-2xl font-bold text-gray-900 mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isFirstStep && onPrevious && (
                <button
                  onClick={onPrevious}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              {step.skippable && !isLastStep && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Skip Tour
                </button>
              )}
            </div>

            <button
              onClick={isLastStep ? onComplete : onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Finish
                </>
              ) : (
                <>
                  {step.nextLabel || 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Enter</kbd> to continue,
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono ml-1">Esc</kbd> to skip
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default TutorialSpotlight;
