/**
 * Accessibility Utilities and Testing
 *
 * Provides utilities and automated checks for WCAG compliance.
 * Ensures the application is accessible to all users.
 */

// ============================================
// COLOR CONTRAST UTILITIES
// ============================================

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(hex: string): number {
  // Convert hex to RGB
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  // Convert to sRGB
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG standards
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === 'AA') {
    return largeText ? ratio >= 3 : ratio >= 4.5;
  } else {
    return largeText ? ratio >= 4.5 : ratio >= 7;
  }
}

// ============================================
// FOCUS MANAGEMENT
// ============================================

/**
 * Trap focus within an element (useful for modals)
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}

/**
 * Get currently focused element
 */
export function getFocusedElement(): HTMLElement | null {
  return document.activeElement as HTMLElement;
}

// ============================================
// ARIA UTILITIES
// ============================================

/**
 * Generate unique ID for ARIA relationships
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set up ARIA live region for announcements
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('class', 'sr-only');
  liveRegion.textContent = message;

  document.body.appendChild(liveRegion);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

/**
 * Handle arrow key navigation for lists/menus
 */
export function handleArrowKeyNavigation(
  e: KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onNavigate: (newIndex: number) => void,
  options: {
    wrap?: boolean;
    orientation?: 'vertical' | 'horizontal' | 'both';
  } = {}
): void {
  const { wrap = true, orientation = 'vertical' } = options;

  let newIndex = currentIndex;

  switch (e.key) {
    case 'ArrowUp':
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault();
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? totalItems - 1 : 0;
        }
        onNavigate(newIndex);
      }
      break;

    case 'ArrowDown':
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault();
        newIndex = currentIndex + 1;
        if (newIndex >= totalItems) {
          newIndex = wrap ? 0 : totalItems - 1;
        }
        onNavigate(newIndex);
      }
      break;

    case 'ArrowLeft':
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault();
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? totalItems - 1 : 0;
        }
        onNavigate(newIndex);
      }
      break;

    case 'ArrowRight':
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault();
        newIndex = currentIndex + 1;
        if (newIndex >= totalItems) {
          newIndex = wrap ? 0 : totalItems - 1;
        }
        onNavigate(newIndex);
      }
      break;

    case 'Home':
      e.preventDefault();
      onNavigate(0);
      break;

    case 'End':
      e.preventDefault();
      onNavigate(totalItems - 1);
      break;
  }
}

// ============================================
// AUTOMATED ACCESSIBILITY TESTS
// ============================================

interface AccessibilityIssue {
  type: 'error' | 'warning';
  element: HTMLElement | null;
  message: string;
  wcagLevel?: string;
  recommendation?: string;
}

/**
 * Run automated accessibility checks on a component or page
 */
export function runAccessibilityChecks(
  rootElement: HTMLElement = document.body
): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];

  // Check for images without alt text
  const images = rootElement.querySelectorAll<HTMLImageElement>('img');
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      issues.push({
        type: 'error',
        element: img,
        message: 'Image missing alt text',
        wcagLevel: '1.1.1 A',
        recommendation: 'Add descriptive alt text or alt="" for decorative images',
      });
    }
  });

  // Check for form inputs without labels
  const inputs = rootElement.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]), textarea, select'
  );
  inputs.forEach(input => {
    const id = input.getAttribute('id');
    const hasAriaLabel = input.hasAttribute('aria-label');
    const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
    const hasLabel = id && rootElement.querySelector(`label[for="${id}"]`);

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push({
        type: 'error',
        element: input,
        message: 'Form input missing label',
        wcagLevel: '3.3.2 A',
        recommendation: 'Add a label element or aria-label attribute',
      });
    }
  });

  // Check for buttons without accessible text
  const buttons = rootElement.querySelectorAll<HTMLButtonElement>('button');
  buttons.forEach(button => {
    const text = button.textContent?.trim();
    const hasAriaLabel = button.hasAttribute('aria-label');

    if (!text && !hasAriaLabel) {
      issues.push({
        type: 'error',
        element: button,
        message: 'Button missing accessible text',
        wcagLevel: '4.1.2 A',
        recommendation: 'Add text content or aria-label attribute',
      });
    }
  });

  // Check for links without accessible text
  const links = rootElement.querySelectorAll<HTMLAnchorElement>('a[href]');
  links.forEach(link => {
    const text = link.textContent?.trim();
    const hasAriaLabel = link.hasAttribute('aria-label');

    if (!text && !hasAriaLabel) {
      issues.push({
        type: 'error',
        element: link,
        message: 'Link missing accessible text',
        wcagLevel: '2.4.4 A',
        recommendation: 'Add link text or aria-label attribute',
      });
    }
  });

  // Check heading hierarchy
  const headings = Array.from(rootElement.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let previousLevel = 0;
  headings.forEach(heading => {
    const currentLevel = parseInt(heading.tagName[1]);
    if (previousLevel > 0 && currentLevel > previousLevel + 1) {
      issues.push({
        type: 'warning',
        element: heading,
        message: `Heading hierarchy skipped from h${previousLevel} to h${currentLevel}`,
        wcagLevel: '1.3.1 A',
        recommendation: 'Use proper heading hierarchy without skipping levels',
      });
    }
    previousLevel = currentLevel;
  });

  // Check for duplicate IDs
  const allElements = rootElement.querySelectorAll('[id]');
  const idMap = new Map<string, HTMLElement[]>();
  allElements.forEach(element => {
    const id = element.getAttribute('id');
    if (id) {
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id)!.push(element as HTMLElement);
    }
  });

  idMap.forEach((elements, id) => {
    if (elements.length > 1) {
      elements.forEach(element => {
        issues.push({
          type: 'error',
          element,
          message: `Duplicate ID "${id}" found`,
          wcagLevel: '4.1.1 A',
          recommendation: 'Ensure all IDs are unique on the page',
        });
      });
    }
  });

  // Check color contrast for text
  const textElements = rootElement.querySelectorAll<HTMLElement>('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
  textElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // Only check if both colors are defined and not transparent
    if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = styles.fontWeight;
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight === 'bold');

      // Convert RGB to hex for contrast calculation
      const colorHex = rgbToHex(color);
      const bgHex = rgbToHex(backgroundColor);

      if (colorHex && bgHex) {
        const ratio = getContrastRatio(colorHex, bgHex);
        const requiredRatio = isLargeText ? 3 : 4.5;

        if (ratio < requiredRatio) {
          issues.push({
            type: 'error',
            element,
            message: `Insufficient color contrast (${ratio.toFixed(2)}:1, requires ${requiredRatio}:1)`,
            wcagLevel: '1.4.3 AA',
            recommendation: 'Increase contrast between text and background colors',
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Convert RGB color to hex
 */
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  const [, r, g, b] = match;
  return '#' + [r, g, b].map(x => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================
// REACT HOOKS FOR ACCESSIBILITY
// ============================================

/**
 * Hook for managing focus restoration
 */
export function useFocusRestore(): {
  saveFocus: () => void;
  restoreFocus: () => void;
} {
  let previousFocus: HTMLElement | null = null;

  const saveFocus = () => {
    previousFocus = getFocusedElement();
  };

  const restoreFocus = () => {
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  };

  return { saveFocus, restoreFocus };
}

// ============================================
// EXPORT ALL UTILITIES
// ============================================

export const accessibility = {
  // Color contrast
  getContrastRatio,
  meetsWCAG,

  // Focus management
  trapFocus,
  restoreFocus,
  getFocusedElement,

  // ARIA utilities
  generateAriaId,
  announceToScreenReader,

  // Keyboard navigation
  handleArrowKeyNavigation,

  // Testing
  runAccessibilityChecks,

  // Hooks
  useFocusRestore,
} as const;

export default accessibility;