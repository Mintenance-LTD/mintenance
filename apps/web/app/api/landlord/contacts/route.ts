import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
      query = query.eq('property_id', propertyId);
      // Non-admins are still restricted to their own contacts even
      // when scoping by propertyId. Admins get the full per-property
      // list for support / moderation work.
      if (user.role !== 'admin') {
        query = query.eq('owner_id', user.id);
      }
    } else {
      // No propertyId — bound by owner_id regardless of role so the
      // route never returns the global contacts table to anyone.
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

    // Verify property ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', property_id)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found or forbidden' },
        { status: 404 }
      );
    }

    const validRoles = [
      'tenant',
      'keyholder',
      'emergency_contact',
      'managing_agent',
    ];
    const safeRole = validRoles.includes(contact_role)
      ? contact_role
      : 'tenant';

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

    // 2026-05-24 audit-37 P1: previously inserted owner_id: user.id
    // unconditionally. When platform admin acted on a homeowner's
    // behalf (support flow), the contact landed with owner_id = admin's
    // profile id — the homeowner's own contacts list (which filters
    // by owner_id) never saw it, and a future audit-30 PATCH/DELETE
    // would mismatch on ownership. Anchor owner_id to the property's
    // owner so admin-created contacts attach to the right person;
    // non-admin callers continue to land their own id (which by the
    // ownership check above already equals property.owner_id).
    const safeOwnerId =
      user.role === 'admin' && property.owner_id !== user.id
        ? property.owner_id
        : user.id;

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
