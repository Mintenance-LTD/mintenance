import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logger.debug('Session check - no user', { service: 'auth' });
      throw new UnauthorizedError('No active session');
    }

    logger.debug('Session retrieved', { service: 'auth', userId: user.id });
    return NextResponse.json({ user });
  } catch (error) {
    return handleAPIError(error);
  }
}

