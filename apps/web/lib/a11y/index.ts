/**
 * Accessibility (a11y) Utilities
 *
 * WCAG 2.1 AA compliant utilities for building accessible web applications
 */

export * from './focus-styles';
export * from './colors';
export * from './aria';

/**
 * Common accessibility props for interactive elements
 */
export const getAccessibleButtonProps = (label?: string) => ({
  'aria-label': label,
  tabIndex: 0,
  role: 'button',
});

export const getAccessibleLinkProps = (label?: string) => ({
  'aria-label': label,
  tabIndex: 0,
});

/**
 * Screen reader only text (visually hidden but accessible)
 */
export const srOnly = 'sr-only absolute left-[-10000px] w-[1px] h-[1px] overflow-hidden';

/**
 * Not screen reader (hide from screen readers)
 */
export const ariaHidden = { 'aria-hidden': true };
