'use client';

/**
 * TutorialSpotlight Component
 * Non-blocking tutorial guide that highlights sidebar items
 * and explains each feature without locking the user to one page.
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

export function TutorialSpotlight(props: TutorialSpotlightProps) {
  const {
    step,
    stepIndex = 0,
    totalSteps = 1,
    onNext = () => {},
    onPrevious,
    onSkip = () => {},
    onComplete = () => {},
    isFirstStep = true,
    isLastStep = false,
  } = props || {};

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Find and highlight target element (sidebar item)
  useEffect(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findAndHighlight = () => {
      const el = document.querySelector(step.targetSelector!) as HTMLElement;
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        // Scroll sidebar item into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        setTargetRect(null);
      }
    };

    findAndHighlight();
    const timer = setTimeout(findAndHighlight, 300);

    const handleUpdate = () => {
      const el = document.querySelector(step.targetSelector!) as HTMLElement;
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [step?.targetSelector]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        isLastStep ? onComplete() : onNext();
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

  // Calculate card position — next to the highlighted sidebar item, or centered for welcome step
  const isWelcomeStep = !step?.targetSelector;

  const cardStyle: React.CSSProperties = isWelcomeStep
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      }
    : {
        position: 'fixed',
        top: targetRect
          ? Math.min(
              Math.max(targetRect.top - 20, 16),
              window.innerHeight - 340
            )
          : 100,
        left: isMobile ? 16 : 280,
        zIndex: 9999,
      };

  return (
    <AnimatePresence>
      {/* Light backdrop only for welcome step */}
      {isWelcomeStep && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-[9998]"
          onClick={onSkip}
        />
      )}

      {/* Highlight ring on sidebar item */}
      {targetRect && !isWelcomeStep && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed pointer-events-none z-[9998]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 10,
            border: '2px solid #0d9488',
            boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.25), 0 0 20px rgba(13, 148, 136, 0.15)',
            background: 'rgba(13, 148, 136, 0.05)',
          }}
        />
      )}

      {/* Tutorial card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-200 p-5 w-[380px] max-w-[calc(100vw-32px)]"
        style={cardStyle}
        role="dialog"
        aria-modal={isWelcomeStep ? 'true' : undefined}
        aria-labelledby="tutorial-title"
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close tutorial"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-6 bg-teal-500'
                  : idx < stepIndex
                  ? 'w-1.5 bg-teal-500'
                  : 'w-1.5 bg-gray-200'
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
        <div className="text-xs font-medium text-teal-600 mb-1.5">
          Step {stepIndex + 1} of {totalSteps}
        </div>

        {/* Title */}
        <h2 id="tutorial-title" className="text-lg font-bold text-gray-900 mb-2">
          {step?.title || 'Tutorial Step'}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          {step?.description || 'Follow the tutorial steps to get started.'}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFirstStep && onPrevious && (
              <button
                onClick={onPrevious}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            {isFirstStep && (
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip Tour
              </button>
            )}
          </div>

          <button
            onClick={isLastStep ? onComplete : onNext}
            className="px-5 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            {isLastStep ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Got it!
              </>
            ) : (
              <>
                {step?.nextLabel || 'Next'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TutorialSpotlight;
