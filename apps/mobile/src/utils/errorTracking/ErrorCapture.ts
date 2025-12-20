/**
 * Error Capture Module
 * Handles error capturing, signature generation, and breadcrumb tracking
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { ErrorTracker } from '../errorTracking';
import {
  ErrorContext,
  ErrorOccurrence,
  Breadcrumb,
  ErrorCategory,
  ErrorSeverity
} from './ErrorTypes';

export class ErrorCapture {
  private sessionBreadcrumbs = new Map<string, Breadcrumb[]>();
  private currentSessionId: string;

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.initializeSession();
    this.setupGlobalErrorInterception();
  }

  /**
   * Initialize session tracking
   */
  initializeSession(): void {
    this.currentSessionId = this.generateSessionId();
    this.sessionBreadcrumbs.set(this.currentSessionId, []);

    // Track session start
    this.addBreadcrumb(
      'Session started',
      'session',
      'info',
      {
        sessionId: this.currentSessionId,
        platform: Platform.OS,
        timestamp: Date.now()
      }
    );
  }

  /**
   * Generate error signature for pattern recognition
   */
  generateErrorSignature(error: Error, context: ErrorContext): string {
    const errorType = error.name || 'Error';
    const errorMessage = this.normalizeErrorMessage(error.message);
    const location = context.screen || context.feature || 'unknown';
    const action = context.action || 'unknown';

    return `${errorType}:${errorMessage}:${location}:${action}`;
  }

  /**
   * Create error occurrence object
   */
  createErrorOccurrence(
    error: Error,
    context: ErrorContext,
    userId?: string
  ): ErrorOccurrence {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      userId,
      sessionId: this.currentSessionId,
      context,
      stackTrace: error.stack || '',
      environment: this.getEnvironmentInfo(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      breadcrumbs: this.getSessionBreadcrumbs()
    };
  }

  /**
   * Add breadcrumb for user journey tracking
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      category,
      message,
      level,
      data
    };

    // Add to session breadcrumbs
    const sessionBreadcrumbs = this.sessionBreadcrumbs.get(this.currentSessionId) || [];
    sessionBreadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs per session
    if (sessionBreadcrumbs.length > 50) {
      sessionBreadcrumbs.shift();
    }

    this.sessionBreadcrumbs.set(this.currentSessionId, sessionBreadcrumbs);

    // Also add to original error tracker
    ErrorTracker.addBreadcrumb(message, category, level, data);
  }

  /**
   * Get session breadcrumbs
   */
  getSessionBreadcrumbs(): Breadcrumb[] {
    return this.sessionBreadcrumbs.get(this.currentSessionId) || [];
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Clean old breadcrumbs
   */
  cleanOldBreadcrumbs(oneWeekAgo: number): void {
    for (const [sessionId, breadcrumbs] of this.sessionBreadcrumbs.entries()) {
      if (breadcrumbs.length === 0 || breadcrumbs[breadcrumbs.length - 1].timestamp < oneWeekAgo) {
        this.sessionBreadcrumbs.delete(sessionId);
      }
    }
  }

  /**
   * Get breadcrumbs count
   */
  getBreadcrumbsCount(): number {
    return this.sessionBreadcrumbs.size;
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.sessionBreadcrumbs.clear();
    this.initializeSession();
  }

  /**
   * Private helper methods
   */
  private normalizeErrorMessage(message: string): string {
    // Normalize error messages for better pattern matching
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase()
      .slice(0, 100); // Limit length
  }

  private getEnvironmentInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      device: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      network: typeof navigator !== 'undefined' && 'connection' in navigator
        ? (navigator as any).connection?.effectiveType
        : 'unknown'
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorInterception(): void {
    // Intercept console errors for additional tracking
    if (typeof console !== 'undefined') {
      const originalError = console.error;
      console.error = (...args) => {
        this.addBreadcrumb(
          `Console error: ${args[0]}`,
          'console',
          'error',
          { args: args.slice(1) }
        );
        originalError.apply(console, args);
      };
    }
  }
}
