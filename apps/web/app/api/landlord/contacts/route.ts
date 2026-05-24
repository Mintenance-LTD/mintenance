import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// GET /api/landlord/contacts - List all contacts for the authenticated user.
// 2026-05-24 audit-30 P1: optional ?propertyId= scopes the result to a
// single property so the mobile property detail can hydrate just the
// contacts attached to that property (instead of fetching every contact
// the landlord owns and filtering client-side).
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    let query = serverSupabase
      .from('property_contacts')
      .select('*')
      .eq('owner_id', user.id)
      .order('name');

    if (propertyId) {
      query = query.eq('property_id', propertyId);
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

    const { data: contact, error } = await serverSupabase
      .from('property_contacts')
      .insert({
        property_id,
        owner_id: user.id,
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
