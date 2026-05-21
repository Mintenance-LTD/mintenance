import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { ForbiddenError } from '@/lib/errors/api-error';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
import { logger } from '@mintenance/shared';

/**
 * GET /api/properties/[id]/delete-preview
 *
 * Returns the records that will be **preserved** vs **cascade-deleted**
 * when this property is hard-deleted. Used by the homeowner-side
 * confirmation modal to show a "5 compliance certs will be retained
 * for legal retention" warning before the user commits.
 *
 * Live FK state (re-verified 2026-05-21 via pg_constraint):
 *
 *   ON DELETE SET NULL (preserved):
 *     - compliance_certificates  (gas safety ≥2yr, EICR ≥5yr)
 *     - property_tenants         (HMRC 6-year window)
 *     - property_contacts        (keyholder / agent history)
 *     - anonymous_reports        (dispute-resolution evidence)
 *     - recurring_schedules      (cycle definition preserved)
 *     - jobs                     (historical job records survive)
 *
 *   ON DELETE CASCADE (vanishes):
 *     - property_room_photos     (photo of a room on the property)
 *     - units, property_rooms, property_team_members, etc. (left
 *       implicit — preview surfaces the user-visible cases)
 *
 * Permission gate: same `PropertyTeamService.authorize('delete')` as
 * the DELETE route so the preview never leaks counts to a non-owner.
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'delete'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'Only the property owner can preview deletion of this property'
      );
    }

    // Run all seven counts in parallel — each is `count(*) HEAD only`
    // (rows: 0) so the round-trip is cheap.
    const [
      compliance,
      tenants,
      contacts,
      anonymous,
      schedules,
      jobs,
      roomPhotos,
    ] = await Promise.all([
      userDb
        .from('compliance_certificates')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id),
      // property_tenants is conditionally created — graceful fallback
      userDb
        .from('property_tenants')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id)
        .then(
          (r) => r,
          () => ({ count: 0 as number | null })
        ),
      userDb
        .from('property_contacts')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id),
      userDb
        .from('anonymous_reports')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id),
      userDb
        .from('recurring_schedules')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id),
      userDb
        .from('jobs')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id),
      // 2026-05-21 audit fix: previously this counted `property_photos`
      // (a non-existent table) and silently fell back to 0. The real
      // cascading photo table is `property_room_photos`, which is what
      // a property delete actually wipes.
      userDb
        .from('property_room_photos')
        .select('*', { head: true, count: 'exact' })
        .eq('property_id', params.id)
        .then(
          (r) => r,
          () => ({ count: 0 as number | null })
        ),
    ]);

    // 2026-05-21 audit fix: `jobs` moved from `cascaded` → `preserved`.
    // jobs.property_id is `ON DELETE SET NULL` live (verified via
    // pg_constraint), so historical jobs survive a property delete —
    // homeowners and contractors can still see the audit trail. The
    // previous shape mis-promised the user they'd vanish.
    const preserved = {
      compliance_certificates: compliance.count ?? 0,
      property_tenants: tenants.count ?? 0,
      property_contacts: contacts.count ?? 0,
      anonymous_reports: anonymous.count ?? 0,
      recurring_schedules: schedules.count ?? 0,
      jobs: jobs.count ?? 0,
    };

    const cascaded = {
      property_room_photos: roomPhotos.count ?? 0,
    };

    const preservedTotal = Object.values(preserved).reduce((s, n) => s + n, 0);
    const cascadedTotal = Object.values(cascaded).reduce((s, n) => s + n, 0);

    logger.info('Property delete preview generated', {
      service: 'properties',
      propertyId: params.id,
      ownerId: user.id,
      preservedTotal,
      cascadedTotal,
    });

    return NextResponse.json({
      preserved,
      cascaded,
      preservedTotal,
      cascadedTotal,
      // Surface the legal retention windows for the UI label
      retentionNotes: {
        gas_safety_certificate_years: 2,
        eicr_years: 5,
        tenancy_records_years: 6,
      },
    });
  }
);
