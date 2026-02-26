import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getModelHealthInfo } from '@/lib/monitoring/modelHealth';

/**
 * GET /api/admin/model-health
 * Returns Roboflow model configuration and validation status.
 */
export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const modelHealth = getModelHealthInfo();
    return NextResponse.json(modelHealth);
  }
);
