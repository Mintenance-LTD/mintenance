/**
 * Accessibility Manager Module
 * Handles accessibility features including keyboard navigation,
 * ARIA labels, focus management, and screen reader optimizations
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { AccessibilityConfig } from './types';

export class AccessibilityManager {
  private isUsingMouse = false;
  private focusTrapStack: HTMLElement[] = [];

  constructor(private config: AccessibilityConfig) {}

  /**
   * Initialize accessibility features
   */
  initialize(): void {
    if (Platform.OS !== 'web') return;

    try {
      logger.info('AccessibilityManager', 'Initializing accessibility features');

      // Setup keyboard navigation
      if (this.config.enableKeyboardNavigation) {
        this.setupKeyboardNavigation();
      }

      // Setup focus indicators
      if (this.config.enableFocusIndicators) {
        this.setupFocusIndicators();
      }

      // Setup skip to main content link
      this.setupSkipLink();

      // Setup user preferences detection
      this.setupUserPreferences();

      // Setup ARIA live regions
      if (this.config.enableScreenReaderOptimizations) {
        this.setupAriaLiveRegions();
      }

      logger.info('AccessibilityManager', 'Accessibility initialized successfully');
    } catch (error) {
      logger.error('AccessibilityManager', 'Failed to initialize accessibility', error);
    }
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }

      // Tab key to show focus indicators
      if (e.key === 'Tab') {
        this.isUsingMouse = false;
        document.body.classList.remove('mouse-navigation');
      }
    });

    // Track mouse usage
    document.addEventListener('mousedown', () => {
      this.isUsingMouse = true;
      document.body.classList.add('mouse-navigation');
    });

    // Focus management on focusin
    document.addEventListener('focusin', () => {
      if (!this.isUsingMouse) {
        document.body.classList.remove('mouse-navigation');
      }
    });

    logger.info('AccessibilityManager', 'Keyboard navigation configured');
  }

  /**
   * Handle Escape key press
   */
  private handleEscapeKey(): void {
    // Find topmost modal
    const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    if (modals.length > 0) {
      const topModal = modals[modals.length - 1];
      const closeButton = topModal.querySelector('[aria-label*="close" i], [data-close]');

      if (closeButton) {
        (closeButton as HTMLElement).click();
        logger.debug('AccessibilityManager', 'Modal closed via Escape key');
      }
    }
  }

  /**
   * Setup focus indicators
   */
  private setupFocusIndicators(): void {
    // Add CSS for focus indicators
    const style = document.createElement('style');
    style.textContent = `
      /* Show focus outline only when using keyboard */
      body.mouse-navigation *:focus {
        outline: none;
      }

      body:not(.mouse-navigation) *:focus {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }

      /* Skip link styles */
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
        z-index: 10000;
      }

      .skip-link:focus {
        position: fixed;
        left: 6px;
        top: 7px;
        width: auto;
        height: auto;
        padding: 8px 16px;
        background: #000;
        color: #fff;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
      }

      /* High contrast mode */
      body.high-contrast {
        filter: contrast(1.5);
      }

      /* Reduced motion */
      body.reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);

    logger.info('AccessibilityManager', 'Focus indicators configured');
  }

  /**
   * Setup skip to main content link
   */
  private setupSkipLink(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.setAttribute('aria-label', 'Skip to main content');

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const mainContent = document.getElementById('main-content') || document.querySelector('main');

      if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        mainContent.scrollIntoView({ behavior: 'smooth' });
        logger.debug('AccessibilityManager', 'Skipped to main content');
      }
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    logger.info('AccessibilityManager', 'Skip link configured');
  }

  /**
   * Setup user preference detection
   */
  private setupUserPreferences(): void {
    if (!window.matchMedia) return;

    // High contrast mode detection
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.handleHighContrast(highContrastQuery.matches);
    highContrastQuery.addEventListener('change', (e) => {
      this.handleHighContrast(e.matches);
    });

    // Reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.handleReducedMotion(reducedMotionQuery.matches);
    reducedMotionQuery.addEventListener('change', (e) => {
      this.handleReducedMotion(e.matches);
    });

    // Dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.handleDarkMode(darkModeQuery.matches);
    darkModeQuery.addEventListener('change', (e) => {
      this.handleDarkMode(e.matches);
    });

    logger.info('AccessibilityManager', 'User preferences configured');
  }

  /**
   * Handle high contrast preference
   */
  private handleHighContrast(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    logger.debug('AccessibilityManager', 'High contrast mode', { enabled });
  }

  /**
   * Handle reduced motion preference
   */
  private handleReducedMotion(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }

    logger.debug('AccessibilityManager', 'Reduced motion', { enabled });
  }

  /**
   * Handle dark mode preference
   */
  private handleDarkMode(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    logger.debug('AccessibilityManager', 'Dark mode', { enabled });
  }

  /**
   * Setup ARIA live regions
   */
  private setupAriaLiveRegions(): void {
    // Create polite live region for non-urgent announcements
    const politeLiveRegion = document.createElement('div');
    politeLiveRegion.id = 'aria-live-polite';
    politeLiveRegion.setAttribute('aria-live', 'polite');
    politeLiveRegion.setAttribute('aria-atomic', 'true');
    politeLiveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(politeLiveRegion);

    // Create assertive live region for urgent announcements
    const assertiveLiveRegion = document.createElement('div');
    assertiveLiveRegion.id = 'aria-live-assertive';
    assertiveLiveRegion.setAttribute('aria-live', 'assertive');
    assertiveLiveRegion.setAttribute('aria-atomic', 'true');
    assertiveLiveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(assertiveLiveRegion);

    logger.info('AccessibilityManager', 'ARIA live regions configured');
  }

  /**
   * Announce message to screen reader
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (Platform.OS !== 'web') return;

    const regionId = priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-polite';
    const liveRegion = document.getElementById(regionId);

    if (liveRegion) {
      liveRegion.textContent = message;

      // Clear after 3 seconds
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 3000);

      logger.debug('AccessibilityManager', 'Announcement made', { message, priority });
    }
  }

  /**
   * Trap focus within element (for modals)
   */
  trapFocus(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    this.focusTrapStack.push(element);

    // Focus first element
    firstElement.focus();

    logger.debug('AccessibilityManager', 'Focus trapped', { element: element.id });
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    const element = this.focusTrapStack.pop();
    if (element) {
      logger.debug('AccessibilityManager', 'Focus trap released', { element: element.id });
    }
  }

  /**
   * Set page title for screen readers
   */
  setPageTitle(title: string): void {
    if (Platform.OS !== 'web') return;

    document.title = title;
    this.announce(`Navigated to ${title}`, 'polite');

    logger.debug('AccessibilityManager', 'Page title set', { title });
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    if (Platform.OS !== 'web') return false;

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if user prefers high contrast
   */
  prefersHighContrast(): boolean {
    if (Platform.OS !== 'web') return false;

    return window.matchMedia('(prefers-contrast: high)').matches;
  }
}
