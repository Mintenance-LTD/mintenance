import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireCSRF } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Mark all notifications as read for this user
    const { error } = await serverSupabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all as read API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

