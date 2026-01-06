import { useEffect, useRef, RefObject, useCallback } from 'react';

/**
 * Hook to manage focus for accessibility
 */
export function useFocusManagement(shouldFocus: boolean = false): RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
    }
  }, [shouldFocus]);

  return ref;
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create a hidden div for announcements if it doesn't exist
    if (!document.getElementById('aria-announce')) {
      const announceDiv = document.createElement('div');
      announceDiv.id = 'aria-announce';
      announceDiv.setAttribute('role', 'status');
      announceDiv.setAttribute('aria-live', 'polite');
      announceDiv.setAttribute('aria-atomic', 'true');
      announceDiv.style.position = 'absolute';
      announceDiv.style.left = '-10000px';
      announceDiv.style.width = '1px';
      announceDiv.style.height = '1px';
      announceDiv.style.overflow = 'hidden';
      document.body.appendChild(announceDiv);
      announceRef.current = announceDiv;
    } else {
      announceRef.current = document.getElementById('aria-announce') as HTMLDivElement;
    }

    return () => {
      // Clean up if needed
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 3000);
    }
  }, []);

  return announce;
}

/**
 * Hook to trap focus within an element (useful for modals)
 */
export function useFocusTrap(active: boolean = false): RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const element = ref.current;
    lastFocusedElement.current = document.activeElement as HTMLElement;

    const focusableElements = element.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          lastFocusable?.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          firstFocusable?.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      // Return focus to last focused element
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
      }
    };
  }, [active]);

  return ref;
}

/**
 * Hook to handle keyboard navigation
 */
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    let nextIndex = currentIndexRef.current;
    const itemCount = items.length;

    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          nextIndex = loop
            ? (nextIndex - 1 + itemCount) % itemCount
            : Math.max(0, nextIndex - 1);
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          nextIndex = loop
            ? (nextIndex + 1) % itemCount
            : Math.min(itemCount - 1, nextIndex + 1);
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          nextIndex = loop
            ? (nextIndex - 1 + itemCount) % itemCount
            : Math.max(0, nextIndex - 1);
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          nextIndex = loop
            ? (nextIndex + 1) % itemCount
            : Math.min(itemCount - 1, nextIndex + 1);
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        nextIndex = itemCount - 1;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect) {
          onSelect(currentIndexRef.current);
        }
        break;

      default:
        return;
    }

    if (nextIndex !== currentIndexRef.current) {
      currentIndexRef.current = nextIndex;
      items[nextIndex]?.focus();
    }
  }, [items, orientation, loop, onSelect]);

  useEffect(() => {
    const currentItem = items[currentIndexRef.current];
    if (currentItem) {
      currentItem.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (currentItem) {
        currentItem.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [items, handleKeyDown]);
}

/**
 * Hook to detect and announce page changes for screen readers
 */
export function usePageAnnounce(pageTitle: string) {
  const announce = useAnnounce();

  useEffect(() => {
    announce(`Navigated to ${pageTitle}`, 'polite');
    document.title = `${pageTitle} - Mintenance`;
  }, [pageTitle, announce]);
}

/**
 * Hook to manage ARIA expanded state
 */
export function useAriaExpanded(initialState: boolean = false) {
  const [isExpanded, setIsExpanded] = useState(initialState);

  const getAriaProps = useCallback(() => ({
    'aria-expanded': isExpanded,
    'aria-controls': undefined, // Set this to the ID of the controlled element
  }), [isExpanded]);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return {
    isExpanded,
    setIsExpanded,
    toggle,
    ariaProps: getAriaProps(),
  };
}

/**
 * Hook to manage loading states with screen reader announcements
 */
export function useAccessibleLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const announce = useAnnounce();

  const startLoading = useCallback((message: string = 'Loading...') => {
    setIsLoading(true);
    announce(message, 'polite');
  }, [announce]);

  const stopLoading = useCallback((message: string = 'Loading complete') => {
    setIsLoading(false);
    announce(message, 'polite');
  }, [announce]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    ariaProps: {
      'aria-busy': isLoading,
      'aria-live': 'polite' as const,
    },
  };
}

/**
 * Hook to manage form validation with accessibility
 */
export function useAccessibleFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const announce = useAnnounce();

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
    announce(`Error in ${field}: ${error}`, 'assertive');
  }, [announce]);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getFieldProps = useCallback((field: string) => ({
    'aria-invalid': !!errors[field],
    'aria-errormessage': errors[field] ? `${field}-error` : undefined,
  }), [errors]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getFieldProps,
  };
}

// Add missing import
import { useState } from 'react';