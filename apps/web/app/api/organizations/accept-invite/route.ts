/**
 * POST /api/organizations/accept-invite
 *
 * R6 #18 of docs/RETENTION_ROADMAP_2026.md. Authenticated user posts the
 * invitation_token they received by email. We verify the invite row is
 * still pending + the caller's email matches, then insert the active
 * membership and mark the invite accepted.
 *
 * GET /api/organizations/accept-invite?token=<uuid>
 *   Render-time lookup so the accept page can show "You've been invited to
 *   ORG X as Y" without yet committing.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const postSchema = z.object({
  token: z.string().uuid(),
});

async function loadInvitation(token: string) {
  const { data, error } = await serverSupabase
    .from('organization_invitations')
    .select(
      'id, org_id, invited_email, org_role, accepted_at, revoked_at, invited_by'
    )
    .eq('invitation_token', token)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new BadRequestError('Invitation not found');
  }
  if (data.accepted_at) {
    throw new BadRequestError('Invitation already accepted');
  }
  if (data.revoked_at) {
    throw new BadRequestError('Invitation was revoked');
  }
  return data;
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const token = request.nextUrl.searchParams.get('token') || '';
    const parsed = postSchema.safeParse({ token });
    if (!parsed.success) {
      throw new BadRequestError('Invalid token');
    }
    const inv = await loadInvitation(parsed.data.token);

    const { data: org } = await serverSupabase
      .from('organizations')
      .select('id, name, organization_type')
      .eq('id', inv.org_id as string)
      .maybeSingle();

    return NextResponse.json({
      orgId: inv.org_id,
      orgName: org?.name ?? 'Mintenance organization',
      orgType: org?.organization_type ?? null,
      role: inv.org_role,
      invitedEmail: inv.invited_email,
      matchesYou:
        (user.email || '').toLowerCase() ===
        (inv.invited_email as string).toLowerCase(),
    });
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('token is required');
    }
    const inv = await loadInvitation(parsed.data.token);

    // The invited email must match the authenticated user's email. We
    // compare the profile row (ground truth) rather than the JWT claim.
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    const profileEmail = (profile?.email as string | null) || user.email || '';
    if (
      profileEmail.toLowerCase() !== (inv.invited_email as string).toLowerCase()
    ) {
      throw new ForbiddenError(
        'This invitation was sent to a different email address'
      );
    }

    // Insert / reactivate the membership.
    const { data: existing } = await serverSupabase
      .from('organization_memberships')
      .select('id, status')
      .eq('org_id', inv.org_id as string)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.id) {
      if (existing.status !== 'active') {
        const { error: upErr } = await serverSupabase
          .from('organization_memberships')
          .update({ status: 'active', org_role: inv.org_role })
          .eq('id', existing.id);
        if (upErr) {
          throw upErr;
        }
      }
    } else {
      const { error: insErr } = await serverSupabase
        .from('organization_memberships')
        .insert({
          org_id: inv.org_id,
          user_id: user.id,
          org_role: inv.org_role,
          status: 'active',
        });
      if (insErr) {
        throw insErr;
      }
    }

    const { error: markErr } = await serverSupabase
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', inv.id as string);
    if (markErr) {
      throw markErr;
    }

    return NextResponse.json({
      success: true,
      orgId: inv.org_id,
      role: inv.org_role,
    });
  }
);
