import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserFromCookies();
    const { id } = await params;
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (updateError) {
      console.error('Error marking notification as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/notifications/[id]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
