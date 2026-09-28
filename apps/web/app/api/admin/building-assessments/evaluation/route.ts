import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { buildReviewReport } from '@/lib/services/building-surveyor/evaluation/report';
import type { ExpertReview } from '@/lib/services/building-surveyor/evaluation/review-contract';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 10 } },
  async () => {
    const generatedAt = new Date().toISOString();
    const reviews: ExpertReview[] = [];
    // Page explicitly: Supabase defaults to 1,000 rows. Never silently score a partial review history.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await serverSupabase
        .from('assessment_expert_reviews')
        .select(
          'id, assessment_id, reviewer_id, created_at, source_fingerprint, source_snapshot, labels, property_id, domain'
        )
        .lte('created_at', generatedAt)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + 499);
      if (error)
        throw new InternalServerError(
          'Unable to load expert evaluations. Check the database migration.'
        );
      reviews.push(...((data ?? []) as ExpertReview[]));
      if (!data || data.length < 500) break;
      if (reviews.length >= 10000)
        throw new InternalServerError(
          'Review history exceeds the interactive report limit. Use a bounded dataset export.'
        );
    }
    const reviewIds = reviews.map((review) => review.id).sort();
    const datasetId = createHash('sha256')
      .update(JSON.stringify(reviewIds))
      .digest('hex');
    return NextResponse.json({
      generatedAt,
      datasetId,
      reviewIds,
      protocolVersion: 'primary-defect-v1',
      ...buildReviewReport(reviews),
    });
  }
);
