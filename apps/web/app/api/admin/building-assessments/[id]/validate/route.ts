import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/admin/building-assessments/[id]/validate
 * Validate or reject an assessment
 */
export async function POST(
  request: NextRequest,
  { 
  // CSRF protection
  await requireCSRF(request);
params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { validated, notes } = body;

    if (validated) {
      await DataCollectionService.validateAssessment(params.id, user.id, notes);
    } else {
      await DataCollectionService.rejectAssessment(
        params.id,
        user.id,
        notes || 'Rejected by admin'
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error validating assessment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate assessment' },
      { status: 500 }
    );
  }
}

