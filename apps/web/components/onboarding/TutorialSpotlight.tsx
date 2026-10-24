'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Compass } from 'lucide-react';
import type { OnboardingStep } from '@/lib/onboarding/flows';
import styles from './Onboarding.module.css';
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
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      previous?.focus({ preventScroll: true });
    };
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
          bounds.height > 0 &&
          bounds.left >= 0 &&
          bounds.top >= 0 &&
          bounds.right <= window.innerWidth &&
          bounds.bottom <= window.innerHeight
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
    <div data-theme='mint-editorial' className={styles.overlay}>
      {rect ? (
        <div
          aria-hidden='true'
          className={styles.spotlight}
          style={{
            top: rect.top - 3,
            left: rect.left - 3,
            width: rect.width + 6,
            height: rect.height + 6,
          }}
        />
      ) : (
        <div aria-hidden='true' className={styles.shade} />
      )}
      <div
        ref={dialog}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby='tour-title'
        aria-describedby='tour-description'
        className={styles.dialog}
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
        <div className={styles.tourMeta}>
          <span className={styles.tourLabel}>Your quick tour</span>
          <span aria-live='polite'>
            Step {stepIndex + 1} of {totalSteps}
          </span>
        </div>
        <div className={styles.progress} aria-hidden='true'>
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={i <= stepIndex ? styles.filled : undefined}
            />
          ))}
        </div>
        {isFirstStep && (
          <span className={`${styles.icon} ${styles.tourIcon}`}>
            <Compass size={25} aria-hidden='true' />
          </span>
        )}
        <h2 id='tour-title' className={styles.tourTitle}>
          {step.title}
        </h2>
        <p id='tour-description' className={styles.description}>
          {step.description}
        </p>
        {step.href && (
          <a
            className={`${styles.secondary} ${styles.featureAction}`}
            href={step.href}
            onClick={onSkip}
          >
            Open this feature <ArrowRight size={15} aria-hidden='true' />
          </a>
        )}
        <div className={styles.tourFooter}>
          <button type='button' onClick={onSkip} className={styles.textButton}>
            Skip tour
          </button>
          <div className={styles.actions}>
            {!isFirstStep && (
              <button
                type='button'
                onClick={onPrevious}
                className={styles.secondary}
              >
                Back
              </button>
            )}
            <button
              type='button'
              onClick={isLastStep ? onComplete : onNext}
              className={styles.primary}
            >
              {isLastStep
                ? 'Finish tour'
                : isFirstStep
                  ? 'Let’s take a look'
                  : 'Next'}
              {!isLastStep && <ArrowRight size={15} aria-hidden='true' />}
            </button>
          </div>
        </div>
        {isFirstStep && (
          <p className={styles.tourHint}>
            Explore at your pace. You can replay this tour any time.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
