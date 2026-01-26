/**
 * Mobile Accessibility Utilities for React Native
 * WCAG 2.1 AA compliance helpers for the Mintenance mobile app
 */

import { Platform, AccessibilityInfo, findNodeHandle, UIManager } from 'react-native';
import { logger } from '@mintenance/shared';

/**
 * Accessibility roles for React Native components
 */
export const ACCESSIBILITY_ROLES = {
  BUTTON: 'button',
  LINK: 'link',
  HEADER: 'header',
  SEARCH: 'search',
  IMAGE: 'image',
  IMAGEBUTTON: 'imagebutton',
  TEXT: 'text',
  ADJUSTABLE: 'adjustable',
  SUMMARY: 'summary',
  NONE: 'none',
  TAB: 'tab',
  TABLIST: 'tablist',
  TIMER: 'timer',
  LIST: 'list',
  PROGRESSBAR: 'progressbar',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  SPINBUTTON: 'spinbutton',
  SWITCH: 'switch',
  CHECKBOX: 'checkbox',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  TOOLBAR: 'toolbar',
  ALERT: 'alert',
  COMBOBOX: 'combobox',
} as const;

/**
 * Accessibility states for React Native components
 */
export const ACCESSIBILITY_STATES = {
  DISABLED: 'disabled',
  SELECTED: 'selected',
  CHECKED: 'checked',
  BUSY: 'busy',
  EXPANDED: 'expanded',
} as const;

/**
 * Touch target size requirements (in density-independent pixels)
 */
export const TOUCH_TARGET_SIZE = {
  MIN_SIZE: 44, // WCAG 2.1 AA requirement
  RECOMMENDED_SIZE: 48, // Material Design recommendation
  SPACING: 8, // Minimum spacing between targets
};

/**
 * Announce a message to screen reader users
 */
export function announceForAccessibility(message: string, delay = 0): void {
  if (delay > 0) {
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, delay);
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    logger.warn('Failed to check screen reader status:', error, { service: 'mobile' });
    return false;
  }
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch (error) {
    logger.warn('Failed to check reduce motion status:', error, { service: 'mobile' });
    return false;
  }
}

/**
 * Check if bold text is enabled
 */
export async function isBoldTextEnabled(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      // @ts-ignore - This method exists but isn't in the TypeScript definitions
      return await AccessibilityInfo.isBoldTextEnabled();
    } catch (error) {
      logger.warn('Failed to check bold text status:', error, { service: 'mobile' });
      return false;
    }
  }
  return false;
}

/**
 * Check if grayscale is enabled
 */
export async function isGrayscaleEnabled(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      // @ts-ignore - This method exists but isn't in the TypeScript definitions
      return await AccessibilityInfo.isGrayscaleEnabled();
    } catch (error) {
      logger.warn('Failed to check grayscale status:', error, { service: 'mobile' });
      return false;
    }
  }
  return false;
}

/**
 * Check if invert colors is enabled
 */
export async function isInvertColorsEnabled(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      // @ts-ignore - This method exists but isn't in the TypeScript definitions
      return await AccessibilityInfo.isInvertColorsEnabled();
    } catch (error) {
      logger.warn('Failed to check invert colors status:', error, { service: 'mobile' });
      return false;
    }
  }
  return false;
}

/**
 * Focus on a specific component
 */
export function setAccessibilityFocus(ref: unknown): void {
  if (!ref) return;

  const reactTag = findNodeHandle(ref);
  if (reactTag) {
    if (Platform.OS === 'android') {
      UIManager.sendAccessibilityEvent(reactTag, 8); // TYPE_VIEW_FOCUSED
    } else {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }
}

/**
 * Create accessibility props for a button
 */
export function createButtonA11yProps(
  label: string,
  options: {
    hint?: string;
    disabled?: boolean;
    onPress?: () => void;
  } = {}
) {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.BUTTON,
    accessibilityLabel: label,
    accessibilityHint: options.hint,
    accessibilityState: {
      disabled: options.disabled || false,
    },
    onAccessibilityTap: options.onPress,
  };
}

/**
 * Create accessibility props for a link
 */
export function createLinkA11yProps(
  label: string,
  options: {
    hint?: string;
    external?: boolean;
  } = {}
) {
  const hint = options.external
    ? `${options.hint || ''} Opens in external browser`.trim()
    : options.hint;

  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.LINK,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Create accessibility props for an image
 */
export function createImageA11yProps(
  altText: string,
  isDecorative = false
) {
  if (isDecorative) {
    return {
      accessible: false,
      importantForAccessibility: 'no',
    };
  }

  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.IMAGE,
    accessibilityLabel: altText,
  };
}

/**
 * Create accessibility props for a form input
 */
export function createInputA11yProps(
  label: string,
  options: {
    value?: string;
    placeholder?: string;
    error?: string;
    required?: boolean;
    multiline?: boolean;
  } = {}
) {
  let accessibilityLabel = label;
  if (options.required) {
    accessibilityLabel += ', required';
  }
  if (options.error) {
    accessibilityLabel += `, Error: ${options.error}`;
  }

  return {
    accessible: true,
    accessibilityLabel,
    accessibilityValue: options.value ? { text: options.value } : undefined,
    accessibilityHint: options.placeholder,
  };
}

/**
 * Create accessibility props for a checkbox
 */
export function createCheckboxA11yProps(
  label: string,
  checked: boolean,
  options: {
    hint?: string;
    disabled?: boolean;
  } = {}
) {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.CHECKBOX,
    accessibilityLabel: label,
    accessibilityHint: options.hint,
    accessibilityState: {
      checked,
      disabled: options.disabled || false,
    },
  };
}

/**
 * Create accessibility props for a radio button
 */
export function createRadioA11yProps(
  label: string,
  selected: boolean,
  options: {
    hint?: string;
    disabled?: boolean;
  } = {}
) {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.RADIO,
    accessibilityLabel: label,
    accessibilityHint: options.hint,
    accessibilityState: {
      selected,
      disabled: options.disabled || false,
    },
  };
}

/**
 * Create accessibility props for a switch/toggle
 */
export function createSwitchA11yProps(
  label: string,
  value: boolean,
  options: {
    hint?: string;
    disabled?: boolean;
  } = {}
) {
  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.SWITCH,
    accessibilityLabel: label,
    accessibilityHint: options.hint,
    accessibilityState: {
      checked: value,
      disabled: options.disabled || false,
    },
    accessibilityValue: { text: value ? 'on' : 'off' },
  };
}

/**
 * Create accessibility props for a progress indicator
 */
export function createProgressA11yProps(
  label: string,
  progress: number,
  options: {
    max?: number;
    hint?: string;
  } = {}
) {
  const max = options.max || 100;
  const percentage = Math.round((progress / max) * 100);

  return {
    accessible: true,
    accessibilityRole: ACCESSIBILITY_ROLES.PROGRESSBAR,
    accessibilityLabel: label,
    accessibilityHint: options.hint,
    accessibilityValue: {
      min: 0,
      max,
      now: progress,
      text: `${percentage} percent`,
    },
  };
}

/**
 * Create accessibility props for a list item
 */
export function createListItemA11yProps(
  label: string,
  options: {
    position?: number;
    size?: number;
    selected?: boolean;
    hint?: string;
  } = {}
) {
  let accessibilityLabel = label;
  if (options.position && options.size) {
    accessibilityLabel += `, ${options.position} of ${options.size}`;
  }

  return {
    accessible: true,
    accessibilityLabel,
    accessibilityHint: options.hint,
    accessibilityState: {
      selected: options.selected || false,
    },
  };
}

/**
 * Create accessibility props for a modal
 */
export function createModalA11yProps(
  title: string,
  options: {
    hint?: string;
  } = {}
) {
  return {
    accessible: true,
    accessibilityViewIsModal: true,
    accessibilityLabel: title,
    accessibilityHint: options.hint,
    accessibilityRole: ACCESSIBILITY_ROLES.ALERT,
  };
}

/**
 * Format time for screen readers
 */
export function formatTimeForScreenReader(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format currency for screen readers
 */
export function formatCurrencyForScreenReader(amount: number): string {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);

  if (cents === 0) {
    return `${dollars} dollar${dollars !== 1 ? 's' : ''}`;
  }

  return `${dollars} dollar${dollars !== 1 ? 's' : ''} and ${cents} cent${cents !== 1 ? 's' : ''}`;
}

/**
 * Group related form fields for screen readers
 */
export function createFieldsetA11yProps(legend: string) {
  return {
    accessible: true,
    accessibilityLabel: legend,
    accessibilityRole: 'none' as const, // React Native doesn't have a fieldset role
    importantForAccessibility: 'yes' as const,
  };
}

/**
 * Create live region for dynamic content
 */
export function createLiveRegionA11yProps(
  priority: 'polite' | 'assertive' = 'polite'
) {
  return {
    accessible: true,
    accessibilityLiveRegion: priority,
    importantForAccessibility: 'yes' as const,
  };
}

/**
 * Helper to check if component meets minimum touch target size
 */
export function validateTouchTargetSize(
  width: number,
  height: number
): { isValid: boolean; message?: string } {
  const minSize = TOUCH_TARGET_SIZE.MIN_SIZE;

  if (width < minSize || height < minSize) {
    return {
      isValid: false,
      message: `Touch target too small. Minimum size is ${minSize}x${minSize}dp. Current: ${width}x${height}dp`,
    };
  }

  return { isValid: true };
}

/**
 * Generate unique ID for accessibility relationships
 */
let idCounter = 0;
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}_${++idCounter}_${Date.now()}`;
}

/**
 * Hook-like function to manage focus restoration
 */
export class FocusManager {
  private previousFocus: unknown = null;

  saveFocus(ref: unknown): void {
    this.previousFocus = ref;
  }

  restoreFocus(): void {
    if (this.previousFocus) {
      setAccessibilityFocus(this.previousFocus);
      this.previousFocus = null;
    }
  }
}

/**
 * Export all utilities as a namespace
 */
export const MobileAccessibility = {
  // Announcements
  announceForAccessibility,

  // Status checks
  isScreenReaderEnabled,
  isReduceMotionEnabled,
  isBoldTextEnabled,
  isGrayscaleEnabled,
  isInvertColorsEnabled,

  // Focus management
  setAccessibilityFocus,
  FocusManager,

  // Component props helpers
  createButtonA11yProps,
  createLinkA11yProps,
  createImageA11yProps,
  createInputA11yProps,
  createCheckboxA11yProps,
  createRadioA11yProps,
  createSwitchA11yProps,
  createProgressA11yProps,
  createListItemA11yProps,
  createModalA11yProps,
  createFieldsetA11yProps,
  createLiveRegionA11yProps,

  // Formatters
  formatTimeForScreenReader,
  formatCurrencyForScreenReader,

  // Validation
  validateTouchTargetSize,

  // Utilities
  generateA11yId,

  // Constants
  ACCESSIBILITY_ROLES,
  ACCESSIBILITY_STATES,
  TOUCH_TARGET_SIZE,
} as const;

export default MobileAccessibility;