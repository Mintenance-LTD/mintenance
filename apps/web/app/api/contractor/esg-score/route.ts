import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const upsertESGScoreSchema = z.object({
  environmental_score: z.number().min(0).max(100),
  social_score: z.number().min(0).max(100),
  governance_score: z.number().min(0).max(100),
  total_score: z.number().min(0).max(100),
  breakdown: z.record(z.unknown()).optional(),
});

export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const validation = await validateRequest(request, upsertESGScoreSchema);
    if (validation instanceof NextResponse) return validation;
    const payload = validation.data;

    const certificationLevel = payload.total_score >= 90
      ? 'platinum'
      : payload.total_score >= 80
        ? 'gold'
        : payload.total_score >= 70
          ? 'silver'
          : 'bronze';

    const { data: score, error } = await serverSupabase
      .from('contractor_esg_scores')
      .upsert({
        contractor_id: user.id,
        overall_esg_score: payload.total_score,
        environmental_score: payload.environmental_score,
        social_score: payload.social_score,
        governance_score: payload.governance_score,
        certification_level: certificationLevel,
        breakdown: payload.breakdown || null,
        last_calculated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error upserting ESG score', error, { service: 'esg-score', userId: user.id });
      throw new InternalServerError('Failed to save ESG score');
    }

    return NextResponse.json({ score }, { status: 201 });
  }
);
