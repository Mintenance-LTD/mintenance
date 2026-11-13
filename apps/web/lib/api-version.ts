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
const MIN_API_VERSION = 'v1';

/** Deprecated versions that still work but show warnings */
const DEPRECATED_VERSIONS: string[] = [];

/** Sunset versions that are no longer supported */
const SUNSET_VERSIONS: string[] = [];

/** Header names for API version */
const VERSION_HEADERS = {
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

interface APIVersion {
  major: number;
  minor: number;
  raw: string;
}

interface VersionConstraints {
  min?: string;
  max?: string;
  exact?: string;
}

interface VersionInfo {
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
function parseVersion(version: string): APIVersion | null {
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
function compareVersions(a: string, b: string): number {
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
function getAPIVersion(request: NextRequest): string {
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
  const queryVersion =
    url.searchParams.get('api_version') || url.searchParams.get('v');
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
function isVersionValid(
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
function getVersionInfo(requestedVersion: string): VersionInfo {
  const isDeprecated = DEPRECATED_VERSIONS.includes(requestedVersion);
  const isSunset = SUNSET_VERSIONS.includes(requestedVersion);
  const isSupported =
    !isSunset && compareVersions(requestedVersion, MIN_API_VERSION) >= 0;

  return {
    current: CURRENT_API_VERSION,
    requested: requestedVersion,
    isDeprecated,
    isSunset,
    isSupported,
    sunsetDate: isSunset ? '2025-01-01' : undefined,
  };
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

// ============================================================================
// ERROR CLASS
// ============================================================================

class APIVersionError extends Error {
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
