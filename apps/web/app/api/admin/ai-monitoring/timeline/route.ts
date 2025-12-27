import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { AgentAnalytics } from '@/lib/services/agents/AgentAnalytics';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';

/**
 * GET /api/admin/ai-monitoring/timeline
 * Returns decision timeline for the last 24 hours
 * Query params:
 * - agentName: filter by agent name (optional)
 * REQUIRES: Admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agentName') || null;

    const timeline = await AgentAnalytics.getDecisionTimeline(agentName);

    return NextResponse.json({
      success: true,
      data: timeline,
      count: timeline.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
