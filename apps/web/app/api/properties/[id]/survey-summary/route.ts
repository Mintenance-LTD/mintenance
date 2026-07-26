/**
 * GET /api/properties/:id/survey-summary
 *
 * Rolls the property's room-anchored assessments up into one picture: which
 * rooms have been surveyed, the worst severity across them, how many need
 * attention, and the latest result per room.
 *
 * A walkthrough produces one survey per room, which answers "what is wrong
 * with the kitchen". This answers "what is the state of this house" without
 * the client having to pull every assessment and work it out itself — the room
 * picker drives its progress line and per-room status from this alone.
 *
 * Scoped by PropertyTeamService like the sibling assessments route. Only
 * summary fields are exposed; full AI results stay behind
 * /api/assessments/:id/status, which gates on ownership.
 */
import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { NotFoundError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { logger } from '@mintenance/shared';
// Pure aggregation lives in ./summarise — route files may only export handlers,
// and the ranking rules are the part worth testing directly.
import {
  summariseRoomSurveys,
  type RoomRow,
  type SurveyRow,
} from './summarise';

const SERVICE = 'property-survey-summary';

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

    const [roomsRes, surveysRes] = await Promise.all([
      serverSupabase
        .from('property_rooms')
        .select('id, name, room_type')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true }),
      serverSupabase
        .from('building_assessments')
        .select(
          'id, room_id, severity, urgency, damage_type, confidence, created_at'
        )
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (roomsRes.error || surveysRes.error) {
      logger.error(
        'Survey summary query failed',
        roomsRes.error ?? surveysRes.error ?? new Error('unknown'),
        { service: SERVICE, propertyId, userId: user.id }
      );
      return NextResponse.json(
        { error: 'Failed to load survey summary' },
        { status: 500 }
      );
    }

    const summary = summariseRoomSurveys(
      (roomsRes.data ?? []) as unknown as RoomRow[],
      (surveysRes.data ?? []) as unknown as SurveyRow[]
    );

    return NextResponse.json(summary);
  }
);
