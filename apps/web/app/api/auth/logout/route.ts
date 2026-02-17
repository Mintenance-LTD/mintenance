import { NextRequest, NextResponse } from 'next/server';
import { authManager } from '@/lib/auth-manager';
import { logger } from '@mintenance/shared';
import { tokenBlacklist } from '@/lib/auth/token-blacklist';
import { cookies } from 'next/headers';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const POST = withApiHandler(
  { auth: false, csrf: true, rateLimit: { maxRequests: 5 } },
  async (request) => {
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
  }
);
