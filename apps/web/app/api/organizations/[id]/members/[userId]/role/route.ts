/**
 * PATCH /api/organizations/:id/members/:userId/role
 *
 * R6 #18 of docs/RETENTION_ROADMAP_2026.md — owner/manager can promote /
 * demote an active member. Owners only can create other owners or remove
 * the last owner's role. Matches the Supabase CHECK on org_role.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { requireOrgRole, type OrgRole } from '@/lib/auth-manager/org-roles';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const paramsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

const bodySchema = z.object({
  role: z.enum([
    'owner',
    'manager',
    'maintenance_coordinator',
    'dispatcher',
    'field',
    'accountant',
  ]),
});

export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new BadRequestError('Invalid ids');
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid role');
    }

    const { id: orgId, userId: targetUserId } = parsedParams.data;
    const newRole = parsed.data.role as OrgRole;

    // Any owner/manager can change roles, but only owners can mint owners.
    const actor = await requireOrgRole(orgId, user.id, ['owner', 'manager']);
    if (newRole === 'owner' && actor.org_role !== 'owner') {
      throw new ForbiddenError(
        'Only owners can promote another member to owner'
      );
    }

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

    // Prevent removing the last owner.
    if (target.org_role === 'owner' && newRole !== 'owner') {
      const { count } = await serverSupabase
        .from('organization_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')
        .eq('org_role', 'owner');
      if ((count ?? 0) <= 1) {
        throw new ForbiddenError(
          'Cannot demote the last owner of an organization'
        );
      }
    }

    const { error: updErr } = await serverSupabase
      .from('organization_memberships')
      .update({ org_role: newRole })
      .eq('id', target.id);
    if (updErr) {
      throw updErr;
    }

    return NextResponse.json({ success: true, role: newRole });
  }
);
