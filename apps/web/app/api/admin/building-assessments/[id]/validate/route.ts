import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

/**
 * POST /api/admin/building-assessments/[id]/validate
 * Validate or reject an assessment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let assessmentId: string | undefined;
  let userId: string | undefined;
  
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id } = await params;
    assessmentId = id;

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;

    const body = await request.json();
    const { validated, notes } = body;

    if (validated) {
      await DataCollectionService.validateAssessment(id, user.id, notes);
    } else {
      await DataCollectionService.rejectAssessment(
        id,
        user.id,
        notes || 'Rejected by admin'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('Error validating assessment', error, {
      service: 'admin_building_assessments',
      assessmentId,
      userId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate assessment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
