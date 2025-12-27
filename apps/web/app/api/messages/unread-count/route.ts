import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError } from '@/lib/errors/api-error';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view unread count');
    }

    const { count, error } = await serverSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Failed to load unread count', error, {
        service: 'messages',
        userId: user.id
      });
      throw error;
    }

    logger.debug('Unread count retrieved', {
      service: 'messages',
      userId: user.id,
      count: count ?? 0
    });

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    return handleAPIError(err);
  }
}
