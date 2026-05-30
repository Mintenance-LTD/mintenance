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
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';

/**
 * 2026-05-22 Sprint 5.1: contractor-org seat gate.
 *
 * The landing page promises Business-tier contractors "Team member
 * accounts (up to 10)". This gate enforces both halves of that promise:
 *
 * 1. The org's creator (effectively the org owner — set on insert in
 *    the org-create flow) must be on the enterprise tier OR have an
 *    early-access founding-member grant. Free/Basic/Pro contractors get
 *    a 402 with the upgrade payload.
 * 2. Even on Business, the total active memberships + non-revoked
 *    pending invitations must be < 10.
 *
 * No-op for non-contractor orgs (landlord/agency homeowner orgs use a
 * separate /api/properties/[id]/team flow with its own gate).
 */
const CONTRACTOR_TEAM_SEAT_CAP = 10;

async function checkContractorTeamGate(
  orgId: string,
  orgCreatedBy: string | null
): Promise<NextResponse | null> {
  if (!orgCreatedBy) return null;

  const { data: ownerProfile } = await serverSupabase
    .from('profiles')
    .select('role')
    .eq('id', orgCreatedBy)
    .maybeSingle();

  if (ownerProfile?.role !== 'contractor') return null;

  const tier = await FeeCalculationService.resolveContractorTier(orgCreatedBy);
  if (tier !== 'enterprise') {
    return NextResponse.json(
      {
        error: 'Subscription required',
        message:
          'Team member accounts require a Business subscription. Upgrade to add up to 10 team seats.',
        requiresSubscription: true,
        feature: 'CONTRACTOR_TEAM_SEATS',
      },
      { status: 402 }
    );
  }

  // Total seat usage = active members + non-revoked pending invitations.
  // Both queries scoped to org_id so the cap is per-organization.
  const [membershipsRes, invitesRes] = await Promise.all([
    serverSupabase
      .from('organization_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active'),
    serverSupabase
      .from('organization_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .is('revoked_at', null)
      .is('accepted_at', null),
  ]);

  const totalSeats = (membershipsRes.count ?? 0) + (invitesRes.count ?? 0);

  if (totalSeats >= CONTRACTOR_TEAM_SEAT_CAP) {
    return NextResponse.json(
      {
        error: 'Seat limit reached',
        message: `Your Business plan includes ${CONTRACTOR_TEAM_SEAT_CAP} team seats. Remove an existing member or revoke a pending invite to free up a seat.`,
        requiresUpgrade: false,
        feature: 'CONTRACTOR_TEAM_SEATS',
      },
      { status: 422 }
    );
  }

  return null;
}

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
      .select('id, name, organization_type, created_by')
      .eq('id', orgId)
      .maybeSingle();
    if (!org) {
      throw new BadRequestError('Organization not found');
    }

    // Tier + seat-cap gate for contractor orgs. Returns 402/422 if blocked.
    const gateResponse = await checkContractorTeamGate(
      orgId,
      (org.created_by as string | null) ?? null
    );
    if (gateResponse) return gateResponse;

    // Fast path: email already maps to a profile → add directly.
    // Audit P2 (2026-04-23): switched from `.ilike()` to `.eq()` —
    // an org-admin could otherwise pass `normalizedEmail = '%@%.com'`
    // (after slipping past the schema's email regex via crafted
    // input) and find the highest-id user matching that pattern.
    // `.eq()` removes the LIKE-wildcard interpretation. See live DB
    // case-normalization scan in the matching job-creation-service
    // commit. Profile inserts elsewhere normalize email at write,
    // so the case-sensitivity loss is intentional.
    const { data: existingProfile } = await serverSupabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('email', normalizedEmail)
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
