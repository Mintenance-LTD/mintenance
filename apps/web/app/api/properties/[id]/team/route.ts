import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

// GET /api/properties/[id]/team
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { data: members, error } = await serverSupabase
      .from('property_team_members')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  },
);

// POST /api/properties/[id]/team — invite a team member
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'manager', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if already invited
    const { data: existing } = await serverSupabase
      .from('property_team_members')
      .select('id')
      .eq('property_id', propertyId)
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 });
    }

    // Enforce 10-member cap
    const { count: memberCount } = await serverSupabase
      .from('property_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    if ((memberCount ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'Team member limit reached (maximum 10 per property)' },
        { status: 422 },
      );
    }

    const { data: member, error } = await serverSupabase
      .from('property_team_members')
      .insert({
        property_id: propertyId,
        invited_by: user.id,
        email,
        role,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to invite team member' }, { status: 500 });
    }

    return NextResponse.json({ member }, { status: 201 });
  },
);

// DELETE /api/properties/[id]/team — remove a team member
export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .single();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('property_team_members')
      .delete()
      .eq('id', memberId)
      .eq('property_id', propertyId);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
);
