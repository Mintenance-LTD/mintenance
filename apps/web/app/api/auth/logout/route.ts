import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    const cookieStore = await cookies();
    const authToken = cookieStore.get('__Host-mintenance-auth')?.value;

    // Blacklist the current token if it exists
    if (authToken) {
      try {
        await tokenBlacklist.blacklistToken(authToken);
        logger.info('Token blacklisted on logout', { service: 'auth' });
      } catch (error) {
        logger.error('Failed to blacklist token on logout', error, { service: 'auth' });
        // Continue with logout even if blacklisting fails
      }
    }

    // Use AuthManager to handle logout (clears cookies)
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
