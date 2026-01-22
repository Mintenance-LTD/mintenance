import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
/**
 * Comprehensive security headers middleware
 * Implements OWASP secure headers recommendations
 */
interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: string | boolean;
  // Cross-Origin policies
  crossOriginEmbedderPolicy?: string | boolean;
  crossOriginOpenerPolicy?: string | boolean;
  crossOriginResourcePolicy?: string | boolean;
  // Security headers
  strictTransportSecurity?: string | boolean;
  xContentTypeOptions?: string | boolean;
  xDnsPrefetchControl?: string | boolean;
  xFrameOptions?: string | boolean;
  xPermittedCrossDomainPolicies?: string | boolean;
  xXssProtection?: string | boolean;
  // Privacy headers
  referrerPolicy?: string | boolean;
  permissionsPolicy?: string | boolean;
  // Custom headers
  customHeaders?: Record<string, string>;
}
/**
 * Default security headers configuration
 */
const defaultConfig: SecurityHeadersConfig = {
  // Content Security Policy - Strict by default
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.pwnedpasswords.com https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "child-src 'self' blob:",
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join('; '),
  // Cross-Origin policies
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  // Strict Transport Security (HSTS)
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  // Prevent MIME type sniffing
  xContentTypeOptions: 'nosniff',
  // DNS Prefetch Control
  xDnsPrefetchControl: 'on',
  // Clickjacking protection
  xFrameOptions: 'DENY',
  // Flash cross-domain policy
  xPermittedCrossDomainPolicies: 'none',
  // XSS Protection (legacy, but still useful)
  xXssProtection: '1; mode=block',
  // Referrer Policy
  referrerPolicy: 'strict-origin-when-cross-origin',
  // Permissions Policy (Feature Policy)
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'interest-cohort=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=(self)',
    'encrypted-media=(self)',
    'picture-in-picture=(self)',
    'sync-xhr=()',
  ].join(', '),
};
/**
 * Development-specific CSP relaxations
 */
const developmentCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http: webpack:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com ws://localhost:* http://localhost:*",
  "media-src 'self' blob:",
  "object-src 'none'",
  "child-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self' http://localhost:*",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self' blob:",
].join('; ');
/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const mergedConfig = { ...defaultConfig, ...config };
  // Content Security Policy
  if (mergedConfig.contentSecurityPolicy !== false) {
    const csp = isDevelopment ? developmentCSP : mergedConfig.contentSecurityPolicy;
    if (typeof csp === 'string') {
      response.headers.set('Content-Security-Policy', csp);
      // Report-only mode for monitoring violations
      if (process.env.CSP_REPORT_URI) {
        response.headers.set(
          'Content-Security-Policy-Report-Only',
          `${csp}; report-uri ${process.env.CSP_REPORT_URI}`
        );
      }
    }
  }
  // Cross-Origin Embedder Policy
  if (mergedConfig.crossOriginEmbedderPolicy !== false) {
    response.headers.set(
      'Cross-Origin-Embedder-Policy',
      mergedConfig.crossOriginEmbedderPolicy as string
    );
  }
  // Cross-Origin Opener Policy
  if (mergedConfig.crossOriginOpenerPolicy !== false) {
    response.headers.set(
      'Cross-Origin-Opener-Policy',
      mergedConfig.crossOriginOpenerPolicy as string
    );
  }
  // Cross-Origin Resource Policy
  if (mergedConfig.crossOriginResourcePolicy !== false) {
    response.headers.set(
      'Cross-Origin-Resource-Policy',
      mergedConfig.crossOriginResourcePolicy as string
    );
  }
  // Strict Transport Security (HSTS)
  if (mergedConfig.strictTransportSecurity !== false && !isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      mergedConfig.strictTransportSecurity as string
    );
  }
  // X-Content-Type-Options
  if (mergedConfig.xContentTypeOptions !== false) {
    response.headers.set(
      'X-Content-Type-Options',
      mergedConfig.xContentTypeOptions as string
    );
  }
  // X-DNS-Prefetch-Control
  if (mergedConfig.xDnsPrefetchControl !== false) {
    response.headers.set(
      'X-DNS-Prefetch-Control',
      mergedConfig.xDnsPrefetchControl as string
    );
  }
  // X-Frame-Options
  if (mergedConfig.xFrameOptions !== false) {
    response.headers.set(
      'X-Frame-Options',
      mergedConfig.xFrameOptions as string
    );
  }
  // X-Permitted-Cross-Domain-Policies
  if (mergedConfig.xPermittedCrossDomainPolicies !== false) {
    response.headers.set(
      'X-Permitted-Cross-Domain-Policies',
      mergedConfig.xPermittedCrossDomainPolicies as string
    );
  }
  // X-XSS-Protection
  if (mergedConfig.xXssProtection !== false) {
    response.headers.set(
      'X-XSS-Protection',
      mergedConfig.xXssProtection as string
    );
  }
  // Referrer-Policy
  if (mergedConfig.referrerPolicy !== false) {
    response.headers.set(
      'Referrer-Policy',
      mergedConfig.referrerPolicy as string
    );
  }
  // Permissions-Policy
  if (mergedConfig.permissionsPolicy !== false) {
    response.headers.set(
      'Permissions-Policy',
      mergedConfig.permissionsPolicy as string
    );
  }
  // Custom headers
  if (mergedConfig.customHeaders) {
    for (const [key, value] of Object.entries(mergedConfig.customHeaders)) {
      response.headers.set(key, value);
    }
  }
  // Remove potentially dangerous headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  return response;
}
/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(
  request: NextRequest,
  config?: SecurityHeadersConfig
): NextResponse {
  const response = NextResponse.next();
  return applySecurityHeaders(response, config);
}
/**
 * Report CSP violations
 */
export async function handleCSPReport(request: NextRequest): Promise<NextResponse> {
  try {
    const report = await request.json();
    logger.warn('CSP Violation Report', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      columnNumber: report['csp-report']?.['column-number'],
    });
    return NextResponse.json({ status: 'reported' });
  } catch (error) {
    logger.error('Failed to process CSP report', { error });
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}
/**
 * Nonce generator for inline scripts (CSP)
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}
/**
 * Apply nonce to CSP for inline scripts
 */
export function applyCSPNonce(csp: string, nonce: string): string {
  return csp.replace(
    "script-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`
  );
}
/**
 * Security headers configuration for specific routes
 */
export const routeSpecificHeaders: Record<string, SecurityHeadersConfig> = {
  '/api/public': {
    // More permissive for public API
    crossOriginResourcePolicy: 'cross-origin',
    xFrameOptions: 'SAMEORIGIN',
  },
  '/embed': {
    // Allow embedding
    xFrameOptions: false,
    contentSecurityPolicy: false,
  },
  '/api/webhooks': {
    // Webhooks don't need CSP
    contentSecurityPolicy: false,
  },
};
/**
 * Get security headers configuration for a specific route
 */
export function getRouteSecurityConfig(pathname: string): SecurityHeadersConfig {
  // Check exact match first
  if (routeSpecificHeaders[pathname]) {
    return routeSpecificHeaders[pathname];
  }
  // Check prefix match
  for (const [route, config] of Object.entries(routeSpecificHeaders)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  return {};
}
/**
 * Verify security headers are properly set
 */
export function verifySecurityHeaders(response: Response): {
  isSecure: boolean;
  missingHeaders: string[];
  weakHeaders: string[];
} {
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Strict-Transport-Security',
  ];
  const missingHeaders: string[] = [];
  const weakHeaders: string[] = [];
  for (const header of requiredHeaders) {
    const value = response.headers.get(header);
    if (!value) {
      missingHeaders.push(header);
    } else {
      // Check for weak configurations
      if (header === 'X-Frame-Options' && value === 'ALLOWALL') {
        weakHeaders.push(`${header}: ${value}`);
      }
      if (header === 'Content-Security-Policy' && value.includes("'unsafe-inline'")) {
        weakHeaders.push(`${header}: contains 'unsafe-inline'`);
      }
    }
  }
  return {
    isSecure: missingHeaders.length === 0 && weakHeaders.length === 0,
    missingHeaders,
    weakHeaders,
  };
}