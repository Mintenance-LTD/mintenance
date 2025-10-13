import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromHeaders } from '@/lib/auth';

/**
 * API endpoint to fetch notification badge counts for the sidebar
 * Used by useNotificationCounts hook
 */
export async function GET(request: NextRequest) {
  try {
    const headers = await request.headers;
    const user = getCurrentUserFromHeaders(headers);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch counts from database
    const [
      messagesResponse,
      connectionsResponse,
      quoteRequestsResponse,
    ] = await Promise.all([
      // Unread messages count
      serverSupabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('recipient_id', user.id)
        .eq('read', false),

      // Pending connections count
      serverSupabase
        .from('connections')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'pending'),

      // New quote requests count
      serverSupabase
        .from('jobs')
        .select('id', { count: 'exact' })
        .eq('contractor_id', user.id)
        .eq('status', 'open')
        .eq('quoted', false),
    ]);

    const counts = {
      messages: messagesResponse.count || 0,
      connections: connectionsResponse.count || 0,
      quoteRequests: quoteRequestsResponse.count || 0,
    };

    return NextResponse.json({
      success: true,
      counts,
    });

  } catch (error) {
    console.error('Error fetching notification counts:', error);
    
    // Return fallback counts on error
    return NextResponse.json({
      success: true,
      counts: {
        messages: 0,
        connections: 0,
        quoteRequests: 0,
      },
    });
  }
}