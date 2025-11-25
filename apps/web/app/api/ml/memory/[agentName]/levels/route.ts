import { NextRequest, NextResponse } from 'next/server';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { logger } from '@mintenance/shared';

/**
 * GET /api/ml/memory/[agentName]/levels
 * Get all memory levels for agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentName: string }> }
) {
  try {
    const { agentName } = await params;
    const levels = memoryManager.getMemoryLevels(agentName);

    return NextResponse.json({ levels });
  } catch (error) {
    logger.error('Error getting memory levels', error, {
      service: 'MemoryAPI',
      agentName: 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to get memory levels' },
      { status: 500 }
    );
  }
}

