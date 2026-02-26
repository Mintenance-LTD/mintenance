import { NextResponse } from 'next/server';
import { z } from 'zod';
import { memoryManager } from '@/lib/services/ml-engine/memory/MemoryManager';
import { withApiHandler } from '@/lib/api/with-api-handler';

const memoryUpdateSchema = z.object({
  level: z.number().int().min(0).max(10).optional(),
  keys: z.array(z.string().min(1).max(200)).optional(),
  values: z.array(z.unknown()).optional(),
}).refine(
  data => (data.keys !== undefined && data.values !== undefined) || data.level !== undefined,
  { message: 'Provide keys/values or level' }
);

/**
 * GET /api/ml/memory/[agentName]
 * Query memory state for agent
 */
export const GET = withApiHandler({ auth: false, rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const agentName = params.agentName as string;
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
});

/**
 * POST /api/ml/memory/[agentName]
 * Trigger memory update for agent
 */
export const POST = withApiHandler({ auth: false, rateLimit: { maxRequests: 30 } }, async (request, { params }) => {
  const agentName = params.agentName as string;
  const body = await request.json();
  const parsed = memoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request: provide keys/values or level (integer 0-10)' },
      { status: 400 }
    );
  }
  const { level, keys, values } = parsed.data;

  if (keys && values) {
    // Add context flow
    await memoryManager.addContextFlow(agentName, keys.map(Number), (values as number[]), level);
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
});
