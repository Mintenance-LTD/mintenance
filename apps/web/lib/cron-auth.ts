/**
 * Cron Authentication Helper
 * Validates cron secret for protected cron endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

/**
 * Verify cron secret from request headers
 * @param request - Next.js request object
 * @returns true if valid, false otherwise
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured', undefined, {
      service: 'cron-auth',
    });
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Middleware function to protect cron endpoints
 * Returns 401 response if authentication fails
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request', {
      service: 'cron-auth',
      path: request.nextUrl.pathname,
      hasAuthHeader: !!request.headers.get('authorization'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return null;
}

