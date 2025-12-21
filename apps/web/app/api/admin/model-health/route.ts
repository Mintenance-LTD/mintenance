import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { getModelHealthInfo } from '@/lib/monitoring/modelHealth';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/model-health
 *
 * Returns Roboflow model configuration and validation status.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;

    // Get model health info
    const modelHealth = getModelHealthInfo();

    return NextResponse.json(modelHealth);
  } catch (error) {
    logger.error('Error fetching model health', error);
    return NextResponse.json(
      {
        modelId: 'Unknown',
        modelVersion: 'Unknown',
        baseUrl: 'Unknown',
        valid: false,
        validationError: 'Failed to fetch model health',
      },
      { status: 500 }
    );
  }
}

