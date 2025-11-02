/**
 * CSRF Protection Utility
 * Validates CSRF tokens for API routes to prevent cross-site request forgery
 */

import { NextRequest } from 'next/server';

/**
 * Parse cookie string into key-value pairs
 */
function parseCookie(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Validate CSRF token from request headers and cookies
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  const method = request.method;
  
  // Only validate mutating methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true;
  }
  
  try {
    // Get CSRF token from header
    const headerToken = request.headers.get('x-csrf-token');
    
    // Get CSRF token from cookie
    // Use different cookie name in development vs production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
    
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookie(cookieHeader);
    const cookieToken = cookies[cookieName];
    
    // Both tokens must exist and match
    if (!headerToken || !cookieToken) {
      return false;
    }
    
    return headerToken === cookieToken;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

/**
 * Require CSRF validation - throws error if validation fails
 */
export async function requireCSRF(request: NextRequest): Promise<void> {
  const isValid = await validateCSRF(request);
  
  if (!isValid) {
    throw new Error('CSRF validation failed');
  }
}

/**
 * Generate CSRF token (for setting in cookies)
 */
export function generateCSRFToken(): string {
  // Generate a cryptographically secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Set CSRF token in response headers
 */
export function setCSRFToken(response: Response, token: string): Response {
  response.headers.set('Set-Cookie',
    `__Host-csrf-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
  );
  return response;
}

/**
 * Get CSRF token for client-side use (returns token for setting in header)
 */
export function getCSRFTokenForClient(): string {
  // Generate token that will be sent in headers
  return generateCSRFToken();
}