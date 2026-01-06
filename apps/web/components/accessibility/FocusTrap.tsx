'use client';

import React, { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  returnFocus?: boolean;
  initialFocus?: string;
  onEscape?: () => void;
}

/**
 * Focus Trap Component for Modals and Dialogs
 * WCAG 2.1 Level A - Criterion 2.1.2: No Keyboard Trap
 */
export function FocusTrap({
  children,
  active = true,
  returnFocus = true,
  initialFocus,
  onEscape,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      const selector = [
        'a[href]:not([disabled])',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(container.querySelectorAll<HTMLElement>(selector))
        .filter(el => {
          // Check if element is visible
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
    };

    // Focus initial element or first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      if (initialFocus) {
        const initialEl = container.querySelector<HTMLElement>(initialFocus);
        if (initialEl) {
          initialEl.focus();
        } else {
          focusableElements[0].focus();
        }
      } else {
        focusableElements[0].focus();
      }
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;

      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      // Handle Tab key
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

        if (e.shiftKey) {
          // Tab backwards
          if (currentIndex <= 0) {
            e.preventDefault();
            focusableElements[focusableElements.length - 1].focus();
          }
        } else {
          // Tab forwards
          if (currentIndex === focusableElements.length - 1 || currentIndex === -1) {
            e.preventDefault();
            focusableElements[0].focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Return focus on cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, initialFocus, onEscape, returnFocus]);

  if (!active) return <>{children}</>;

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  );
}