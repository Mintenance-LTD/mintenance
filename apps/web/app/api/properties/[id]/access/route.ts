import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

/**
 * PATCH /api/properties/[id]/access
 *
 * Updates the "Access & contacts" subset of a property (access mode,
 * lock-box code, notes, stopcock/isolator/consumer-unit locations).
 *
 * Backed by the columns added in migration
 * `20260520000003_property_access_fields.sql`.
 *
 * Authorization
 * -------------
 * - Owner of the property OR a property-team member with the `edit`
 *   permission (manager+). Tenants/viewers cannot edit access info.
 * - Admins can edit any property's access info for support purposes.
 *
 * Sensitivity
 * -----------
 * `key_safe_code` is the most sensitive field on the property. The
 * contractor-side surfacing in `/contractor/jobs/[id]/page.tsx` masks
 * the value to `null` unless the job is at the `ready_to_start` or
 * `in_progress` stage. This endpoint logs an access-mode change but
 * NEVER logs the code value itself (defence-in-depth alongside the
 * Sentry `beforeSend` redaction).
 */

const accessSchema = z.object({
  access_mode: z
    .enum(['key_safe', 'smart_lock', 'in_person'])
    .nullable()
    .optional(),
  // Lock-box code: free-format string (homeowners use letters/digits/
  // spaces/punctuation) but capped at 64 chars to avoid abuse. Allow
  // explicit empty-string → null so the homeowner can clear the code.
  key_safe_code: z
    .string()
    .max(64, 'Code must be 64 characters or fewer')
    .nullable()
    .optional(),
  access_notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or fewer')
    .nullable()
    .optional(),
  stopcock_location: z
    .string()
    .max(500, 'Location must be 500 characters or fewer')
    .nullable()
    .optional(),
  gas_isolator_location: z
    .string()
    .max(500, 'Location must be 500 characters or fewer')
    .nullable()
    .optional(),
  consumer_unit_location: z
    .string()
    .max(500, 'Location must be 500 characters or fewer')
    .nullable()
    .optional(),
});

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // Require manager+ role on the property team (or admin) to edit
    // access info — same gate as PUT on the parent property route.
    const { authorized, role: propertyRole } =
      await PropertyTeamService.authorize(user.id, params.id, 'edit');
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to edit this property'
      );
    }

    // 2026-05-26 audit-61 P2: GET on /api/properties/[id] redacts
    // key_safe_code for non-owner / non-platform-admin callers
    // (audit-37 P0). PATCH must mirror that — without this gate a
    // manager opens the editor, sees a blank lock-box field
    // (because the GET stripped it), types a guess or leaves it
    // empty, and the existing real code gets overwritten by the
    // blind PATCH. Owner of the property + platform admin are the
    // only callers allowed to mutate the code itself; managers /
    // team-admins continue to edit every other access field.
    const isPropertyOwner = propertyRole === 'owner';
    const isPlatformAdmin = user.role === 'admin';
    const canEditKeySafeCode = isPropertyOwner || isPlatformAdmin;

    const validation = await validateRequest(request, accessSchema);
    if ('headers' in validation) {
      return validation;
    }

    const {
      access_mode,
      key_safe_code,
      access_notes,
      stopcock_location,
      gas_isolator_location,
      consumer_unit_location,
    } = validation.data;

    if (key_safe_code !== undefined && !canEditKeySafeCode) {
      logger.warn(
        'Non-owner PATCH attempted to modify key_safe_code; ignoring field',
        {
          service: 'properties',
          propertyId: params.id,
          userId: user.id,
          role: propertyRole,
        }
      );
      throw new ForbiddenError(
        'Only the property owner can edit the lock-box code.'
      );
    }

    // Build update payload conditionally — caller may PATCH any
    // subset of the access fields; undefined leaves the existing
    // value intact, explicit null clears it.
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (access_mode !== undefined) updateData.access_mode = access_mode;
    if (key_safe_code !== undefined) {
      updateData.key_safe_code =
        key_safe_code && key_safe_code.trim().length > 0
          ? key_safe_code.trim()
          : null;
    }
    if (access_notes !== undefined) {
      updateData.access_notes =
        access_notes && access_notes.trim().length > 0
          ? access_notes.trim()
          : null;
    }
    if (stopcock_location !== undefined) {
      updateData.stopcock_location =
        stopcock_location && stopcock_location.trim().length > 0
          ? stopcock_location.trim()
          : null;
    }
    if (gas_isolator_location !== undefined) {
      updateData.gas_isolator_location =
        gas_isolator_location && gas_isolator_location.trim().length > 0
          ? gas_isolator_location.trim()
          : null;
    }
    if (consumer_unit_location !== undefined) {
      updateData.consumer_unit_location =
        consumer_unit_location && consumer_unit_location.trim().length > 0
          ? consumer_unit_location.trim()
          : null;
    }

    // 2026-05-23 audit: write via service-role. The PropertyTeamService
    // gate above is the authoritative app-side check; the live properties
    // RLS UPDATE policy only allows `owner_id = auth.uid()`, so the
    // previous request-scoped client silently no-op'd for accepted
    // managers — they passed the app check, then their PATCH did nothing.
    // A future migration that extends RLS to property_team_members would
    // let us drop back to userDb, but until then the team-edit promise
    // requires service-role.
    const { data, error } = await serverSupabase
      .from('properties')
      .update(updateData)
      .eq('id', params.id)
      .select(
        'id, access_mode, key_safe_code, access_notes, stopcock_location, gas_isolator_location, consumer_unit_location'
      )
      .single();

    if (error) {
      logger.error('Error updating property access fields', error, {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
        // NEVER log key_safe_code or access_notes — they're sensitive.
        // Only log which fields were touched.
        fieldsTouched: Object.keys(updateData).filter(
          (k) => k !== 'updated_at'
        ),
      });
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Property not found or not authorized');
    }

    logger.info('Property access updated', {
      service: 'properties',
      propertyId: params.id,
      userId: user.id,
      access_mode: data.access_mode,
      // Boolean presence flags only — never the values.
      hasKeySafeCode: !!data.key_safe_code,
      hasAccessNotes: !!data.access_notes,
    });

    return NextResponse.json({ success: true, data });
  }
);
