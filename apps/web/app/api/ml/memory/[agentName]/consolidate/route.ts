import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';

const consolidateSchema = z.object({
  level: z.number().int().min(0).max(10).optional(),
});

/**
 * POST /api/ml/memory/[agentName]/consolidate
 * Trigger memory consolidation for agent
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const { agentName } = params as { agentName: string };

  const body = await request.json();
  const parsed = consolidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'level must be an integer 0-10 if provided' },
      { status: 400 }
    );
  }
  const { level } = parsed.data;

  if (level !== undefined) {
    const result = await memoryManager.updateMemoryLevel(agentName, level);
    return NextResponse.json({ success: true, result });
  }

  // Consolidate all levels
  const levels = memoryManager.getMemoryLevels(agentName);
  const results = [];

  for (const memoryLevel of levels) {
    try {
      const result = await memoryManager.updateMemoryLevel(agentName, memoryLevel.level);
      results.push(result);
    } catch (error) {
      logger.warn('Failed to consolidate memory level', {
        service: 'MemoryAPI',
        agentName,
        level: memoryLevel.level,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    consolidated: results.length,
    results,
  });
});
