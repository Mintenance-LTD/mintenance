import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);
    
    // Get authenticated user - security fix: use authenticated user instead of body param
    const user = await getCurrentUserFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark all notifications as read for this user
    const { error } = await serverSupabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      logger.error('Error marking all as read', error, {
        service: 'notifications',
        userId: user.id,
      });
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Mark all as read API error', error, {
      service: 'notifications',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

