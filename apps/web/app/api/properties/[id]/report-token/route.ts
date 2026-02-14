import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// GET /api/properties/[id]/report-token - Get or list report tokens for a property
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found or forbidden' }, { status: 404 });
    }

    const { data: tokens, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    return NextResponse.json({ tokens: tokens || [] });
  },
);

// POST /api/properties/[id]/report-token - Create a new report token
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found or forbidden' }, { status: 404 });
    }

    const { data: token, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .insert({
        property_id: propertyId,
        owner_id: user.id,
        label: body.label || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    return NextResponse.json({ token }, { status: 201 });
  },
);

// PATCH /api/properties/[id]/report-token - Toggle token active/inactive
export const PATCH = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();
    const { token_id, is_active } = body;

    if (!token_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'token_id and is_active are required' }, { status: 400 });
    }

    // Verify ownership
    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: token, error } = await serverSupabase
      .from('anonymous_report_tokens')
      .update({ is_active })
      .eq('id', token_id)
      .eq('property_id', propertyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }

    return NextResponse.json({ token });
  },
);
