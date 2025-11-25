import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/ml/memory/[agentName]/consolidate
 * Trigger memory consolidation for agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  try {
    // CSRF protection
    await requireCSRF(request);
    const { agentName } = await params;
    const body = await request.json();
    const { level } = body;

    if (level !== undefined) {
      // Consolidate specific level
      const result = await memoryManager.updateMemoryLevel(agentName, level);
      return NextResponse.json({ success: true, result });
    } else {
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
    }
  } catch (error) {
    logger.error('Error consolidating memory', error, {
      service: 'MemoryAPI',
      // We can't easily access agentName here if await params failed, but it's unlikely.
      // We'll try to get it from the URL or just omit it.
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to consolidate memory' },
      { status: 500 }
    );
  }
}
