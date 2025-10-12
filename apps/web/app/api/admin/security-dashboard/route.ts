import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { securityMonitor } from '@/lib/security-monitor';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as '1h' | '24h' | '7d' | '30d' || '24h';

    // Get security metrics
    const { data: metrics, error } = await serverSupabase
      .rpc('get_security_dashboard_metrics', { p_timeframe: timeframe });

    if (error) {
      console.error('Error fetching security metrics:', error);
      return NextResponse.json({ error: 'Failed to fetch security metrics' }, { status: 500 });
    }

    // Get recent security events
    const { data: recentEvents, error: eventsError } = await serverSupabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      console.error('Error fetching recent events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch recent events' }, { status: 500 });
    }

    // Get top offending IPs
    const { data: topIPs, error: ipsError } = await serverSupabase
      .from('security_events')
      .select('ip_address')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ipsError) {
      console.error('Error fetching IP data:', ipsError);
      return NextResponse.json({ error: 'Failed to fetch IP data' }, { status: 500 });
    }

    // Calculate top IPs
    const ipCounts = topIPs.reduce((acc: Record<string, number>, event) => {
      acc[event.ip_address] = (acc[event.ip_address] || 0) + 1;
      return acc;
    }, {});

    const topOffendingIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      timeframe,
      metrics: metrics[0] || {
        total_events: 0,
        critical_events: 0,
        high_severity_events: 0,
        unique_ips: 0,
        top_event_types: {},
        recent_critical_events: []
      },
      recent_events: recentEvents,
      top_offending_ips: topOffendingIPs,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load security dashboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, eventId } = body;

    if (action === 'resolve_event' && eventId) {
      // Mark security event as resolved
      const { error } = await serverSupabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) {
        console.error('Error resolving security event:', error);
        return NextResponse.json({ error: 'Failed to resolve event' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Event resolved successfully' });
    }

    if (action === 'block_ip') {
      const { ipAddress, reason } = body;
      
      // Log admin action
      await securityMonitor.logAdminAction(
        request,
        'block_ip',
        user.id,
        undefined,
        { ip_address: ipAddress, reason }
      );

      // Note: In a real implementation, you would add the IP to a blocklist
      // This could be done via firewall rules, CDN configuration, or database
      console.log(`Admin ${user.id} blocked IP ${ipAddress}: ${reason}`);

      return NextResponse.json({ message: 'IP blocked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Security dashboard action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform security action' },
      { status: 500 }
    );
  }
}
