/**
 * CSRF Token API Endpoint
 * 
 * Provides CSRF tokens to clients for form submissions and API requests.
 * Call this endpoint before making state-changing requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

/**
 * GET /api/csrf
 * Generate and return a new CSRF token, also sets it as a cookie
 */
export async function GET(request: NextRequest) {
  try {
    const token = generateCSRFToken();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development (localhost), use regular cookie name (__Host- requires HTTPS)
    // In production, use __Host- prefix for additional security
    const cookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
    const cookieSecure = !isDevelopment; // Only Secure in production
    const cookieSameSite = isDevelopment ? 'Lax' : 'Strict';
    
    logger.info('CSRF token generated', { service: 'csrf' });
    
    const response = NextResponse.json(
      { token },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
    
    // Set CSRF token as HTTP-only cookie
    const cookieOptions = [
      `${cookieName}=${token}`,
      'HttpOnly',
      cookieSecure ? 'Secure' : '',
      `SameSite=${cookieSameSite}`,
      'Path=/',
      'Max-Age=3600',
    ].filter(Boolean).join('; ');
    
    response.headers.set('Set-Cookie', cookieOptions);
    
    return response;
  } catch (error) {
    logger.error('Failed to generate CSRF token', error, { service: 'csrf' });
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

