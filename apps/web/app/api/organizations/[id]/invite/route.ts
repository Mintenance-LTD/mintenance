/**
 * POST /api/organizations/:id/invite
 *
 * R6 #18 of docs/RETENTION_ROADMAP_2026.md. Owner/manager invites a
 * teammate by email. If the email already maps to a profile, they're
 * added directly as an active member (no email round-trip). Otherwise
 * we insert a row in organization_invitations and email a signup link
 * with the invitation_token.
 *
 * DELETE /api/organizations/:id/invite?invitationId=<uuid>
 *   Revoke a still-pending invite (sets revoked_at).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { requireOrgRole } from '@/lib/auth-manager/org-roles';
import { BadRequestError } from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';
import { env } from '@/lib/env';
import { logger } from '@mintenance/shared';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'owner',
    'manager',
    'maintenance_coordinator',
    'dispatcher',
    'field',
    'accountant',
  ]),
});

const deleteSchema = z.object({
  invitationId: z.string().uuid(),
});

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new BadRequestError('Invalid organization id');
    }
    const orgId = parsedParams.data.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('Invalid invite payload');
    }
    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const role = parsed.data.role;

    const actor = await requireOrgRole(orgId, user.id, ['owner', 'manager']);
    if (role === 'owner' && actor.org_role !== 'owner') {
      throw new BadRequestError(
        'Only owners can invite another member as owner'
      );
    }

    const { data: org } = await serverSupabase
      .from('organizations')
      .select('id, name, organization_type')
      .eq('id', orgId)
      .maybeSingle();
    if (!org) {
      throw new BadRequestError('Organization not found');
    }

    // Fast path: email already maps to a profile → add directly.
    const { data: existingProfile } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      // Already a member? Flip to active if previously removed.
      const { data: priorMembership } = await serverSupabase
        .from('organization_memberships')
        .select('id, status, org_role')
        .eq('org_id', orgId)
        .eq('user_id', existingProfile.id as string)
        .maybeSingle();

      if (priorMembership?.id) {
        if (priorMembership.status === 'active') {
          return NextResponse.json({
            added: false,
            message: 'User is already an active member',
          });
        }
        const { error: reActivateErr } = await serverSupabase
          .from('organization_memberships')
          .update({ status: 'active', org_role: role })
          .eq('id', priorMembership.id);
        if (reActivateErr) {
          throw reActivateErr;
        }
      } else {
        const { error: insErr } = await serverSupabase
          .from('organization_memberships')
          .insert({
            org_id: orgId,
            user_id: existingProfile.id as string,
            org_role: role,
            status: 'active',
          });
        if (insErr) {
          throw insErr;
        }
      }

      return NextResponse.json({ added: true, direct: true });
    }

    // Slow path: send an email invite with signed token.
    const { data: inv, error: invErr } = await serverSupabase
      .from('organization_invitations')
      .insert({
        org_id: orgId,
        invited_email: normalizedEmail,
        org_role: role,
        invited_by: user.id,
      })
      .select('id, invitation_token')
      .single();

    if (invErr || !inv) {
      throw invErr ?? new Error('Invitation failed');
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';
    const inviteUrl = `${baseUrl}/accept-invite?token=${inv.invitation_token}`;

    try {
      await EmailService.sendTenantInviteEmail(normalizedEmail, {
        tenantName: normalizedEmail,
        landlordName:
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          (org.name as string) ||
          'Mintenance',
        propertyAddress: `${org.name as string} — ${role.replace('_', ' ')}`,
        inviteUrl,
      });
    } catch (err) {
      logger.warn('Failed to deliver org invite email', {
        orgId,
        normalizedEmail,
        err: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      { added: false, invitationId: inv.id },
      { status: 201 }
    );
  }
);

export const DELETE = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new BadRequestError('Invalid organization id');
    }
    const orgId = parsedParams.data.id;

    const parsed = deleteSchema.safeParse({
      invitationId:
        request.nextUrl.searchParams.get('invitationId') || undefined,
    });
    if (!parsed.success) {
      throw new BadRequestError('invitationId is required');
    }

    await requireOrgRole(orgId, user.id, ['owner', 'manager']);

    const { error } = await serverSupabase
      .from('organization_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', parsed.data.invitationId)
      .eq('org_id', orgId);
    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  }
);
