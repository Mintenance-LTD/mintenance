import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

export async function PUT(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { error } = await serverSupabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('Mark all as read error', error, {
        service: 'notifications',
        userId,
      });
      return NextResponse.json(
        { error: 'Failed to mark all as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Mark all as read API error', error, {
      service: 'notifications',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
