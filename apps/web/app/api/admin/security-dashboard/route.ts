import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { securityMonitor } from '@/lib/security-monitor';
import { IPBlockingService } from '@/lib/services/admin/IPBlockingService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';

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

    // Get blocked IPs
    const { ips: blockedIPs } = await IPBlockingService.getBlockedIPs({ activeOnly: true, limit: 50 });
    
    // Mark which IPs are already blocked
    const blockedIPSet = new Set(blockedIPs.map(bip => bip.ip_address));
    const topOffendingIPsWithBlockStatus = topOffendingIPs.map(item => ({
      ...item,
      is_blocked: blockedIPSet.has(item.ip),
    }));

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
      top_offending_ips: topOffendingIPsWithBlockStatus,
      blocked_ips: blockedIPs,
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

      // Log admin activity
      await AdminActivityLogger.logFromRequest(
        request,
        user.id,
        'resolve_security_event',
        'security',
        `Resolved security event: ${eventId}`,
        'security_event',
        eventId
      );

      return NextResponse.json({ message: 'Event resolved successfully' });
    }

    if (action === 'block_ip') {
      const { ipAddress, reason, expiresAt } = body;
      
      if (!ipAddress || !reason) {
        return NextResponse.json({ error: 'IP address and reason are required' }, { status: 400 });
      }

      // Block IP using IPBlockingService
      const blocked = await IPBlockingService.blockIP({
        ipAddress,
        reason,
        blockedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata: {
          blocked_from: 'security_dashboard',
          security_events: body.securityEventIds || [],
        },
      });

      if (!blocked) {
        return NextResponse.json({ error: 'Failed to block IP address' }, { status: 500 });
      }

      // Log admin activity
      await AdminActivityLogger.logFromRequest(
        request,
        user.id,
        'block_ip',
        'security',
        `Blocked IP address: ${ipAddress}`,
        'ip_address',
        blocked.id,
        { ip_address: ipAddress, reason, expires_at: expiresAt }
      );

      // Also log via security monitor
      await securityMonitor.logAdminAction(
        request,
        'block_ip',
        user.id,
        undefined,
        { ip_address: ipAddress, reason, blocked_ip_id: blocked.id }
      );

      return NextResponse.json({ 
        message: 'IP blocked successfully',
        blocked_ip: blocked 
      });
    }

    if (action === 'unblock_ip') {
      const { ipAddress } = body;
      
      if (!ipAddress) {
        return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
      }

      const unblocked = await IPBlockingService.unblockIP(ipAddress);

      if (!unblocked) {
        return NextResponse.json({ error: 'Failed to unblock IP address' }, { status: 500 });
      }

      // Log admin activity
      await AdminActivityLogger.logFromRequest(
        request,
        user.id,
        'unblock_ip',
        'security',
        `Unblocked IP address: ${ipAddress}`,
        'ip_address',
        undefined,
        { ip_address: ipAddress }
      );

      return NextResponse.json({ message: 'IP unblocked successfully' });
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
