import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { resignAssessmentUrls } from '@/lib/api/assessment-storage';
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { authorizeAssessmentAnchors } from '@/app/api/building-surveyor/assess/_anchor-authorization';
import { loadReviewSource } from '@/lib/services/building-surveyor/evaluation/review-source';
import { inspectionEventSchema } from '@/lib/services/building-surveyor/inspection-events';

const columns =
  'id, actor_id, actor_role, created_at, source_fingerprint, kind, occurred_on, notes, outcome, evidence_image_ids';
async function authorize(id: string, user: { id: string; role?: string }) {
  if (!z.string().uuid().safeParse(id).success)
    throw new BadRequestError('Invalid assessment id');
  const { data, error } = await serverSupabase
    .from('building_assessments')
    .select('id, user_id, property_id, job_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new InternalServerError('Unable to read the assessment');
  if (!data || (data.user_id !== user.id && user.role !== 'admin'))
    throw new NotFoundError('Assessment not found');
  if (user.role !== 'admin')
    await authorizeAssessmentAnchors({
      userId: user.id,
      propertyId: data.property_id ?? undefined,
      jobId: data.job_id ?? undefined,
      service: 'assessment-activity',
    });
  return user.role === 'admin' ? 'admin' : 'owner';
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const id = params.id;
    await authorize(id, user);
    const source = await loadReviewSource(id);
    const { data, error } = await serverSupabase
      .from('assessment_inspection_events')
      .select(columns)
      .eq('assessment_id', id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(101);
    if (error) throw new InternalServerError('Survey activity is unavailable');
    const images = await Promise.all(
      source.images.map(async (image) => {
        const [url] = await resignAssessmentUrls([image.image_url], 3600, id);
        return {
          id: image.id,
          imageIndex: image.image_index,
          url: url ?? null,
        };
      })
    );
    return NextResponse.json(
      {
        sourceFingerprint: source.fingerprint,
        images,
        events: (data ?? []).slice(0, 100),
        hasMore: (data?.length ?? 0) > 100,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const id = params.id;
    const role = await authorize(id, user);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = inspectionEventSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestError(
        'Complete the activity, date, notes and photo selection'
      );
    const value = parsed.data;
    if (value.occurredOn > new Date().toISOString().slice(0, 10))
      throw new BadRequestError('The activity date cannot be in the future');
    // Retries return the original record, even if new photos were added afterwards.
    const existing = await serverSupabase
      .from('assessment_inspection_events')
      .select(`${columns}, request_id`)
      .eq('assessment_id', id)
      .eq('actor_id', user.id)
      .eq('request_id', value.requestId)
      .maybeSingle();
    if (existing.error)
      throw new InternalServerError('Unable to check saved activity');
    const matches = (row: Record<string, unknown>) =>
      row.kind === value.kind &&
      row.occurred_on === value.occurredOn &&
      row.notes === value.notes &&
      row.outcome === value.outcome &&
      row.source_fingerprint === value.sourceFingerprint &&
      JSON.stringify(row.evidence_image_ids) ===
        JSON.stringify(value.evidenceImageIds);
    const duplicate = (row: Record<string, unknown>) =>
      matches(row)
        ? NextResponse.json({ event: row }, { status: 200 })
        : NextResponse.json(
            {
              error:
                'This request was already used for different activity. Reload before saving.',
            },
            { status: 409 }
          );
    if (existing.data) return duplicate(existing.data);
    const source = await loadReviewSource(id);
    if (value.sourceFingerprint !== source.fingerprint)
      return NextResponse.json(
        {
          error:
            'The assessment or photos changed. Reload the photos before saving.',
        },
        { status: 409 }
      );
    const ids = new Set(source.images.map((image) => image.id));
    if (value.evidenceImageIds.some((imageId) => !ids.has(imageId)))
      throw new BadRequestError('Evidence must belong to this assessment');
    const { data, error } = await serverSupabase
      .from('assessment_inspection_events')
      .insert({
        assessment_id: id,
        actor_id: user.id,
        actor_role: role,
        request_id: value.requestId,
        kind: value.kind,
        occurred_on: value.occurredOn,
        notes: value.notes,
        outcome: value.outcome,
        evidence_image_ids: value.evidenceImageIds,
        source_fingerprint: source.fingerprint,
        source_snapshot: source.snapshot,
      })
      .select(columns)
      .single();
    if (error?.code === '23505') {
      const retry = await serverSupabase
        .from('assessment_inspection_events')
        .select(columns)
        .eq('assessment_id', id)
        .eq('actor_id', user.id)
        .eq('request_id', value.requestId)
        .maybeSingle();
      if (!retry.error && retry.data) return duplicate(retry.data);
    }
    if (error || !data)
      throw new InternalServerError('The activity could not be saved');
    return NextResponse.json({ event: data }, { status: 201 });
  }
);
