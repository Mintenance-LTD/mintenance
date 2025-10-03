/**
 * Web Optimizations - Type Definitions
 * Centralized type definitions for web optimization modules
 */

export interface PWAConfig {
  appName: string;
  shortName?: string;
  appDescription: string;
  themeColor: string;
  backgroundColor: string;
  iconSizes: number[];
  manifestPath?: string;
  display?: string;
  orientation?: string;
  scope?: string;
  startUrl?: string;
  icons?: PWAIcon[];
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableLazyLoading: boolean;
  enableProgressiveJPEG: boolean;
  compressionQuality: number;
  enableCriticalResourceHints: boolean;
}

export interface SEOConfig {
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string[];
  twitterHandle?: string;
  facebookAppId?: string;
  enableStructuredData: boolean;
}

export interface AnalyticsConfig {
  googleAnalyticsId?: string;
  enableUserTiming: boolean;
  enableScrollDepthTracking: boolean;
  enableCustomEvents: boolean;
  enableConversionTracking: boolean;
}

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableAriaLabels: boolean;
  enableFocusIndicators: boolean;
  enableScreenReaderOptimizations: boolean;
}

export interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

export interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface ScrollDepth {
  depth: number;
  timestamp: number;
  url: string;
}

export interface UserEngagement {
  timeOnPage: number;
  interactions: number;
  scrollDepth: number;
  bounced: boolean;
}

export interface WebOptimizationConfig {
  pwa?: PWAConfig;
  image?: ImageOptimizationConfig;
  seo?: SEOConfig;
  analytics?: AnalyticsConfig;
  accessibility?: AccessibilityConfig;
}