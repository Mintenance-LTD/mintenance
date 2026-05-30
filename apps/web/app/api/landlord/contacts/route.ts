import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';

// GET /api/landlord/contacts - List all contacts for the authenticated user.
// 2026-05-24 audit-30 P1: optional ?propertyId= scopes the result to a
// single property so the mobile property detail can hydrate just the
// contacts attached to that property (instead of fetching every contact
// the landlord owns and filtering client-side).
// 2026-05-24 audit-37 P1: previously always filtered `owner_id = user.id`
// even for admins. Admin support staff (and the live RLS policy
// property_contacts_owner_all) were intended to read across owners,
// but the route forced them to query only contacts THEY had created.
// When admin scopes via ?propertyId=, drop the owner filter so the
// admin can see whatever contacts the property actually has. When
// admin queries without propertyId, keep filtering by owner_id to
// avoid accidentally dumping every contact platform-wide.
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    let query = serverSupabase
      .from('property_contacts')
      .select('*')
      .order('name');

    if (propertyId) {
      // 2026-05-26 audit-61 P1: when scoped to a property, honour
      // PropertyTeamService so managers/admins on the property team
      // get the full per-property contact list — previously the
      // owner_id filter returned [] for them, which the mobile UI
      // surfaced as "no contacts" while the underlying rows existed.
      // The team gate is the security boundary here; service-role
      // is fine because we've verified the caller's relationship.
      const { authorized } = await PropertyTeamService.authorize(
        user.id,
        propertyId,
        'manage_contacts'
      );
      if (!authorized && user.role !== 'admin') {
        return NextResponse.json({ contacts: [] });
      }
      query = query.eq('property_id', propertyId);
    } else {
      // No propertyId — bound by owner_id regardless of role so the
      // route never returns the global contacts table to anyone.
      // Platform-admin without a propertyId still scopes to their
      // own contacts; they can pass propertyId to see another
      // homeowner's list when doing support work.
      query = query.eq('owner_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch contacts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contacts: data || [] });
  }
);

// POST /api/landlord/contacts - Create a new contact
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user }) => {
    const body = await req.json();
    const {
      property_id,
      name,
      email,
      phone,
      contact_role,
      unit_label,
      notes,
      move_in_date,
      lease_end_date,
    } = body;

    if (!property_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'property_id and name are required' },
        { status: 400 }
      );
    }

    // 2026-05-26 audit-61 P1: replace the owner_id-only gate with
    // PropertyTeamService.authorize('manage_contacts'). Owners and
    // platform admins still pass; property-team managers (and team
    // admins) can now create contacts on properties they've been
    // invited to manage. Viewers still get refused. The route
    // continues to return 404 for non-existent properties to avoid
    // leaking which property ids exist.
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', property_id)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { authorized } = await PropertyTeamService.authorize(
      user.id,
      property_id,
      'manage_contacts'
    );
    if (!authorized && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Property not found or forbidden' },
        { status: 404 }
      );
    }

    // 2026-05-26 audit-61 P2: previously coerced invalid contact_role
    // → 'tenant' silently. A client typo like 'emergency' (vs
    // 'emergency_contact') landed in the DB as 'tenant' — the
    // contractor's on-site Access & Contacts card then labelled an
    // emergency number as a tenant. Reject the payload instead so
    // the caller can fix the input.
    const validRoles = [
      'tenant',
      'keyholder',
      'emergency_contact',
      'managing_agent',
    ] as const;
    if (contact_role !== undefined && !validRoles.includes(contact_role)) {
      return NextResponse.json(
        { error: `contact_role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }
    const safeRole = contact_role ?? 'tenant';

    // 2026-05-12: also persist move_in_date + lease_end_date when set.
    // The DB columns exist (migration 20260214200000) but the form
    // previously dropped them, so every contact landed with both
    // fields NULL. Strings of the form YYYY-MM-DD round-trip through
    // PostgREST as `date` values.
    const isoDate = (v: unknown): string | null => {
      if (typeof v !== 'string') return null;
      const trimmed = v.trim();
      // Light validation — postgres will reject a malformed date too
      // but a clean 400 here gives the homeowner a better message.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
      return trimmed;
    };

    // 2026-05-24 audit-37 P1 / 2026-05-26 audit-61 P1: anchor
    // owner_id to the property's owner whenever the caller isn't the
    // property owner. Originally this only handled the platform-admin
    // support flow; with audit-61 adding manager + team-admin write
    // access via PropertyTeamService.authorize('manage_contacts'),
    // ALL non-owner callers (manager, team admin, platform admin)
    // need their contacts to land under the property owner so the
    // owner's contact list + the contractor-facing /api/jobs/[id]
    // contact embed surface them under a single, stable owner_id.
    const safeOwnerId =
      property.owner_id !== user.id ? property.owner_id : user.id;

    const { data: contact, error } = await serverSupabase
      .from('property_contacts')
      .insert({
        property_id,
        owner_id: safeOwnerId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        contact_role: safeRole,
        unit_label: unit_label?.trim() || null,
        notes: notes?.trim() || null,
        move_in_date: isoDate(move_in_date),
        lease_end_date: isoDate(lease_end_date),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ contact }, { status: 201 });
  }
);
