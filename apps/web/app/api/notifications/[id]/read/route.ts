import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    // Update notification as read
    const { error } = await serverSupabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark as read API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
