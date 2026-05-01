/**
 * GET /api/properties/:id/assessments
 *
 * Lists building_assessments rows attached to a property, scoped by the
 * caller's PropertyTeamService access. Powers the Assessments tab on web
 * property detail and the property-assessment history list on mobile.
 *
 * Returns assessments ordered newest-first plus the first image URL for
 * each (used as a thumbnail). Only metadata fields are exposed — full AI
 * results live behind /api/assessments/:id/status, which already gates
 * on user_id ownership.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { logger } from '@mintenance/shared';

interface AssessmentImageRow {
  assessment_id: string;
  image_url: string;
  image_index: number | null;
}

interface AssessmentRow {
  id: string;
  user_id: string | null;
  property_id: string | null;
  domain: string | null;
  damage_type: string | null;
  severity: string | null;
  confidence: number | null;
  urgency: string | null;
  validation_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    const propertyId = params.id as string;

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      propertyId,
      'view'
    );
    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    const { data, error } = await serverSupabase
      .from('building_assessments')
      .select(
        'id, user_id, property_id, domain, damage_type, severity, ' +
          'confidence, urgency, validation_status, created_at, updated_at'
      )
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Property assessments query failed', error, {
        service: 'assessments',
        propertyId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to load assessments' },
        { status: 500 }
      );
    }

    const assessments = (data ?? []) as unknown as AssessmentRow[];
    const ids = assessments.map((a) => a.id);

    // Pull the lowest-index image for each assessment as a thumbnail.
    const thumbnails: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: images } = await serverSupabase
        .from('assessment_images')
        .select('assessment_id, image_url, image_index')
        .in('assessment_id', ids)
        .order('image_index', { ascending: true });

      const seen = new Set<string>();
      for (const row of (images as unknown as AssessmentImageRow[] | null) ??
        []) {
        if (!seen.has(row.assessment_id)) {
          thumbnails[row.assessment_id] = row.image_url;
          seen.add(row.assessment_id);
        }
      }
    }

    return NextResponse.json({
      assessments: assessments.map((a) => ({
        id: a.id,
        domain: a.domain,
        damageType: a.damage_type,
        severity: a.severity,
        confidence: a.confidence,
        urgency: a.urgency,
        validationStatus: a.validation_status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        thumbnailUrl: thumbnails[a.id] ?? null,
      })),
    });
  }
);
