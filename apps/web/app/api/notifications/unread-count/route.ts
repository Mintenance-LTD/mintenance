import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - security fix: use authenticated user instead of query param
    const user = await getCurrentUserFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    logger.error('Unread count API error', error, {
      service: 'notifications',
    });
    return NextResponse.json({ count: 0 });
  }
}
