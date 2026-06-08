/**
 * Organization members — R6 #18 of docs/RETENTION_ROADMAP_2026.md.
 *
 * GET    /api/organizations/:id/members
 *   Any active member can list their org's membership roster.
 *
 * DELETE /api/organizations/:id/members?userId=<uuid>
 *   Owners + managers can remove a member. You cannot remove yourself here
 *   (use the dedicated leave endpoint once it exists). You cannot remove
 *   the last owner.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  requireOrgMembership,
  requireOrgRole,
} from '@/lib/auth-manager/org-roles';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const deleteQuerySchema = z.object({
  userId: z.string().uuid(),
});

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      throw new BadRequestError('Invalid organization id');
    }
    const orgId = parsed.data.id;

    await requireOrgMembership(orgId, user.id);

    const { data: rawMembers, error } = await serverSupabase
      .from('organization_memberships')
      .select('id, user_id, org_role, status, created_at')
      .eq('org_id', orgId)
      // 2026-06-06 audit: without this filter, soft-removed members
      // (DELETE sets status='removed') and any non-active rows stayed in
      // the roster with their old role, and the header count over-reported.
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const userIds = (rawMembers || []).map((m) => m.user_id as string);
    let profilesById: Record<
      string,
      {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        company_name: string | null;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles, error: pErr } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, company_name')
        .in('id', userIds);
      if (pErr) {
        throw pErr;
      }
      profilesById = Object.fromEntries(
        (profiles || []).map((p) => [
          p.id as string,
          {
            id: p.id as string,
            first_name: (p.first_name as string | null) ?? null,
            last_name: (p.last_name as string | null) ?? null,
            email: (p.email as string | null) ?? null,
            company_name: (p.company_name as string | null) ?? null,
          },
        ])
      );
    }

    const members = (rawMembers || []).map((m) => ({
      ...m,
      profile: profilesById[m.user_id as string] || null,
    }));

    const { data: invitations, error: invErr } = await serverSupabase
      .from('organization_invitations')
      .select('id, invited_email, org_role, created_at, invited_by')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (invErr) {
      throw invErr;
    }

    return NextResponse.json({
      orgId,
      members: members || [],
      pendingInvitations: invitations || [],
    });
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      throw new BadRequestError('Invalid organization id');
    }
    const orgId = parsed.data.id;

    const targetParsed = deleteQuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId') || undefined,
    });
    if (!targetParsed.success) {
      throw new BadRequestError('userId is required');
    }
    const targetUserId = targetParsed.data.userId;

    if (targetUserId === user.id) {
      throw new BadRequestError(
        'Use the leave-organization flow to remove yourself'
      );
    }

    await requireOrgRole(orgId, user.id, ['owner', 'manager']);

    // Guard last-owner removal.
    const { data: target } = await serverSupabase
      .from('organization_memberships')
      .select('id, org_role')
      .eq('org_id', orgId)
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (!target) {
      throw new BadRequestError('Target user is not an active member');
    }

    if (target.org_role === 'owner') {
      const { count } = await serverSupabase
        .from('organization_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')
        .eq('org_role', 'owner');
      if ((count ?? 0) <= 1) {
        throw new ForbiddenError(
          'Cannot remove the last owner of an organization'
        );
      }
    }

    const { error: delErr } = await serverSupabase
      .from('organization_memberships')
      .update({ status: 'removed' })
      .eq('id', target.id);

    if (delErr) {
      throw delErr;
    }

    return NextResponse.json({ success: true });
  }
);
