import { NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { updatePropertySchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // 2026-05-23 audit-15 P1: previously this route ran the
    // PropertyTeamService.authorize() gate and THEN read through
    // `createRequestScopedClient` (RLS-bound to the caller). Live
    // properties RLS only grants SELECT to owner / admin / org_member —
    // property_team_members are not on the policy. Accepted team
    // members would pass the in-code authorize() check then get
    // `data: null` from the RLS read and see a confusing 404. The
    // authorize() call IS the security boundary here (the same
    // pattern audit-12 #62 adopted for the access PATCH and audit-14
    // #78 adopted for the contractor property-access read), so using
    // serverSupabase after a verified authorize() is consistent.

    // Allow property owner OR team members with any role to view
    const { authorized, role: propertyRole } =
      await PropertyTeamService.authorize(user.id, params.id, 'view');

    if (!authorized && user.role !== 'admin') {
      throw new NotFoundError('Property not found');
    }

    const { data, error } = await serverSupabase
      .from('properties')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundError('Property not found');
    }

    // 2026-05-24 audit-37 P0: previously returned select('*') to any
    // role that satisfied 'view' — including the viewer team role.
    // That meant a viewer-role teammate could read key_safe_code
    // immediately from this surface, bypassing the careful
    // contractor-side 1-hour reveal window in
    // lib/services/jobs/key-safe-reveal.ts and any future
    // homeowner-defined ACL. Now: only the property owner and the
    // platform admin get the code through this surface. Managers
    // (who can edit the property + compliance) get the rest of the
    // access fields but not the code itself; contractors with an
    // assigned job continue to use the gated /api/jobs/[id] path
    // which applies the 1h reveal rule. Viewer gets nothing extra
    // either — they were the most acute case named by the audit.
    const isOwnerOrPlatformAdmin =
      propertyRole === 'owner' || user.role === 'admin';
    if (!isOwnerOrPlatformAdmin) {
      const redacted = data as Record<string, unknown>;
      // Always strip the code for non-owner/non-platform-admin
      // callers. Other access fields (access_mode, access_notes,
      // stopcock_location, etc.) are kept because managers need them
      // to plan visits — only the unlock code itself is the
      // physical-entry secret.
      redacted.key_safe_code = null;
    }

    // 2026-05-26 audit-57 P2: surface the caller's role on the
    // payload so mobile/web can hide owner-only / admin-only actions
    // (Delete, Manage Team, etc.) from viewer/manager team members.
    // The server still enforces every gate independently — this is a
    // UX hint, not the security boundary.
    const propertyWithRole = {
      ...(data as Record<string, unknown>),
      _role: user.role === 'admin' ? 'platform_admin' : propertyRole,
    };

    return NextResponse.json(propertyWithRole);
  }
);

export const PUT = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // 2026-05-23 audit-15 P1: same fix as GET above — managers (a
    // property_team_members role) pass the in-code edit() gate but
    // RLS UPDATE on properties only grants owner. The userDb update
    // returned `data: null` for every manager edit and the route 404'd
    // even though the authorize check succeeded. Service-role write
    // after a verified authorize() restores parity between the security
    // check and the storage layer.

    // Require manager+ role for edits
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'edit'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'You do not have permission to edit this property'
      );
    }

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(request, updatePropertySchema);
    if ('headers' in validation) {
      return validation;
    }

    const {
      name,
      address,
      city,
      postcode,
      country,
      type,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      photos,
      latitude,
      longitude,
    } = validation.data;

    // Build the update payload conditionally so we don't overwrite
    // existing values with `undefined` when the client only sends a
    // subset. Previously every field was unconditionally set, which
    // also meant lat/long were never persisted on edit because
    // `undefined` shadowed any prior value (and the schema didn't
    // accept them anyway — fixed in step 13).
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.property_name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (postcode !== undefined) updateData.postcode = postcode;
    if (country !== undefined) updateData.country = country;
    if (type !== undefined) updateData.property_type = type;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms ?? null;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms ?? null;
    // 2026-05-21 bug fix: the DB CHECK constraint
    // `properties_square_footage_check` rejects `square_footage = 0`
    // (must be > 0 OR null), and `properties_year_built_check`
    // requires year >= 1800. The form initialises both fields with
    // `parseInt(value) || 0`, so a user who clears the input sends
    // `0` → DB returns 23514 → "Database operation failed" 500.
    // Coerce 0 → null here so the value parks as "unknown" instead.
    if (squareFeet !== undefined) {
      updateData.square_footage =
        squareFeet === null || squareFeet === 0 ? null : squareFeet;
    }
    if (yearBuilt !== undefined) {
      updateData.year_built =
        yearBuilt === null || yearBuilt === 0 ? null : yearBuilt;
    }
    if (photos !== undefined) updateData.photos = photos || [];
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    const { data, error } = await serverSupabase
      .from('properties')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating property', error, {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
      });
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Property not found or not authorized');
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    // Only property owner can delete
    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      params.id,
      'delete'
    );
    if (!authorized && user.role !== 'admin') {
      throw new ForbiddenError(
        'Only the property owner can delete this property'
      );
    }

    // 2026-05-24 audit-34 P1: refuse to delete a property that's
    // attached to an assigned or in-progress job. jobs.property_id is
    // ON DELETE SET NULL live (verified via pg_constraint), so a
    // delete here silently severs the link mid-job — the contractor
    // loses access instructions, the homeowner loses room scope, and
    // any /api/jobs/[id] enrichment that joins on property_id starts
    // returning null. Block on the same set of in-flight job states
    // the account-delete route blocks on.
    const { count: activeJobCount, error: activeJobErr } = await serverSupabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', params.id)
      .in('status', ['assigned', 'in_progress']);

    if (activeJobErr) {
      logger.error('Failed to check active jobs before property delete', {
        service: 'properties',
        propertyId: params.id,
        error: activeJobErr.message,
      });
      throw activeJobErr;
    }

    // 2026-05-26 audit-65 P1: also check for cross-flow blockers
    // that the deletion would silently break / orphan:
    //   - anonymous_reports.property_id is SET NULL, BUT
    //     anonymous_report_tokens.property_id is CASCADE — so
    //     deleting the property keeps the report row in the DB but
    //     wipes the token, and the landlord reports list/detail
    //     both require `anonymous_report_tokens!inner`, leaving
    //     reports orphaned-but-unreachable. Block deletion until
    //     the reports are resolved or detached.
    //   - maintenance_tickets.property_id is CASCADE — portfolio
    //     users would silently lose ticket history. Block on
    //     non-terminal tickets (anything not closed/resolved).
    const [anonReportsRes, maintenanceTicketsRes] = await Promise.all([
      serverSupabase
        .from('anonymous_reports')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', params.id),
      // Use service-role: maintenance_tickets RLS is org-scoped and
      // a homeowner deleting their property may not be on the org
      // (e.g. portfolio user with multiple orgs). The blocker check
      // is the security boundary here, not the read.
      serverSupabase
        .from('maintenance_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', params.id)
        .not('status', 'in', '("closed","resolved","cancelled")'),
    ]);

    const blockers: Array<{ code: string; count: number; message: string }> =
      [];
    if ((activeJobCount ?? 0) > 0) {
      blockers.push({
        code: 'ACTIVE_JOBS_ON_PROPERTY',
        count: activeJobCount ?? 0,
        message: `${activeJobCount} job(s) attached to this property are still assigned or in progress. Complete, cancel, or detach them before deleting the property.`,
      });
    }
    if (!anonReportsRes.error && (anonReportsRes.count ?? 0) > 0) {
      blockers.push({
        code: 'ANONYMOUS_REPORTS_ON_PROPERTY',
        count: anonReportsRes.count ?? 0,
        message: `${anonReportsRes.count} anonymous report(s) reference this property. Deleting the property would orphan them (the report rows survive but the token link cascades). Archive or resolve the reports first, or contact support to migrate them.`,
      });
    }
    if (
      !maintenanceTicketsRes.error &&
      (maintenanceTicketsRes.count ?? 0) > 0
    ) {
      blockers.push({
        code: 'OPEN_MAINTENANCE_TICKETS_ON_PROPERTY',
        count: maintenanceTicketsRes.count ?? 0,
        message: `${maintenanceTicketsRes.count} open maintenance ticket(s) are attached to this property. Resolve or close them before deleting (closed tickets cascade with the property by design).`,
      });
    }

    if (blockers.length > 0) {
      logger.warn('Property delete blocked', {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
        blockerCodes: blockers.map((b) => b.code),
      });
      return NextResponse.json(
        {
          error: 'Property delete blocked by active marketplace state.',
          blockers,
        },
        { status: 409 }
      );
    }

    // 2026-05-24 audit-34 P2: admin previously bypassed the authorize
    // gate but the DELETE ran through a request-scoped client (RLS-
    // bound). Live properties RLS only grants DELETE where
    // auth.uid() = owner_id — admin has SELECT only — so an admin
    // delete returned success:true while the row survived. Use the
    // service-role client when the caller is admin, and the RLS
    // client when the caller is the owner. Either path verifies the
    // affected row count to catch the silent-no-op case.
    const dbClient =
      user.role === 'admin'
        ? serverSupabase
        : (createRequestScopedClient(_request) ?? serverSupabase);

    const { data: deleted, error } = await dbClient
      .from('properties')
      .delete()
      .eq('id', params.id)
      .select('id');

    if (error) {
      logger.error('Error deleting property', error, {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
      });
      throw error;
    }

    if (!deleted || deleted.length === 0) {
      // RLS swallowed the delete (or the row was already gone). Fail
      // loud rather than report success.
      logger.warn('Property delete returned no rows', {
        service: 'properties',
        propertyId: params.id,
        userId: user.id,
        role: user.role,
      });
      throw new BadRequestError(
        'Property could not be deleted — it may already be gone or you may ' +
          'not have permission. Contact support if this persists.'
      );
    }

    return NextResponse.json({ success: true });
  }
);
