/**
 * /api/properties/[id]/rooms
 *
 * GET  — list rooms for a property
 *           - owner OR team-view member can read
 *           - contractor with an active/completed job on that property
 *             can read (enforced in code, mirroring the RLS policy
 *             property_rooms_contractor_read — RLS does not run on web)
 *
 * POST — create a new room
 *           - owner OR team-edit member can create
 *           - body: { name, room_type, size_sqm?, notes? }
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { isValidUUID } from '@/lib/validation/uuid';
// ROOM_TYPES + createRoomSchema live in ./schema (not here) — App Router
// route files may only export handlers/config, else `next build` fails.
import { createRoomSchema } from './schema';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 } },
  async (_request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Property not found');
    }

    // 2026-05-23 audit-20 P2: previously this route ran the
    // PropertyTeamService.authorize() gate and THEN read through
    // `createRequestScopedClient` (RLS-bound to the caller). Live
    // property_rooms RLS only grants SELECT to owner OR
    // contractor-of-active-job — team members (manager / viewer) pass
    // the in-code authorize check then get `data: []` back. Same
    // pattern audit-14 #78 and audit-15 #84 adopted for property
    // access reads + properties detail GET: PropertyTeamService is
    // the authoritative gate, so service-role read is consistent.
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'view'
    );

    const isAdmin = user.role === 'admin';
    const isContractor = user.role === 'contractor';

    // 2026-08-05 IDOR fix: web authenticates with a custom JWT cookie, so
    // there is no Supabase session — the contractor branch previously fell
    // back to the service-role client expecting the RLS
    // property_rooms_contractor_read policy to gate by job status, but RLS
    // never runs on web, so ANY contractor could read ANY property's rooms.
    // Enforce that policy in code: a contractor may read only when they
    // hold an active/completed job (assigned/in_progress/completed) on this
    // property.
    if (isContractor && !authorized && !isAdmin) {
      const { data: qualifyingJob } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('property_id', params.id)
        .eq('contractor_id', user.id)
        .in('status', ['assigned', 'in_progress', 'completed'])
        .limit(1)
        .maybeSingle();
      if (!qualifyingJob) {
        // No job link to this property — deny silently, same as a
        // homeowner who doesn't own it.
        throw new NotFoundError('Property not found');
      }
    } else if (!authorized && !isAdmin) {
      // Homeowner who doesn't own this property — deny silently
      throw new NotFoundError('Property not found');
    }

    // All authorised readers (owner / admin / team-view / contractor with a
    // qualifying job) read through the service-role client — the checks
    // above are the authoritative gate.
    const { data, error } = await serverSupabase
      .from('property_rooms')
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .eq('property_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch property rooms', {
        error: error.message,
        propertyId: params.id,
      });
      throw new InternalServerError('Failed to fetch rooms');
    }

    return NextResponse.json({ rooms: data ?? [] });
  }
);

export const POST = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 30 },
  },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id)) {
      throw new NotFoundError('Property not found');
    }

    // Edit-level authorisation
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to add rooms to this property'
      );
    }

    const validation = await validateRequest(request, createRoomSchema);
    if ('headers' in validation) {
      return validation;
    }

    const { name, room_type, size_sqm, notes } = validation.data;

    // 2026-05-23 audit-20 P2: same RLS-detour rationale as the GET
    // branch — managers (team_edit) need to insert rooms but the
    // property_rooms RLS write policy only grants the owner.
    // PropertyTeamService.authorize('edit') above is the boundary.
    const { data, error } = await serverSupabase
      .from('property_rooms')
      .insert({
        property_id: params.id,
        name,
        room_type,
        size_sqm: size_sqm ?? null,
        notes: notes ?? null,
      })
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .single();

    if (error) {
      logger.error('Failed to create property room', {
        error: error.message,
        propertyId: params.id,
        userId: user.id,
      });
      throw new InternalServerError('Failed to create room');
    }

    return NextResponse.json({ room: data }, { status: 201 });
  }
);
