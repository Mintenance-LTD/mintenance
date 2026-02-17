import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/database';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 100 } },
  async (request, { user: authUser }) => {
    // Fetch the full user record from the database
    const fullUser = await DatabaseManager.getUserById(authUser.id);

    if (!fullUser) {
      logger.debug('Session check - user not found in DB', { service: 'auth', userId: authUser.id });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logger.debug('Session retrieved', { service: 'auth', userId: fullUser.id });
    return NextResponse.json({ user: fullUser });
  }
);
