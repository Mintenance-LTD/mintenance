import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { MemoryAnalytics } from '@/lib/services/ml-engine/analytics/MemoryAnalytics';
import { logger } from '@mintenance/shared';

/**
 * GET /api/ml/memory/[agentName]
 * Query memory state for agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentName: string } }
) {
  try {
    const { agentName } = params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') ? parseInt(searchParams.get('level')!) : undefined;

    const levels = memoryManager.getMemoryLevels(agentName);

    if (level !== undefined) {
      const targetLevel = levels.find(l => l.level === level);
      if (!targetLevel) {
        return NextResponse.json(
          { error: `Memory level ${level} not found for agent ${agentName}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ level: targetLevel });
    }

    return NextResponse.json({ levels });
  } catch (error) {
    logger.error('Error querying memory state', error, {
      service: 'MemoryAPI',
      agentName: params.agentName,
    });
    return NextResponse.json(
      { error: 'Failed to query memory state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ml/memory/[agentName]
 * Trigger memory update for agent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentName: string } }
) {
  try {
    const { agentName } = params;
    const body = await request.json();
    const { level, keys, values } = body;

    if (keys && values) {
      // Add context flow
      await memoryManager.addContextFlow(agentName, keys, values, level);
      return NextResponse.json({ success: true, message: 'Context flow added' });
    } else if (level !== undefined) {
      // Trigger memory update
      const result = await memoryManager.updateMemoryLevel(agentName, level);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: 'Invalid request: provide keys/values or level' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error updating memory', error, {
      service: 'MemoryAPI',
      agentName: params.agentName,
    });
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

