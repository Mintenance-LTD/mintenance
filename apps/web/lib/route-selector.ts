/**
 * Route Selector Utility
 * Handles version routing logic for gradual rollout of 2025 UI
 *
 * This utility provides functions for:
 * - Determining which UI version to show based on feature flags
 * - Getting page paths with version suffix
 * - Managing user version preferences
 */

import { cookies, headers } from 'next/headers';
import { logger } from '@mintenance/shared';

// ==========================================================
// TYPES
// ==========================================================

export type UIVersion = '2025' | 'current';

export interface RouteConfig {
  /** Base path of the route (e.g., '/dashboard') */
  path: string;
  /** Whether the 2025 version exists for this route */
  has2025Version: boolean;
  /** Custom rollout percentage override for this route (0-100) */
  customRolloutPercentage?: number;
}

export interface VersionContext {
  /** Current UI version being served */
  version: UIVersion;
  /** Whether user is in beta program */
  isBetaUser: boolean;
  /** User's explicit preference (if set) */
  userPreference: UIVersion | null;
  /** Current rollout percentage */
  rolloutPercentage: number;
}

// ==========================================================
// CONFIGURATION
// ==========================================================

/**
 * Routes that have 2025 versions available
 * Automatically detected from page2025.tsx files
 */
const ROUTES_WITH_2025: string[] = [
  '/dashboard',
  '/jobs',
  '/jobs/create',
  '/jobs/[id]',
  '/jobs/[id]/edit',
  '/jobs/[id]/review',
  '/messages',
  '/notifications',
  '/settings',
  '/profile',
  '/payments',
  '/payments/[transactionId]',
  '/payment-methods',
  '/properties',
  '/properties/add',
  '/properties/[id]',
  '/favorites',
  '/scheduling',
  '/analytics',
  '/video-calls',
  '/find-contractors',
  '/contractors/[id]',
  '/invoices/[invoiceId]',
  '/help',
  '/contact',
  '/pricing',
  '/about',
  '/blog',
  '/faq',
  '/how-it-works',
  // Contractor routes
  '/contractor/dashboard-enhanced',
  '/contractor/profile',
  '/contractor/bid',
  '/contractor/bid/[jobId]',
  '/contractor/jobs',
  '/contractor/quotes',
  '/contractor/calendar',
  '/contractor/finance',
  '/contractor/expenses',
  '/contractor/reporting',
  '/contractor/documents',
  '/contractor/portfolio',
  '/contractor/reviews',
  '/contractor/settings',
  '/contractor/certifications',
  '/contractor/insurance',
  '/contractor/verification',
  '/contractor/subscription',
  '/contractor/team',
  '/contractor/tools',
  '/contractor/resources',
  '/contractor/marketing',
  '/contractor/social',
  '/contractor/discover',
  '/contractor/connections',
  '/contractor/time-tracking',
  // Admin routes
  '/admin/dashboard',
  '/admin/users',
  '/admin/payments/fees',
  '/admin/revenue',
  '/admin/security',
  '/admin/system-settings',
  '/admin/communications',
  '/admin/analytics-detail',
  '/admin/audit-logs',
  '/admin/api-documentation',
  '/admin/building-assessments',
];

// ==========================================================
// SERVER-SIDE FUNCTIONS
// ==========================================================

/**
 * Get the current UI version from server-side headers
 * Set by middleware based on feature flags
 */
export async function getUIVersion(): Promise<UIVersion> {
  const headerList = await headers();
  const version = headerList.get('x-ui-version');
  return version === '2025' ? '2025' : 'current';
}

/**
 * Get full version context for the current request
 */
export async function getVersionContext(): Promise<VersionContext> {
  const headerList = await headers();
  const cookieStore = await cookies();

  const version = (headerList.get('x-ui-version') as UIVersion) || 'current';
  const isBetaUser = cookieStore.get('beta-features')?.value === 'true';
  const userPreference = cookieStore.get('dashboard-version')?.value as UIVersion | null;
  const rolloutPercentage = parseInt(
    process.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE || '0',
    10
  );

  return {
    version,
    isBetaUser,
    userPreference,
    rolloutPercentage: isNaN(rolloutPercentage) ? 0 : rolloutPercentage,
  };
}

/**
 * Check if a route has a 2025 version available
 */
export function hasVersion2025(path: string): boolean {
  // Normalize path (remove trailing slash, handle dynamic segments)
  const normalizedPath = normalizePath(path);
  return ROUTES_WITH_2025.includes(normalizedPath);
}

/**
 * Get the page suffix based on version
 * Returns 'page2025' for 2025 version, 'page' for current
 */
export async function getPageSuffix(): Promise<string> {
  const version = await getUIVersion();
  return version === '2025' ? 'page2025' : 'page';
}

/**
 * Determine if 2025 UI should be shown for a specific route
 * Considers route-specific overrides and global settings
 */
export async function shouldShow2025UI(path?: string): Promise<boolean> {
  const version = await getUIVersion();

  // If path provided, check if 2025 version exists for this route
  if (path && !hasVersion2025(path)) {
    return false;
  }

  return version === '2025';
}

// ==========================================================
// CLIENT-SIDE FUNCTIONS (for use in client components)
// ==========================================================

/**
 * Check if 2025 UI is enabled (client-side)
 * Uses environment variable for client-side check
 */
export function is2025EnabledClient(): boolean {
  // Kill switch
  if (typeof window !== 'undefined') {
    // Client-side: check environment variable
    return process.env.NEXT_PUBLIC_ENABLE_2025_DASHBOARD === 'true';
  }
  return false;
}

/**
 * Get rollout percentage (client-side safe)
 */
export function getRolloutPercentageClient(): number {
  const percentage = process.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE;
  if (!percentage) return 0;

  const parsed = parseInt(percentage, 10);
  return isNaN(parsed) || parsed < 0 || parsed > 100 ? 0 : parsed;
}

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

/**
 * Normalize a path for comparison
 * - Removes trailing slashes
 * - Converts dynamic segments to [param] format
 */
function normalizePath(path: string): string {
  // Remove trailing slash
  let normalized = path.replace(/\/$/, '') || '/';

  // Convert UUID segments to [param] format
  // Matches standard UUIDs: 550e8400-e29b-41d4-a716-446655440000
  normalized = normalized.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/[id]'
  );

  // Convert numeric-only segments to [param] format
  normalized = normalized.replace(/\/\d+(?=\/|$)/g, '/[id]');

  return normalized;
}

/**
 * Log version routing decision for analytics
 */
export async function logVersionRouting(
  path: string,
  version: UIVersion,
  reason: string
): Promise<void> {
  logger.info('Version routing decision', {
    service: 'route-selector',
    path,
    version,
    reason,
    timestamp: new Date().toISOString(),
  });
}

// ==========================================================
// COOKIE MANAGEMENT
// ==========================================================

/**
 * Cookie names for version preferences
 * Uses __Host- prefix in production for security
 */
export function getVersionCookieName(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? 'dashboard-version' : '__Host-dashboard-version';
}

/**
 * Beta features cookie name
 */
export function getBetaCookieName(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? 'beta-features' : '__Host-beta-features';
}

// ==========================================================
// ROLLOUT CONTROL
// ==========================================================

/**
 * Feature flag status summary for debugging/admin
 */
export async function getFeatureFlagStatus(): Promise<{
  globalEnabled: boolean;
  killSwitchActive: boolean;
  rolloutPercentage: number;
  totalRoutes: number;
  environment: string;
}> {
  return {
    globalEnabled: process.env.NEXT_PUBLIC_ENABLE_2025_DASHBOARD === 'true',
    killSwitchActive: process.env.DISABLE_2025_PAGES === 'true',
    rolloutPercentage: getRolloutPercentageClient(),
    totalRoutes: ROUTES_WITH_2025.length,
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Export routes list for admin/debug purposes
 */
export function getRoutesWith2025(): string[] {
  return [...ROUTES_WITH_2025];
}

