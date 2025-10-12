import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';

export async function POST(_request: NextRequest) {
  try {
    // Use AuthManager to handle logout
    await authManager.logout();

    logger.info('User logged out successfully', { service: 'auth' });

    // Create response with client-side script to clear session
    const response = NextResponse.json(
      {
        message: 'Logout successful',
        clearSession: true, // Signal client to clear SessionManager
      },
      { status: 200 }
    );

    return response;
  } catch (error) {
    logger.error('Logout error', error, { service: 'auth' });
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    );
  }
}
