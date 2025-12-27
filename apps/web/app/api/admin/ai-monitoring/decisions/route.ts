import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/decisions
 * Returns decision logs with pagination
 * Query params:
 * - agentName: filter by agent name (optional)
 * - limit: number of records (default: 50, max: 200)
 * - offset: pagination offset (default: 0)
 * - errorsOnly: boolean (default: false)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const errorsOnly = searchParams.get('errorsOnly') === 'true';

    const { logs, total } = await AgentAnalytics.getDecisionLogs(
      agentName,
      limit,
      offset,
      errorsOnly
    );

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
