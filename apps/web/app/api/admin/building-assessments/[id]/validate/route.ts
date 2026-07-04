import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { DataCollectionService } from '@/lib/services/building-surveyor/DataCollectionService';

const validateAssessmentSchema = z
  .object({
    validated: z.boolean(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

/**
 * POST /api/admin/building-assessments/[id]/validate
 * Validate or reject an assessment
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 10 },
    // Validating an assessment marks AI output as ground truth and
    // feeds the model retrain pipeline. Mass-validating bad rows
    // would poison the model — demand fresh MFA proof.
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'building_assessment_validate',
      category: 'settings',
      targetType: 'building_assessment',
      targetId: (params) => params.id,
      description: 'Validated or rejected a building assessment',
    },
  },
  async (request, { user, params }) => {
    const { id } = params;

    const body = await request.json();
    const parsed = validateAssessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { validated, notes } = parsed.data;

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
  }
);
