import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
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

function teamWriteError(code?: string) {
  const [message, status] =
    code === '23505'
      ? ['This email has already been invited', 409]
      : code === '23514'
        ? ['Team member limit reached or invalid invitation', 422]
        : code === '42501'
          ? ['Team administration is not permitted', 403]
          : code === 'P0002'
            ? ['Property or team member not found', 404]
            : ['Team change could not be confirmed. Please retry.', 500];
  return NextResponse.json({ error: message }, { status: status as number });
}

export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (_req, { user, params }) => {
    await getPropertyForManagement(user, params.id, 'manage_team');
    const { data: members, error } = await serverSupabase
      .from('property_team_members')
      .select('id, email, role, status, created_at')
      .eq('property_id', params.id)
      .order('created_at', { ascending: false });
    if (error)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    return NextResponse.json({ members: members || [] });
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const parsed = await validateRequest(
      req,
      z.object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((value) => value.toLowerCase()),
        role: z.enum(['admin', 'manager', 'viewer']),
      })
    );
    if ('headers' in parsed) return parsed;
    const property = await getPropertyForManagement(
      user,
      params.id,
      'manage_team'
    );
    const tierBlock = await requireAgencyTier(property.owner_id, user.role);
    if (tierBlock) return tierBlock;
    const { data: member, error } = await serverSupabase.rpc(
      'manage_property_team',
      {
        p_property_id: params.id,
        p_actor_id: user.id,
        p_action: 'invite',
        p_email: parsed.data.email,
        p_role: parsed.data.role,
      }
    );
    if (error || !member?.id) return teamWriteError(error?.code);
    return NextResponse.json(
      {
        member,
        invitation: {
          status: 'recorded',
          activated: false,
          message:
            'Invitation saved. Ask the invitee to sign in with this email address and accept it from Properties. No email has been sent.',
        },
      },
      { status: 201 }
    );
  }
);

export const DELETE = withApiHandler(
  { roles: ['homeowner', 'admin'] },
  async (req, { user, params }) => {
    const parsed = z
      .string()
      .uuid()
      .safeParse(new URL(req.url).searchParams.get('memberId'));
    if (!parsed.success)
      return NextResponse.json(
        { error: 'A valid memberId is required' },
        { status: 400 }
      );
    await getPropertyForManagement(user, params.id, 'manage_team');
    const { data, error } = await serverSupabase.rpc('manage_property_team', {
      p_property_id: params.id,
      p_actor_id: user.id,
      p_action: 'remove',
      p_member_id: parsed.data,
    });
    if (error || data?.removed !== true || data?.id !== parsed.data)
      return teamWriteError(error?.code);
    return NextResponse.json({ success: true });
  }
);
