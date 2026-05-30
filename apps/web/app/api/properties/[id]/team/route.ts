import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

/**
 * 2026-05-22 Sprint 4: tier gate. Team access (invites + role-based) is
 * Agency-only on the new pricing model. Landlord tier does not include it.
 * Admins bypass. Early-access (-> agency) automatically unlocks.
 * Returns 402 with feature flag so clients can render the upgrade CTA.
 */
async function requireAgencyTier(userId: string, role: string) {
  if (role === 'admin') return null;
  const tier = await getEffectiveHomeownerTier(userId);
  if (!hasFeatureAccess('HOMEOWNER_TEAM_ACCESS', 'homeowner', tier)) {
    return NextResponse.json(
      {
        error: 'Subscription required',
        message:
          'Team member invites require an Agency subscription. The Landlord plan does not include team access.',
        requiresSubscription: true,
        feature: 'HOMEOWNER_TEAM_ACCESS',
      },
      { status: 402 }
    );
  }
  return null;
}

// GET /api/properties/[id]/team
// csrf:false — this is an idempotent read. withApiHandler's default enables
// CSRF only for mutating methods, but we set it explicitly so the intent is
// obvious and stays aligned with sibling GET handlers.
export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    const propertyId = params.id;

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { data: members, error } = await serverSupabase
      .from('property_team_members')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    return NextResponse.json({ members: members || [] });
  }
);

// POST /api/properties/[id]/team — invite a team member
export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const body = await req.json();

    const tierBlock = await requireAgencyTier(user.id, user.role);
    if (tierBlock) return tierBlock;

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'email and role are required' },
        { status: 400 }
      );
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
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This email has already been invited' },
        { status: 409 }
      );
    }

    // Enforce 10-member cap
    const { count: memberCount } = await serverSupabase
      .from('property_team_members')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    if ((memberCount ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'Team member limit reached (maximum 10 per property)' },
        { status: 422 }
      );
    }

    // 2026-05-23 audit: full team-invite activation flow isn't built
    // yet — there's no email send, no acceptance token, no accept
    // page, and PropertyTeamService.getRole only matches members
    // with status='accepted' AND user_id set. We still record the
    // invite intent here (capturing email + role for the owner's
    // dashboard + the future activation flow), but the API response
    // now tells the truth so the UI can show "pending activation"
    // instead of a misleading "Invitation sent". status set
    // explicitly to 'pending' rather than relying on the DB default
    // so the value is unambiguous in the row.
    const { data: member, error } = await serverSupabase
      .from('property_team_members')
      .insert({
        property_id: propertyId,
        invited_by: user.id,
        email,
        role,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to invite team member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        member,
        invitation: {
          status: 'recorded',
          activated: false,
          message:
            'Invitation recorded. Activation flow (email + accept page) is not yet built — the invitee cannot access this property until it ships. Tracked as a follow-up.',
        },
      },
      { status: 201 }
    );
  }
);

// DELETE /api/properties/[id]/team — remove a team member
export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const propertyId = params.id;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const { data: property } = await serverSupabase
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (!property || (property.owner_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const { error } = await serverSupabase
      .from('property_team_members')
      .delete()
      .eq('id', memberId)
      .eq('property_id', propertyId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  }
);
