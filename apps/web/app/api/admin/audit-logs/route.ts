import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with filtering and pagination.
 * Normalises the response to match the client-side AuditLog interface.
 */
export const GET = withApiHandler(
  { roles: ['admin'] },
  async (request) => {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500);
    const search = url.searchParams.get('search') || '';
    const action = url.searchParams.get('action') || '';
    const dateRange = url.searchParams.get('dateRange') || '';

    let query = serverSupabase
      .from('audit_logs')
      .select('id, user_id, action, ip_address, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (action) query = query.eq('action', action);
    if (search) query = query.ilike('action', `%${search}%`);

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let since: Date;
      switch (dateRange) {
        case 'today':
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch audit logs', { service: 'admin-audit-logs', error: error.message });
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    const rawLogs = data || [];
    const total = count || rawLogs.length;

    const logs = rawLogs.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      resource_type: deriveResourceType(row.action),
      resource_id: null,
      details: null,
      ip_address: row.ip_address,
      user_agent: null,
      created_at: row.created_at,
      status: deriveStatus(row.action),
    }));

    const stats = {
      total,
      success: logs.filter((l) => l.status === 'success').length,
      failure: logs.filter((l) => l.status === 'failure').length,
      warning: logs.filter((l) => l.status === 'warning').length,
    };

    return NextResponse.json({ logs, total, stats });
  }
);

function deriveResourceType(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('user') || lower.includes('contractor') || lower.includes('verify')) return 'user';
  if (lower.includes('payment') || lower.includes('escrow') || lower.includes('refund')) return 'payment';
  if (lower.includes('setting') || lower.includes('config')) return 'settings';
  if (lower.includes('login') || lower.includes('auth') || lower.includes('admin')) return 'auth';
  if (lower.includes('job') || lower.includes('dispute')) return 'job';
  return 'system';
}

function deriveStatus(action: string): 'success' | 'failure' | 'warning' {
  const lower = action.toLowerCase();
  if (lower.includes('fail') || lower.includes('error') || lower.includes('denied')) return 'failure';
  if (lower.includes('warn') || lower.includes('attempt') || lower.includes('forgery')) return 'warning';
  return 'success';
}
