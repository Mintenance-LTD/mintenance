/**
 * Dynamic Import Utilities
 * Optimizes bundle size by lazy loading heavy components
 */

import dynamic from 'next/dynamic';
import { ComponentType, Suspense } from 'react';

// Loading fallbacks for different component types
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export const LoadingCard = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);

export const LoadingChart = () => (
  <div className="animate-pulse bg-white rounded-lg shadow p-6 h-64">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="flex h-48 items-end space-x-2">
      <div className="w-1/6 bg-gray-200 rounded h-3/4"></div>
      <div className="w-1/6 bg-gray-200 rounded h-full"></div>
      <div className="w-1/6 bg-gray-200 rounded h-2/3"></div>
      <div className="w-1/6 bg-gray-200 rounded h-5/6"></div>
      <div className="w-1/6 bg-gray-200 rounded h-1/2"></div>
      <div className="w-1/6 bg-gray-200 rounded h-4/5"></div>
    </div>
  </div>
);

export const LoadingTable = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-10 mb-2 rounded"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-gray-100 h-12 mb-1 rounded"></div>
    ))}
  </div>
);

export const LoadingForm = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
      </div>
    ))}
    <div className="h-10 bg-primary/20 rounded"></div>
  </div>
);

interface DynamicImportOptions {
  loading?: ComponentType;
  ssr?: boolean;
  suspense?: boolean;
}

/**
 * Enhanced dynamic import with consistent loading states
 */
export function dynamicImport<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: DynamicImportOptions = {}
) {
  const { loading = LoadingSpinner, ssr = false, suspense = false } = options;

  if (suspense) {
    // Use React Suspense for loading
    return dynamic(importFn, {
      ssr,
      suspense: true,
    });
  }

  return dynamic(importFn, {
    loading,
    ssr,
  });
}

/**
 * Preload a dynamic component
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
) {
  // Trigger the import to start loading
  importFn();
}

/**
 * Dynamic imports for heavy third-party libraries
 */
export const DynamicChart = dynamicImport(
  () => import('@/components/ui/EnhancedChart'),
  { loading: LoadingChart }
);

export const DynamicMap = dynamicImport(
  () => import('@/app/jobs/[id]/components/JobLocationMap'),
  { loading: LoadingCard }
);

export const DynamicStripeElements = dynamicImport(
  () => import('@/app/jobs/[id]/payment/components/StripePaymentElement2025'),
  { loading: LoadingForm, ssr: false }
);

export const DynamicVideoCall = dynamicImport(
  () => import('@/app/video-calls/page'),
  { loading: LoadingCard, ssr: false }
);

export const DynamicImageUpload = dynamicImport(
  () => import('@/app/contractor/jobs/[id]/components/JobPhotoUpload'),
  { loading: LoadingCard, ssr: false }
);

export const DynamicRichTextEditor = dynamicImport(
  () => import('@/components/ui/RichTextEditor'),
  { loading: LoadingForm, ssr: false }
);

export const DynamicDataTable = dynamicImport(
  () => import('@/components/ui/DataTable'),
  { loading: LoadingTable }
);

export const DynamicCalendar = dynamicImport(
  () => import('@/app/contractor/calendar/page'),
  { loading: LoadingCard }
);

export const DynamicAnalyticsDashboard = dynamicImport(
  () => import('@/app/analytics/components/AnalyticsClient'),
  { loading: LoadingChart }
);

export const DynamicAIAssessment = dynamicImport(
  () => import('@/components/landing/AIAssessmentShowcase'),
  { loading: LoadingCard }
);

/**
 * Route-based code splitting helpers
 */
export const routeBasedImports = {
  // Admin routes
  admin: {
    Dashboard: () => dynamicImport(() => import('@/app/admin/dashboard/page')),
    Analytics: () => dynamicImport(() => import('@/app/admin/analytics-detail/page')),
    Revenue: () => dynamicImport(() => import('@/app/admin/revenue/page')),
    Security: () => dynamicImport(() => import('@/app/admin/security/page')),
    AIMonitoring: () => dynamicImport(() => import('@/app/admin/ai-monitoring/page')),
  },

  // Contractor routes
  contractor: {
    Dashboard: () => dynamicImport(() => import('@/app/contractor/dashboard-enhanced/components/ContractorDashboard2025Client')),
    Discover: () => dynamicImport(() => import('@/app/contractor/discover/components/ContractorDiscoverClient')),
    Profile: () => dynamicImport(() => import('@/app/contractor/profile/components/ContractorProfileClient2025')),
    Jobs: () => dynamicImport(() => import('@/app/contractor/jobs/page')),
    Bid: () => dynamicImport(() => import('@/app/contractor/bid/[jobId]/components/BidSubmissionClient2025')),
  },

  // Homeowner routes
  homeowner: {
    Dashboard: () => dynamicImport(() => import('@/app/dashboard/components/DashboardClient')),
    Jobs: () => dynamicImport(() => import('@/app/jobs/page')),
    CreateJob: () => dynamicImport(() => import('@/app/jobs/create/page')),
    Properties: () => dynamicImport(() => import('@/app/properties/components/PropertiesClient2025')),
    Contractors: () => dynamicImport(() => import('@/app/contractors/components/ContractorsBrowseClient')),
  },

  // Common heavy components
  common: {
    Chat: () => dynamicImport(() => import('@/app/messages/page'), { ssr: false }),
    VideoCall: () => dynamicImport(() => import('@/app/video-calls/page'), { ssr: false }),
    Scheduling: () => dynamicImport(() => import('@/app/scheduling/components/SchedulingClient2025')),
    Payments: () => dynamicImport(() => import('@/app/payments/page')),
    Settings: () => dynamicImport(() => import('@/app/settings/page')),
  },
};

/**
 * Intersection Observer based lazy loading
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      onIntersect();
      observer.disconnect();
    }
  }, {
    rootMargin: '50px',
    ...options,
  });

  if (ref.current) {
    observer.observe(ref.current);
  }

  return () => observer.disconnect();
}

/**
 * Prefetch dynamic imports on hover/focus
 */
export function usePrefetch(importFn: () => Promise<any>) {
  const prefetch = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFn());
    } else {
      setTimeout(() => importFn(), 0);
    }
  };

  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
    onTouchStart: prefetch,
  };
}

/**
 * Bundle size monitoring utility
 */
export function reportBundleSize() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
    return;
  }

  // Report bundle metrics to analytics
  if ('performance' in window && 'measure' in performance) {
    try {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const metrics = {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        domInteractive: perfData.domInteractive,
        transferSize: perfData.transferSize,
        encodedBodySize: perfData.encodedBodySize,
        decodedBodySize: perfData.decodedBodySize,
      };

      // Send to analytics
      console.log('Bundle Performance Metrics:', metrics);
    } catch (error) {
      console.error('Failed to collect bundle metrics:', error);
    }
  }
}

/**
 * Progressive enhancement wrapper
 */
export function withProgessiveEnhancement<P extends object>(
  ServerComponent: ComponentType<P>,
  ClientComponent: ComponentType<P>
): ComponentType<P> {
  if (typeof window === 'undefined') {
    return ServerComponent;
  }

  return ClientComponent;
}

// Auto-report bundle size in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', reportBundleSize);
}