import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
} from '@/lib/errors/api-error';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { loadReviewSource } from '@/lib/services/building-surveyor/evaluation/review-source';

const ids = z.object({
  id: z.string().uuid(),
  assessmentId: z.string().uuid(),
});
const bodySchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(5000),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  })
  .strict();

async function loadHandoff(
  actorId: string,
  propertyId: string,
  assessmentId: string
) {
  const access = await PropertyTeamService.authorize(
    actorId,
    propertyId,
    'edit'
  );
  if (!access.authorized) throw new NotFoundError('Assessment not found');

  const { data: property, error: propertyError } = await serverSupabase
    .from('properties')
    .select('org_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError) throw propertyError;
  if (!property?.org_id)
    throw new ConflictError(
      'Link this property to a Portfolio workspace first'
    );
  const { data: membership, error: membershipError } = await serverSupabase
    .from('organization_memberships')
    .select('org_role')
    .eq('org_id', property.org_id)
    .eq('user_id', actorId)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (
    !membership ||
    !['owner', 'manager', 'maintenance_coordinator'].includes(
      membership.org_role
    )
  )
    throw new ForbiddenError('Workspace staff access required');

  const { data: assessment, error: assessmentError } = await serverSupabase
    .from('building_assessments')
    .select('updated_at,validation_status,validated_by')
    .eq('id', assessmentId)
    .eq('property_id', propertyId)
    .eq('user_id', actorId)
    .maybeSingle();
  if (assessmentError) throw assessmentError;
  if (!assessment) throw new NotFoundError('Assessment not found');
  const { data: existing, error: existingError } = await serverSupabase
    .from('portfolio_assessment_sources')
    .select('ticket_id')
    .eq('assessment_id', assessmentId)
    .maybeSingle();
  if (existingError && ['42P01', 'PGRST205'].includes(existingError.code))
    return null;
  if (existingError) throw existingError;

  if (existing) {
    const { data: linked, error: linkedError } = await serverSupabase
      .from('maintenance_tickets')
      .select('id,org_id')
      .eq('id', existing.ticket_id)
      .eq('property_id', propertyId)
      .eq('org_id', property.org_id)
      .maybeSingle();
    if (linkedError) throw linkedError;
    if (!linked)
      throw new ForbiddenError('Existing task is not in this workspace');
    return {
      orgId: property.org_id,
      assessment,
      reviewId: null,
      imageIds: null,
      canCreate: false,
      ticketId: linked.id,
    };
  }
  let reviewId: string | null = null;
  let imageIds: string[] | null = null;
  const validated =
    assessment.validation_status === 'validated' &&
    Boolean(assessment.validated_by);
  if (!validated) {
    try {
      const source = await loadReviewSource(assessmentId);
      if (source.row.property_id !== propertyId)
        throw new NotFoundError('Assessment not found');
      const { data: review, error: reviewError } = await serverSupabase
        .from('assessment_expert_reviews')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('property_id', propertyId)
        .eq('source_fingerprint', source.fingerprint)
        .limit(1)
        .maybeSingle();
      if (reviewError) throw reviewError;
      reviewId = review?.id ?? null;
      if (reviewId) imageIds = source.images.map((image) => image.id).sort();
    } catch (error) {
      if (!(error instanceof BadRequestError)) throw error;
    }
  }
  return {
    orgId: property.org_id,
    assessment,
    reviewId,
    imageIds,
    canCreate: validated || Boolean(reviewId),
    ticketId: null,
  };
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    const target = ids.safeParse(params);
    if (!target.success) throw new BadRequestError('Invalid assessment');
    const result = await loadHandoff(
      user.id,
      target.data.id,
      target.data.assessmentId
    );
    if (!result)
      return NextResponse.json(
        {
          canCreate: false,
          ticket: null,
          reason: 'Assessment handoff is not available in this environment yet',
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    const { orgId, canCreate, ticketId } = result;
    return NextResponse.json(
      {
        canCreate,
        ticket: ticketId ? { id: ticketId, org_id: orgId } : null,
        ...(!canCreate && !ticketId
          ? { reason: 'Review the current assessment before creating a task' }
          : {}),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 15 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    const target = ids.safeParse(params);
    const input = bodySchema.safeParse(await request.json().catch(() => null));
    if (!target.success || !input.success)
      throw new BadRequestError(
        'Provide a valid task title, summary and priority'
      );
    const { id: propertyId, assessmentId } = target.data;
    const handoff = await loadHandoff(user.id, propertyId, assessmentId);
    if (!handoff) throw new ServiceUnavailableError('Assessment handoff');
    const { assessment, reviewId, imageIds, canCreate, ticketId } = handoff;
    if (!canCreate && !ticketId)
      throw new ConflictError(
        'Review the current assessment before creating a task'
      );
    const { data, error } = await serverSupabase.rpc(
      'create_assessment_portfolio_ticket',
      {
        p_actor: user.id,
        p_property: propertyId,
        p_assessment: assessmentId,
        p_revision: assessment.updated_at,
        p_review: reviewId,
        p_image_ids: imageIds,
        p_title: input.data.title,
        p_description: input.data.description,
        p_priority: input.data.priority,
      }
    );
    if (error?.code === 'P0002')
      throw new NotFoundError('Assessment not found');
    if (error && ['PGRST202', '42883'].includes(error.code))
      throw new ServiceUnavailableError('Assessment handoff');
    if (error?.code === '42501')
      throw new ForbiddenError(
        'Workspace or property access is no longer available'
      );
    if (error?.code === '23514')
      throw new ConflictError(
        'The assessment or workspace changed. Reload and try again.'
      );
    if (error) throw error;
    return NextResponse.json(
      { feature: 'portfolio_mode', ticket: data.ticket },
      { status: data.created ? 201 : 200 }
    );
  }
);
