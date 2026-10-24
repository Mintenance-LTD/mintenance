'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OnboardingStep } from '@/lib/onboarding/flows';
interface Props {
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
}: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, [mounted]);
  useEffect(() => {
    const update = () => {
      const node = step.targetSelector
        ? document.querySelector(step.targetSelector)
        : null;
      const bounds = node?.getBoundingClientRect();
      setRect(
        bounds &&
          bounds.width > 0 &&
          bounds.left >= 0 &&
          bounds.right <= window.innerWidth
          ? bounds
          : null
      );
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.targetSelector]);
  if (!mounted) return null;
  return createPortal(
    <div
      data-theme='mint-editorial'
      className='me-root fixed inset-0 z-[9998] flex items-end justify-center bg-black/40 p-4 sm:items-center'
    >
      {rect && (
        <div
          aria-hidden='true'
          className='pointer-events-none fixed rounded-xl border-2 border-[var(--me-brand)]'
          style={{
            top: rect.top - 3,
            left: rect.left - 3,
            width: rect.width + 6,
            height: rect.height + 6,
          }}
        />
      )}
      <div
        ref={dialog}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby='tour-title'
        aria-describedby='tour-description'
        className='relative z-[9999] max-h-[calc(100dvh-32px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--me-line)] bg-[var(--me-surface)] p-6 text-[var(--me-ink)] shadow-xl'
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onSkip();
          }
          if (event.key !== 'Tab') return;
          const controls =
            dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
          const first = controls?.[0],
            last = controls?.[controls.length - 1];
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div aria-live='polite' className='text-sm text-[var(--me-ink-2)]'>
          Step {stepIndex + 1} of {totalSteps}
        </div>
        <h2 id='tour-title' className='mt-2 text-xl font-semibold'>
          {step.title}
        </h2>
        <p id='tour-description' className='my-4 text-sm leading-relaxed'>
          {step.description}
        </p>
        {step.href && (
          <a
            className='mb-4 inline-block underline'
            href={step.href}
            onClick={onSkip}
          >
            Open this feature
          </a>
        )}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <button
            type='button'
            onClick={onSkip}
            className='min-h-11 rounded-full px-3'
          >
            Skip tour
          </button>
          {!isFirstStep && (
            <button
              type='button'
              onClick={onPrevious}
              className='min-h-11 rounded-full border border-[var(--me-line)] px-4'
            >
              Back
            </button>
          )}
          <button
            type='button'
            onClick={isLastStep ? onComplete : onNext}
            className='min-h-11 rounded-full bg-[var(--me-brand)] px-5 text-white'
          >
            {isLastStep ? 'Finish tour' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
