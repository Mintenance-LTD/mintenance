import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@mintenance/shared';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logger.debug('Session check - no user', { service: 'auth' });
      return NextResponse.json({ user: null }, { status: 401 });
    }

    logger.debug('Session retrieved', { service: 'auth', userId: user.id });
    return NextResponse.json({ user });
  } catch (error) {
    logger.error('Failed to load session', error, { service: 'auth' });
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}

