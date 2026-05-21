/**
 * /api/properties/[id]/rooms/[roomId]
 *
 * PATCH  — update a room (partial). Owner/admin only.
 * DELETE — remove a room. Owner/admin only.
 *
 * RLS enforces ownership at the row level too, so even a forged
 * params.id can't escape — but we belt-and-braces with the explicit
 * PropertyTeamService check first to return a clean 403 instead of
 * an empty 0-row UPDATE.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
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
import { ROOM_TYPES } from '../route';

const updateRoomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Room name is required')
      .max(80, 'Room name must be 80 characters or fewer')
      .optional(),
    room_type: z.enum(ROOM_TYPES).optional(),
    size_sqm: z
      .number()
      .min(0, 'Size cannot be negative')
      .max(10000, 'Size looks unrealistically large')
      .optional()
      .nullable(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes must be 500 characters or fewer')
      .optional()
      .nullable(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });

export const PATCH = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 30 },
  },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id) || !isValidUUID(params.roomId)) {
      throw new NotFoundError('Room not found');
    }

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to edit rooms on this property'
      );
    }

    const validation = await validateRequest(request, updateRoomSchema);
    if ('headers' in validation) {
      return validation;
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const { data, error } = await userDb
      .from('property_rooms')
      .update(validation.data)
      .eq('id', params.roomId)
      .eq('property_id', params.id)
      .select('id, name, room_type, size_sqm, notes, created_at, updated_at')
      .maybeSingle();

    if (error) {
      logger.error('Failed to update property room', {
        error: error.message,
        propertyId: params.id,
        roomId: params.roomId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to update room');
    }

    if (!data) {
      throw new NotFoundError('Room not found');
    }

    return NextResponse.json({ room: data });
  }
);

export const DELETE = withApiHandler(
  {
    roles: ['homeowner', 'admin'],
    rateLimit: { maxRequests: 30 },
  },
  async (request, { user, params }) => {
    if (!isValidUUID(params.id) || !isValidUUID(params.roomId)) {
      throw new NotFoundError('Room not found');
    }

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to delete rooms on this property'
      );
    }

    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const { error, count } = await userDb
      .from('property_rooms')
      .delete({ count: 'exact' })
      .eq('id', params.roomId)
      .eq('property_id', params.id);

    if (error) {
      logger.error('Failed to delete property room', {
        error: error.message,
        propertyId: params.id,
        roomId: params.roomId,
        userId: user.id,
      });
      throw new InternalServerError('Failed to delete room');
    }

    if (!count) {
      throw new NotFoundError('Room not found');
    }

    return NextResponse.json({ success: true });
  }
);
