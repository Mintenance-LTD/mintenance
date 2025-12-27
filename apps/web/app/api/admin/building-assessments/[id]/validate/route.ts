import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminError } from '@/lib/middleware/requireAdmin';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError } from '@/lib/errors/api-error';

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

    const auth = await requireAdmin(request);
    if (isAdminError(auth)) return auth.error;
    const user = auth.user;
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
    return handleAPIError(error);
  }
}
