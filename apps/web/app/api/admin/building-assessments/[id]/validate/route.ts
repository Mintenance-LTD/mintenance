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
  try {
    // CSRF protection
    await requireCSRF(request);
    const { id } = await params;

    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  } catch (error: any) {
    logger.error('Error validating assessment', error, {
      service: 'admin_building_assessments',
      assessmentId: id,
      userId: user.id,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to validate assessment' },
      { status: 500 }
    );
  }
}
