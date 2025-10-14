import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rotateTokens, setAuthCookie } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';
import { logger } from '@mintenance/shared';

/**
 * Token Refresh API
 * Handles automatic token refresh for persistent sessions
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get('auth-token')?.value;
    const refreshToken = cookieStore.get('refresh-token')?.value;
    const rememberMe = cookieStore.get('remember-me')?.value === 'true';

    if (!currentToken) {
      logger.warn('Token refresh failed: No active session', { service: 'auth' });
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Verify current token to get user info
    const payload = await verifyToken(currentToken);

    if (!payload || !payload.sub) {
      logger.warn('Token refresh failed: Invalid token', { service: 'auth' });
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if token is about to expire (less than 15 minutes remaining)
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = (payload.exp || 0) - now;

    // Only refresh if token expires soon
    if (timeUntilExpiry > 15 * 60) {
      return NextResponse.json({
        success: true,
        message: 'Token still valid',
        expiresIn: timeUntilExpiry,
      });
    }

    // Use refresh token from HTTP-only cookie (secure)
    if (refreshToken) {
      // Rotate tokens using refresh token
      const { accessToken, refreshToken: newRefreshToken } = await rotateTokens(
        payload.sub,
        refreshToken
      );

      // Set new auth cookies
      await setAuthCookie(accessToken, rememberMe, newRefreshToken);

      logger.info('Token refreshed via rotation', {
        service: 'auth',
        userId: payload.sub
      });

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully via rotation',
      });
    } else {
      // Fallback: Create new token with same user data (simpler refresh without rotation)
      logger.warn('Token refresh fallback: No refresh token found', {
        service: 'auth',
        userId: payload.sub
      });

      const { createToken } = await import('@/lib/auth');
      const newToken = await createToken({
        id: payload.sub,
        email: payload.email,
        role: payload.role as 'homeowner' | 'contractor' | 'admin',
      });

      // Set new auth cookie
      await setAuthCookie(newToken, rememberMe);

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully (fallback mode)',
      });
    }
  } catch (error) {
    logger.error('Token refresh error', error, { service: 'auth' });
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check token status
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get('auth-token')?.value;

    if (!currentToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const payload = await verifyToken(currentToken);
    
    if (!payload || !payload.exp) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - now;

    return NextResponse.json({
      authenticated: true,
      expiresIn: timeUntilExpiry,
      needsRefresh: timeUntilExpiry < 15 * 60,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check token status' },
      { status: 500 }
    );
  }
}
