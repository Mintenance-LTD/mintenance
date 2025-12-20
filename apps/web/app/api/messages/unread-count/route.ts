import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 });
    }

    logger.debug('Unread count retrieved', {
      service: 'messages',
      userId: user.id,
      count: count ?? 0
    });

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    logger.error('Failed to load unread count', err, {
      service: 'messages'
    });
    return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 });
  }
}
