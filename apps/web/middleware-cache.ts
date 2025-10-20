import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cache configuration for different route patterns
 */
const CACHE_CONFIG = {
  // Static pages - cache for 1 hour
  static: {
    '/': 3600,
    '/about': 3600,
    '/terms': 3600,
    '/privacy': 3600,
  },
  // Dynamic pages - cache for 5 minutes
  dynamic: {
    '/discover': 300,
    '/contractors': 600,
    '/jobs': 300,
  },
  // API routes - cache for 1 minute
  api: {
    '/api/contractors': 60,
    '/api/jobs': 60,
    '/api/services': 300,
  },
  // Assets - cache for 1 year
  assets: {
    '/assets': 31536000,
    '/_next/static': 31536000,
  },
} as const;

/**
 * Get cache duration for a given path
 */
function getCacheDuration(pathname: string): number | null {
  // Check exact matches first
  if (CACHE_CONFIG.static[pathname as keyof typeof CACHE_CONFIG.static]) {
    return CACHE_CONFIG.static[pathname as keyof typeof CACHE_CONFIG.static];
  }
  
  if (CACHE_CONFIG.dynamic[pathname as keyof typeof CACHE_CONFIG.dynamic]) {
    return CACHE_CONFIG.dynamic[pathname as keyof typeof CACHE_CONFIG.dynamic];
  }
  
  if (CACHE_CONFIG.api[pathname as keyof typeof CACHE_CONFIG.api]) {
    return CACHE_CONFIG.api[pathname as keyof typeof CACHE_CONFIG.api];
  }

  // Check pattern matches
  for (const [pattern, duration] of Object.entries(CACHE_CONFIG.assets)) {
    if (pathname.startsWith(pattern)) {
      return duration;
    }
  }

  // Default cache duration for other routes
  return 300; // 5 minutes
}

/**
 * Add cache headers to response
 */
function addCacheHeaders(response: NextResponse, pathname: string): NextResponse {
  const duration = getCacheDuration(pathname);
  
  if (duration) {
    // Set cache control headers
    response.headers.set(
      'Cache-Control',
      `public, max-age=${duration}, s-maxage=${duration}, stale-while-revalidate=${duration * 2}`
    );
    
    // Set ETag for better caching
    response.headers.set('ETag', `"${Date.now()}-${duration}"`);
    
    // Set Vary header for proper cache invalidation
    response.headers.set('Vary', 'Accept-Encoding, Cookie');
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for certain paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get the response
  const response = NextResponse.next();
  
  // Add cache headers
  return addCacheHeaders(response, pathname);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
