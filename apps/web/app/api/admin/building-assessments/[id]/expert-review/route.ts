import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignAssessmentUrls } from '@/lib/api/assessment-storage';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { expertReviewSchema } from '@/lib/services/building-surveyor/evaluation/review-contract';
import { loadReviewSource } from '@/lib/services/building-surveyor/evaluation/review-source';

function assessmentId(value: unknown) {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new BadRequestError('Invalid assessment id');
  return parsed.data;
}

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 30 } },
  async (_request, { params }) => {
    const id = assessmentId(params.id);
    const source = await loadReviewSource(id);
    const { data: reviews, error } = await serverSupabase
      .from('assessment_expert_reviews')
      .select(
        'id, reviewer_id, created_at, source_fingerprint, labels, notes, expertise, evidence_image_ids'
      )
      .eq('assessment_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error)
      throw new InternalServerError(
        'Expert reviews are unavailable. Check the database migration.'
      );
    const urls = await resignAssessmentUrls(
      source.images.map((image) => image.image_url)
    );
    return NextResponse.json({
      sourceFingerprint: source.fingerprint,
      images: source.images.map((image, index) => ({
        id: image.id,
        imageIndex: image.image_index,
        url: urls[index],
      })),
      reviews: reviews ?? [],
    });
  }
);

export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 20 },
    requireMfaVerifiedWithinMinutes: 15,
    logActivity: {
      actionType: 'assessment_expert_review',
      category: 'verification',
      targetType: 'building_assessment',
      targetId: (params) => params.id,
      description: 'Recorded an expert assessment review',
    },
  },
  async (request, { user, params }) => {
    const id = assessmentId(params.id);
    const parsed = expertReviewSchema.safeParse(await request.json());
    if (!parsed.success)
      throw new BadRequestError(
        'Complete all review fields, photo selection and confirmation'
      );
    const source = await loadReviewSource(id);
    if (parsed.data.sourceFingerprint !== source.fingerprint)
      return NextResponse.json(
        {
          error:
            'The assessment or photos changed. Reload and review the current evidence.',
        },
        { status: 409 }
      );
    const imageIds = new Set(source.images.map((image) => image.id));
    if (parsed.data.evidenceImageIds.some((id) => !imageIds.has(id)))
      throw new BadRequestError('Evidence must belong to this assessment');
    const { data: saved, error } = await serverSupabase
      .from('assessment_expert_reviews')
      .insert({
        assessment_id: id,
        reviewer_id: user.id,
        source_fingerprint: source.fingerprint,
        source_snapshot: source.snapshot,
        property_id: source.row.property_id,
        domain: source.row.domain ?? 'building',
        labels: parsed.data.labels,
        notes: parsed.data.notes,
        expertise: parsed.data.expertise,
        evidence_image_ids: parsed.data.evidenceImageIds,
        protocol_version: 'primary-defect-v1',
      })
      .select('id, created_at')
      .single();
    if (error || !saved)
      throw new InternalServerError('The review could not be saved');
    return NextResponse.json({ review: saved }, { status: 201 });
  }
);
