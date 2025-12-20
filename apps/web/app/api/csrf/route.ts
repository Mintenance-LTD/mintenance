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
 * GET /api/csrf
 * Return existing CSRF token from cookie if valid, otherwise generate a new one
 */
export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieName = isDevelopment ? 'csrf-token' : '__Host-csrf-token';
    
    // Check if a valid CSRF token already exists in cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookie(cookieHeader);
    const existingToken = cookies[cookieName];
    
    // Reuse existing token if it exists and is valid (64 hex characters = 32 bytes)
    let token = existingToken;
    if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      // Generate new token only if no valid token exists
      token = generateCSRFToken();
      logger.info('CSRF token generated (new)', { service: 'csrf' });
    } else {
      logger.info('CSRF token reused from cookie', { service: 'csrf' });
    }
    
    const cookieSecure = !isDevelopment; // Only Secure in production
    const cookieSameSite = isDevelopment ? 'Lax' : 'Strict';
    
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

