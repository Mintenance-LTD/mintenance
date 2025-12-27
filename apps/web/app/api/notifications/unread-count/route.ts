import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - security fix: use authenticated user instead of query param
    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to view notification count');
    }

    const { count, error } = await serverSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Unread count error', error, {
        service: 'notifications',
        userId: user.id,
      });
      throw error;
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    return handleAPIError(error);
  }
}
