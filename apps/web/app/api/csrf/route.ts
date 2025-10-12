/**
 * CSRF Token API Endpoint
 * 
 * Provides CSRF tokens to clients for form submissions and API requests.
 * Call this endpoint before making state-changing requests.
 */

import { NextResponse } from 'next/server';
import { getCSRFTokenForClient } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

/**
 * GET /api/csrf
 * Generate and return a new CSRF token
 */
export async function GET() {
  try {
    const token = await getCSRFTokenForClient();
    
    logger.info('CSRF token generated', { service: 'csrf' });
    
    return NextResponse.json(
      { token },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    logger.error('Failed to generate CSRF token', error, { service: 'csrf' });
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}

