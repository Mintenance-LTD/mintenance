import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// GET /api/landlord/contacts - List all contacts for the authenticated user
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user }) => {
    const { data, error } = await serverSupabase
      .from('property_contacts')
      .select('*')
      .eq('owner_id', user.id)
      .order('name');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json({ contacts: data || [] });
  },
);

// POST /api/landlord/contacts - Create a new contact
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user }) => {
    const body = await req.json();
    const { property_id, name, email, phone, contact_role, unit_label, notes } = body;

    if (!property_id || !name?.trim()) {
      return NextResponse.json({ error: 'property_id and name are required' }, { status: 400 });
    }

    // Verify property ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', property_id)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found or forbidden' }, { status: 404 });
    }

    const validRoles = ['tenant', 'keyholder', 'emergency_contact', 'managing_agent'];
    const safeRole = validRoles.includes(contact_role) ? contact_role : 'tenant';

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
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }

    return NextResponse.json({ contact }, { status: 201 });
  },
);
