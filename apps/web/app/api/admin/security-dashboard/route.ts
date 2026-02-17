import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { securityMonitor } from '@/lib/security-monitor';
import { IPBlockingService } from '@/lib/services/admin/IPBlockingService';
import { AdminActivityLogger } from '@/lib/services/admin/AdminActivityLogger';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

const securityDashboardActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('resolve_event'),
    eventId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('block_ip'),
    ipAddress: z.string().ip(),
    reason: z.string().min(1).max(500),
    expiresAt: z.string().datetime().optional(),
    securityEventIds: z.array(z.string().uuid()).optional(),
  }),
  z.object({
    action: z.literal('unblock_ip'),
    ipAddress: z.string().ip(),
  }),
]);

export async function GET(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get timeframe from query params
    const { searchParams } = new URL(request.url);
    const VALID_TIMEFRAMES = ['1h', '24h', '7d', '30d'] as const;
    const rawTimeframe = searchParams.get('timeframe');
    const timeframe = (VALID_TIMEFRAMES as readonly string[]).includes(rawTimeframe ?? '')
      ? (rawTimeframe as '1h' | '24h' | '7d' | '30d')
      : '24h';

    // Get security metrics
    const { data: metrics, error } = await serverSupabase
      .rpc('get_security_dashboard_metrics', { p_timeframe: timeframe });

    if (error) {
      logger.error('Error fetching security metrics', error, {
        service: 'admin_security',
        timeframe,
        userId: user.id,
      });
      // If RPC function doesn't exist, return empty metrics instead of error
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        // Function doesn't exist - return empty metrics
        const emptyMetrics = {
          total_events: 0,
          critical_events: 0,
          high_severity_events: 0,
          unique_ips: 0,
          top_event_types: {},
          recent_critical_events: []
        };
        
        // Continue with empty metrics instead of failing
        const { data: recentEvents, error: eventsError } = await serverSupabase
          .from('security_events')
          .select('id, event_type, severity, ip_address, user_id, description, metadata, resolved, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        const { data: topIPs, error: ipsError } = await serverSupabase
          .from('security_events')
          .select('ip_address')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        const ipCounts = (topIPs || []).reduce((acc: Record<string, number>, event: { ip_address: string }) => {
          if (event.ip_address) {
            acc[event.ip_address] = (acc[event.ip_address] || 0) + 1;
          }
          return acc;
        }, {});

        const topOffendingIPs = Object.entries(ipCounts)
          .map(([ip, count]) => ({ ip, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const { ips: blockedIPs } = await IPBlockingService.getBlockedIPs({ activeOnly: true, limit: 50 });
        const blockedIPSet = new Set(blockedIPs.map(bip => bip.ip_address));
        const topOffendingIPsWithBlockStatus = topOffendingIPs.map(item => ({
          ...item,
          is_blocked: blockedIPSet.has(item.ip),
        }));

        return NextResponse.json({
          timeframe,
          metrics: emptyMetrics,
          recent_events: recentEvents || [],
          top_offending_ips: topOffendingIPsWithBlockStatus,
          blocked_ips: blockedIPs,
          last_updated: new Date().toISOString(),
          warning: 'Security metrics function not available. Showing basic data only.'
        });
      }

      throw new InternalServerError('Failed to fetch security metrics');
    }

    // Get recent security events
    const { data: recentEvents, error: eventsError } = await serverSupabase
      .from('security_events')
      .select('id, event_type, severity, ip_address, user_id, description, metadata, resolved, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      logger.error('Error fetching recent events', eventsError, {
        service: 'admin_security',
        userId: user.id,
      });
      // If table doesn't exist, continue with empty array
      if (eventsError.code === '42P01' || eventsError.message?.includes('does not exist')) {
        // Table doesn't exist - return empty array
        const emptyMetrics = metrics?.[0] || {
          total_events: 0,
          critical_events: 0,
          high_severity_events: 0,
          unique_ips: 0,
          top_event_types: {},
          recent_critical_events: []
        };

        return NextResponse.json({
          timeframe,
          metrics: emptyMetrics,
          recent_events: [],
          top_offending_ips: [],
          blocked_ips: [],
          last_updated: new Date().toISOString(),
          warning: 'Security events table not available. Some features may be limited.'
        });
      }
      throw new InternalServerError('Failed to fetch recent events');
    }

    // Get top offending IPs
    const { data: topIPs, error: ipsError } = await serverSupabase
      .from('security_events')
      .select('ip_address')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ipsError) {
      logger.error('Error fetching IP data', ipsError, {
        service: 'admin_security',
        userId: user.id,
      });
      // If table doesn't exist, continue with empty array
      if (ipsError.code === '42P01' || ipsError.message?.includes('does not exist')) {
        const emptyMetrics = metrics?.[0] || {
          total_events: 0,
          critical_events: 0,
          high_severity_events: 0,
          unique_ips: 0,
          top_event_types: {},
          recent_critical_events: []
        };

        return NextResponse.json({
          timeframe,
          metrics: emptyMetrics,
          recent_events: [],
          top_offending_ips: [],
          blocked_ips: [],
          last_updated: new Date().toISOString(),
          warning: 'Security events table not available. Some features may be limited.'
        });
      }
      throw new InternalServerError('Failed to fetch IP data');
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
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 10
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(10),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // CSRF protection
    await requireCSRF(request);

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const parsed = securityDashboardActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid request: action must be resolve_event, block_ip, or unblock_ip with required fields');
    }
    const validatedBody = parsed.data;

    if (validatedBody.action === 'resolve_event') {
      const eventId = validatedBody.eventId;
      // Mark security event as resolved
      const { error } = await serverSupabase
        .from('security_events')
        .update({ resolved: true })
        .eq('id', eventId);

      if (error) {
        logger.error('Error resolving security event', error, {
          service: 'admin_security',
          eventId,
          userId: user.id,
        });
        throw new InternalServerError('Failed to resolve event');
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

    if (validatedBody.action === 'block_ip') {
      const { ipAddress, reason, expiresAt, securityEventIds } = validatedBody;

      // Block IP using IPBlockingService
      const blocked = await IPBlockingService.blockIP({
        ipAddress,
        reason,
        blockedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata: {
          blocked_from: 'security_dashboard',
          security_events: securityEventIds || [],
        },
      });

      if (!blocked) {
        throw new InternalServerError('Failed to block IP address');
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

    if (validatedBody.action === 'unblock_ip') {
      const { ipAddress } = validatedBody;

      const unblocked = await IPBlockingService.unblockIP(ipAddress);

      if (!unblocked) {
        throw new InternalServerError('Failed to unblock IP address');
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

    throw new BadRequestError('Invalid action');

  } catch (error) {
    return handleAPIError(error);
  }
}
