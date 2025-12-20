/**
 * Web Optimizations - Main Orchestrator
 * Coordinates all web optimization modules and provides unified API
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { PWAManager } from './PWAManager';
import { SEOManager } from './SEOManager';
import { PerformanceTracker } from './PerformanceTracker';
import { ImageOptimizer } from './ImageOptimizer';
import { AccessibilityManager } from './AccessibilityManager';
import {
  PWAConfig,
  SEOConfig,
  AnalyticsConfig,
  ImageOptimizationConfig,
  AccessibilityConfig,
  WebOptimizationConfig,
  PerformanceMetrics,
} from './types';

/**
 * Default configurations
 */
export const defaultConfigs = {
  pwa: {
    appName: 'Mintenance',
    shortName: 'Mintenance',
    appDescription: 'Professional contractor discovery and home maintenance platform',
    themeColor: '#2563eb',
    backgroundColor: '#ffffff',
    iconSizes: [72, 96, 128, 144, 152, 192, 384, 512],
  } as PWAConfig,

  seo: {
    siteName: 'Mintenance',
    defaultTitle: 'Mintenance - Professional Contractor Discovery',
    defaultDescription:
      'Connect with verified contractors for home maintenance, repairs, and improvement projects. Professional, reliable, and affordable.',
    defaultKeywords: [
      'contractor',
      'home maintenance',
      'repairs',
      'improvement',
      'professional',
      'handyman',
      'home services',
    ],
    enableStructuredData: true,
  } as SEOConfig,

  analytics: {
    enableUserTiming: true,
    enableScrollDepthTracking: true,
    enableCustomEvents: true,
    enableConversionTracking: true,
  } as AnalyticsConfig,

  imageOptimization: {
    enableWebP: true,
    enableLazyLoading: true,
    enableProgressiveJPEG: true,
    compressionQuality: 85,
    enableCriticalResourceHints: true,
  } as ImageOptimizationConfig,

  accessibility: {
    enableKeyboardNavigation: true,
    enableAriaLabels: true,
    enableFocusIndicators: true,
    enableScreenReaderOptimizations: true,
  } as AccessibilityConfig,
};

/**
 * Main Web Optimizations Manager
 */
export class WebOptimizationsManager {
  private static instance: WebOptimizationsManager;
  private isInitialized = false;

  private pwaManager?: PWAManager;
  private seoManager?: SEOManager;
  private performanceTracker?: PerformanceTracker;
  private imageOptimizer?: ImageOptimizer;
  private accessibilityManager?: AccessibilityManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WebOptimizationsManager {
    if (!this.instance) {
      this.instance = new WebOptimizationsManager();
    }
    return this.instance;
  }

  /**
   * Initialize all web optimizations
   */
  async initialize(config: WebOptimizationConfig = {}): Promise<void> {
    if (Platform.OS !== 'web' || this.isInitialized) return;

    try {
      logger.info('WebOptimizationsManager', 'Initializing web optimizations');

      // Merge with default configs
      const pwaConfig = { ...defaultConfigs.pwa, ...config.pwa };
      const seoConfig = { ...defaultConfigs.seo, ...config.seo };
      const analyticsConfig = { ...defaultConfigs.analytics, ...config.analytics };
      const imageConfig = { ...defaultConfigs.imageOptimization, ...config.image };
      const accessibilityConfig = { ...defaultConfigs.accessibility, ...config.accessibility };

      // Initialize modules
      this.pwaManager = new PWAManager(pwaConfig);
      this.seoManager = new SEOManager(seoConfig);
      this.performanceTracker = new PerformanceTracker(analyticsConfig);
      this.imageOptimizer = new ImageOptimizer(imageConfig);
      this.accessibilityManager = new AccessibilityManager(accessibilityConfig);

      // Initialize all modules in parallel
      await Promise.all([
        this.pwaManager.initialize(),
        this.seoManager.initialize(),
        this.performanceTracker.initialize(),
        this.imageOptimizer.initialize(),
        this.accessibilityManager.initialize(),
      ]);

      this.isInitialized = true;

      logger.info('WebOptimizationsManager', 'All web optimizations initialized successfully');
    } catch (error) {
      logger.error('WebOptimizationsManager', 'Failed to initialize web optimizations', error);
      throw error;
    }
  }

  /**
   * PWA Methods
   */
  isPWAInstalled(): boolean {
    return this.pwaManager?.isPWAInstalled() ?? false;
  }

  getServiceWorker(): ServiceWorkerRegistration | undefined {
    return this.pwaManager?.getServiceWorker();
  }

  /**
   * SEO Methods
   */
  updatePageTitle(title: string): void {
    this.seoManager?.updateTitle(title);
  }

  updatePageDescription(description: string): void {
    this.seoManager?.updateDescription(description);
  }

  updatePageMetadata(metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: string;
  }): void {
    this.seoManager?.updatePageMetadata(metadata);
  }

  setCanonicalUrl(url: string): void {
    this.seoManager?.setCanonicalUrl(url);
  }

  /**
   * Performance Tracking Methods
   */
  trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    this.performanceTracker?.trackEvent(eventName, properties);
  }

  trackTiming(category: string, variable: string, value: number): void {
    this.performanceTracker?.trackTiming(category, variable, value);
  }

  getWebVitals(): PerformanceMetrics {
    return this.performanceTracker?.getPerformanceMetrics() ?? {};
  }

  getSessionDuration(): number {
    return this.performanceTracker?.getSessionDuration() ?? 0;
  }

  /**
   * Image Optimization Methods
   */
  preloadImage(src: string, type?: string): void {
    this.imageOptimizer?.preloadImage(src, type);
  }

  isWebPSupported(): boolean {
    return this.imageOptimizer?.isWebPSupported() ?? false;
  }

  getOptimizedImageUrl(url: string): string {
    return this.imageOptimizer?.getOptimizedImageUrl(url) ?? url;
  }

  /**
   * Accessibility Methods
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.accessibilityManager?.announce(message, priority);
  }

  trapFocus(element: HTMLElement): void {
    this.accessibilityManager?.trapFocus(element);
  }

  releaseFocusTrap(): void {
    this.accessibilityManager?.releaseFocusTrap();
  }

  setPageTitle(title: string): void {
    this.accessibilityManager?.setPageTitle(title);
  }

  prefersReducedMotion(): boolean {
    return this.accessibilityManager?.prefersReducedMotion() ?? false;
  }

  prefersHighContrast(): boolean {
    return this.accessibilityManager?.prefersHighContrast() ?? false;
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    if (!this.isInitialized) return;

    try {
      this.pwaManager?.unregister();
      this.imageOptimizer?.dispose();

      this.pwaManager = undefined;
      this.seoManager = undefined;
      this.performanceTracker = undefined;
      this.imageOptimizer = undefined;
      this.accessibilityManager = undefined;

      this.isInitialized = false;

      logger.info('WebOptimizationsManager', 'Web optimizations disposed');
    } catch (error) {
      logger.error('WebOptimizationsManager', 'Error disposing web optimizations', error);
    }
  }
}

// Export singleton instance
export const webOptimizationsManager = WebOptimizationsManager.getInstance();

// Export types
export type {
  PWAConfig,
  SEOConfig,
  AnalyticsConfig,
  ImageOptimizationConfig,
  AccessibilityConfig,
  WebOptimizationConfig,
  PerformanceMetrics,
};

// Export individual managers for advanced usage
export { PWAManager, SEOManager, PerformanceTracker, ImageOptimizer, AccessibilityManager };
