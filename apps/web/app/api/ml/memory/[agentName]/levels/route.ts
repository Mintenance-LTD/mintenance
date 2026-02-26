import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';

/**
 * GET /api/ml/memory/[agentName]/levels
 * Get all memory levels for agent
 */
export const GET = withApiHandler({ auth: false }, async (_request, { params }) => {
  const levels = memoryManager.getMemoryLevels(params.agentName);
  return NextResponse.json({ levels });
});
