import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

// Minimal schema matching Phase1BuildingAssessment shape — enough to validate
// the corrected label without importing the full type at schema-validation time.
const damageAssessmentSchema = z.object({
  damageType: z.string().min(1),
  severity: z.enum(['early', 'midway', 'full']),
  confidence: z.number().min(0).max(100),
  location: z.string(),
  description: z.string(),
  detectedItems: z.array(z.string()).optional().default([]),
});

const hazardSchema = z.object({
  type: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string(),
  description: z.string(),
  immediateAction: z.string().optional(),
  urgency: z.enum(['immediate', 'urgent', 'soon', 'planned', 'monitor']),
});

const correctedResponseSchema = z.object({
  damageAssessment: damageAssessmentSchema,
  safetyHazards: z.object({
    hazards: z.array(hazardSchema),
    hasCriticalHazards: z.boolean(),
    overallSafetyScore: z.number().min(0).max(100),
  }),
  compliance: z.object({
    complianceIssues: z.array(z.object({
      issue: z.string(),
      regulation: z.string().optional(),
      severity: z.enum(['info', 'warning', 'violation']),
      description: z.string(),
      recommendation: z.string(),
    })),
    requiresProfessionalInspection: z.boolean(),
    complianceScore: z.number().min(0).max(100),
  }),
  insuranceRisk: z.object({
    riskFactors: z.array(z.object({
      factor: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      impact: z.string(),
    })),
    riskScore: z.number().min(0).max(100),
    premiumImpact: z.enum(['none', 'low', 'medium', 'high']),
    mitigationSuggestions: z.array(z.string()),
  }),
  urgency: z.object({
    urgency: z.enum(['immediate', 'urgent', 'soon', 'planned', 'monitor']),
    recommendedActionTimeline: z.string(),
    estimatedTimeToWorsen: z.string().optional(),
    reasoning: z.string(),
    priorityScore: z.number().min(0).max(100),
  }),
  homeownerExplanation: z.object({
    whatIsIt: z.string(),
    whyItHappened: z.string(),
    whatToDo: z.string(),
  }),
  contractorAdvice: z.object({
    repairNeeded: z.array(z.string()),
    materials: z.array(z.object({
      name: z.string(),
      quantity: z.string(),
      estimatedCost: z.number(),
    })),
    tools: z.array(z.string()),
    estimatedTime: z.string(),
    estimatedCost: z.object({
      min: z.number(),
      max: z.number(),
      recommended: z.number(),
    }),
    complexity: z.enum(['low', 'medium', 'high']),
  }),
});

const requestSchema = z.object({
  correctedResponse: correctedResponseSchema,
  notes: z.string().max(2000).optional(),
});

/**
 * POST /api/admin/building-assessments/[id]/correct-vlm-label
 *
 * Allows admins to supply a corrected Phase1BuildingAssessment label for a
 * training buffer entry. The corrected label:
 *   1. Overrides teacher_response in TrainingDataExporter (human beats GPT-4o)
 *   2. Sets human_verified = true and priority_score = 1.0 (max priority)
 *
 * This closes the teacher ceiling gap: systematic GPT-4o errors can be
 * corrected by a human surveyor and baked into the next training round.
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const { id } = params;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid corrected response', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { correctedResponse, notes } = parsed.data;

    // Verify the assessment exists
    const { data: assessment, error: fetchError } = await serverSupabase
      .from('building_assessments')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Update all unused buffer entries for this assessment with the corrected label
    const { error: updateError, count } = await serverSupabase
      .from('vlm_training_buffer')
      .update({
        human_corrected_response: correctedResponse,
        human_verified: true,
        // Max priority — human-corrected examples are exported first
        priority_score: 1.0,
      })
      .eq('assessment_id', id)
      .eq('used_in_training', false);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update training buffer', details: updateError.message },
        { status: 500 }
      );
    }

    // Audit log
    await serverSupabase.from('building_assessments').update({
      validation_notes: notes
        ? `[VLM label corrected by ${user.id}] ${notes}`
        : `[VLM label corrected by ${user.id}]`,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    return NextResponse.json({
      success: true,
      bufferEntriesUpdated: count ?? 0,
    });
  }
);
