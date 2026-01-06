/**
 * API Versioning Utilities
 *
 * Provides version negotiation and compatibility checks for the API.
 * Supports header-based and path-based versioning.
 *
 * Version Format: v{major}.{minor} (e.g., v1, v1.1, v2)
 *
 * @example
 * // In API route:
 * import { getAPIVersion, requireVersion, addVersionHeaders } from '@/lib/api-version';
 *
 * export async function GET(request: NextRequest) {
 *   const version = getAPIVersion(request);
 *   requireVersion(version, { min: 'v1', max: 'v2' });
 *
 *   const response = NextResponse.json({ data: 'example' });
 *   return addVersionHeaders(response, 'v1');
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current API version */
export const CURRENT_API_VERSION = 'v1';

/** Minimum supported API version */
export const MIN_API_VERSION = 'v1';

/** Deprecated versions that still work but show warnings */
export const DEPRECATED_VERSIONS: string[] = [];

/** Sunset versions that are no longer supported */
export const SUNSET_VERSIONS: string[] = [];

/** Header names for API version */
export const VERSION_HEADERS = {
  REQUEST: 'X-API-Version',
  RESPONSE: 'X-API-Version',
  DEPRECATED: 'X-API-Deprecated',
  SUNSET: 'X-API-Sunset-Date',
  MIN_SUPPORTED: 'X-API-Min-Version',
  LATEST: 'X-API-Latest-Version',
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface APIVersion {
  major: number;
  minor: number;
  raw: string;
}

export interface VersionConstraints {
  min?: string;
  max?: string;
  exact?: string;
}

export interface VersionInfo {
  current: string;
  requested: string;
  isDeprecated: boolean;
  isSunset: boolean;
  isSupported: boolean;
  sunsetDate?: string;
}

// ============================================================================
// VERSION PARSING
// ============================================================================

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): APIVersion | null {
  // Handle 'v1', 'v1.0', 'v1.1', '1', '1.0', etc.
  const normalized = version.toLowerCase().replace(/^v/, '');
  const parts = normalized.split('.');

  const major = parseInt(parts[0], 10);
  const minor = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(major)) {
    return null;
  }

  return {
    major,
    minor,
    raw: `v${major}${minor > 0 ? `.${minor}` : ''}`,
  };
}

/**
 * Compare two versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  if (!versionA || !versionB) {
    return 0;
  }

  if (versionA.major !== versionB.major) {
    return versionA.major < versionB.major ? -1 : 1;
  }

  if (versionA.minor !== versionB.minor) {
    return versionA.minor < versionB.minor ? -1 : 1;
  }

  return 0;
}

// ============================================================================
// VERSION EXTRACTION
// ============================================================================

/**
 * Extract API version from request
 * Priority: Header > Query param > Path > Default
 */
export function getAPIVersion(request: NextRequest): string {
  // 1. Check header (highest priority)
  const headerVersion = request.headers.get(VERSION_HEADERS.REQUEST);
  if (headerVersion) {
    const parsed = parseVersion(headerVersion);
    if (parsed) {
      return parsed.raw;
    }
  }

  // 2. Check query parameter
  const url = new URL(request.url);
  const queryVersion = url.searchParams.get('api_version') || url.searchParams.get('v');
  if (queryVersion) {
    const parsed = parseVersion(queryVersion);
    if (parsed) {
      return parsed.raw;
    }
  }

  // 3. Check path (e.g., /api/v1/users)
  const pathMatch = url.pathname.match(/\/api\/v(\d+(?:\.\d+)?)\//);
  if (pathMatch) {
    const parsed = parseVersion(pathMatch[1]);
    if (parsed) {
      return parsed.raw;
    }
  }

  // 4. Default to current version
  return CURRENT_API_VERSION;
}

// ============================================================================
// VERSION VALIDATION
// ============================================================================

/**
 * Check if a version is within constraints
 */
export function isVersionValid(
  version: string,
  constraints: VersionConstraints
): boolean {
  const parsed = parseVersion(version);
  if (!parsed) {
    return false;
  }

  // Check exact match
  if (constraints.exact) {
    return compareVersions(version, constraints.exact) === 0;
  }

  // Check minimum version
  if (constraints.min) {
    if (compareVersions(version, constraints.min) < 0) {
      return false;
    }
  }

  // Check maximum version
  if (constraints.max) {
    if (compareVersions(version, constraints.max) > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Get version info for a request
 */
export function getVersionInfo(requestedVersion: string): VersionInfo {
  const isDeprecated = DEPRECATED_VERSIONS.includes(requestedVersion);
  const isSunset = SUNSET_VERSIONS.includes(requestedVersion);
  const isSupported =
    !isSunset &&
    compareVersions(requestedVersion, MIN_API_VERSION) >= 0;

  return {
    current: CURRENT_API_VERSION,
    requested: requestedVersion,
    isDeprecated,
    isSunset,
    isSupported,
    sunsetDate: isSunset ? '2025-01-01' : undefined,
  };
}

/**
 * Require a specific version range (throws error if not met)
 */
export function requireVersion(
  version: string,
  constraints: VersionConstraints
): void {
  const info = getVersionInfo(version);

  // Check if version is sunset
  if (info.isSunset) {
    logger.warn('API version sunset', { version });
    throw new APIVersionError(
      `API version ${version} is no longer supported. Please upgrade to ${CURRENT_API_VERSION}.`,
      'VERSION_SUNSET',
      410
    );
  }

  // Check if version is supported
  if (!info.isSupported) {
    logger.warn('API version not supported', { version });
    throw new APIVersionError(
      `API version ${version} is not supported. Minimum version: ${MIN_API_VERSION}.`,
      'VERSION_NOT_SUPPORTED',
      400
    );
  }

  // Check constraints
  if (!isVersionValid(version, constraints)) {
    logger.warn('API version constraint not met', { version, constraints });
    throw new APIVersionError(
      `API version ${version} does not meet endpoint requirements.`,
      'VERSION_CONSTRAINT_NOT_MET',
      400
    );
  }

  // Log deprecation warning
  if (info.isDeprecated) {
    logger.warn('API version deprecated', { version });
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Add version headers to response
 */
export function addVersionHeaders(
  response: NextResponse,
  endpointVersion?: string
): NextResponse {
  const version = endpointVersion || CURRENT_API_VERSION;
  const info = getVersionInfo(version);

  // Always include current version
  response.headers.set(VERSION_HEADERS.RESPONSE, version);
  response.headers.set(VERSION_HEADERS.LATEST, CURRENT_API_VERSION);
  response.headers.set(VERSION_HEADERS.MIN_SUPPORTED, MIN_API_VERSION);

  // Add deprecation warning if applicable
  if (info.isDeprecated) {
    response.headers.set(VERSION_HEADERS.DEPRECATED, 'true');
    response.headers.set(
      'Warning',
      `299 - "API version ${version} is deprecated. Please upgrade to ${CURRENT_API_VERSION}."`
    );
  }

  // Add sunset date if applicable
  if (info.sunsetDate) {
    response.headers.set(VERSION_HEADERS.SUNSET, info.sunsetDate);
  }

  return response;
}

/**
 * Create a versioned JSON response
 */
export function versionedResponse<T>(
  data: T,
  version?: string,
  status = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addVersionHeaders(response, version);
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class APIVersionError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'APIVersionError';
    this.code = code;
    this.status = status;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * API version middleware for use in Next.js middleware
 */
export function apiVersionMiddleware(request: NextRequest): NextResponse | null {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return null;
  }

  const version = getAPIVersion(request);
  const info = getVersionInfo(version);

  // Block sunset versions
  if (info.isSunset) {
    return NextResponse.json(
      {
        error: 'VERSION_SUNSET',
        message: `API version ${version} is no longer supported. Please upgrade to ${CURRENT_API_VERSION}.`,
        latestVersion: CURRENT_API_VERSION,
      },
      {
        status: 410,
        headers: {
          [VERSION_HEADERS.RESPONSE]: version,
          [VERSION_HEADERS.LATEST]: CURRENT_API_VERSION,
          [VERSION_HEADERS.SUNSET]: info.sunsetDate || '',
        },
      }
    );
  }

  // Continue to API handler
  return null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if request is for a specific API version
 */
export function isVersion(request: NextRequest, version: string): boolean {
  const requestVersion = getAPIVersion(request);
  return compareVersions(requestVersion, version) === 0;
}

/**
 * Check if request is for API version >= specified
 */
export function isVersionAtLeast(request: NextRequest, minVersion: string): boolean {
  const requestVersion = getAPIVersion(request);
  return compareVersions(requestVersion, minVersion) >= 0;
}

/**
 * Get API version documentation URL
 */
export function getVersionDocsUrl(version: string): string {
  return `https://docs.mintenance.com/api/${version}`;
}
