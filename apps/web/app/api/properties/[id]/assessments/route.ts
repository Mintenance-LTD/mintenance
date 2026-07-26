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
import { resignAssessmentUrls } from '@/lib/api/assessment-storage';
import { logger } from '@mintenance/shared';

interface AssessmentImageRow {
  assessment_id: string;
  image_url: string;
  image_index: number | null;
}

interface RoomRow {
  id: string;
  name: string;
  room_type: string;
}

interface AssessmentRow {
  id: string;
  user_id: string | null;
  property_id: string | null;
  room_id: string | null;
  domain: string | null;
  damage_type: string | null;
  severity: string | null;
  confidence: number | null;
  urgency: string | null;
  validation_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Surveyor fields plucked from assessment_data JSONB. Web-written rows
  // carry them top-level; mobile-patched rows nest them under ai_analysis.
  rics: number | null;
  rics_ai: number | null;
  onsite: boolean | null;
  onsite_ai: boolean | null;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (request, { user, params }) => {
    const propertyId = params.id as string;
    // Optional room filter — "what has happened in this room?".
    const roomFilter = request.nextUrl.searchParams.get('roomId') || null;

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      propertyId,
      'view'
    );
    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    let query = serverSupabase
      .from('building_assessments')
      .select(
        'id, user_id, property_id, room_id, domain, damage_type, severity, ' +
          'confidence, urgency, validation_status, created_at, updated_at, ' +
          'rics:assessment_data->ricsConditionRating, ' +
          'rics_ai:assessment_data->ai_analysis->ricsConditionRating, ' +
          'onsite:assessment_data->needsOnsiteInspection, ' +
          'onsite_ai:assessment_data->ai_analysis->needsOnsiteInspection'
      )
      .eq('property_id', propertyId);

    if (roomFilter) {
      query = query.eq('room_id', roomFilter);
    }

    const { data, error } = await query
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

      // assessment-photos is private (20260726135946), so a stored thumbnail
      // is a signed URL that eventually expires. Re-sign rather than handing
      // the client a dead image; URLs from other buckets pass through.
      const keys = Object.keys(thumbnails);
      const fresh = await resignAssessmentUrls(keys.map((k) => thumbnails[k]!));
      keys.forEach((k, i) => {
        thumbnails[k] = fresh[i] ?? thumbnails[k]!;
      });
    }

    // Room names, looked up separately rather than embedded. A many-to-one
    // embed comes back as an object but has repeatedly been read as an array
    // in this codebase; a keyed lookup has no such ambiguity and mirrors how
    // the thumbnails above are resolved.
    const rooms: Record<string, RoomRow> = {};
    const roomIds = Array.from(
      new Set(assessments.map((a) => a.room_id).filter((r): r is string => !!r))
    );
    if (roomIds.length > 0) {
      const { data: roomRows } = await serverSupabase
        .from('property_rooms')
        .select('id, name, room_type')
        .in('id', roomIds);
      for (const room of (roomRows as unknown as RoomRow[] | null) ?? []) {
        rooms[room.id] = room;
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
        ricsConditionRating: a.rics ?? a.rics_ai ?? null,
        needsOnsiteInspection: Boolean(a.onsite ?? a.onsite_ai),
        // null for property- or job-scoped surveys, and for a survey whose
        // room was later deleted (the FK is ON DELETE SET NULL so the history
        // survives the room).
        room: a.room_id
          ? {
              id: a.room_id,
              name: rooms[a.room_id]?.name ?? null,
              type: rooms[a.room_id]?.room_type ?? null,
            }
          : null,
      })),
    });
  }
);
