/**
 * Organization role-gating helpers — R6 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Used by contractor-company routes + landlord portfolio routes to gate
 * "admin" actions (invite / remove member / change role / approve work)
 * to the right seats. Shared with the existing portfolio flow.
 *
 * Role semantics:
 *   - owner                : full control, billing, can delete org
 *   - manager              : manage members + data, no billing / delete
 *   - maintenance_coordinator / dispatcher : assign jobs + triage
 *   - field                : contractor crew member; can act on assigned jobs
 *   - accountant           : read finance, pay invoices (portfolio / agency)
 *   - tenant               : tenant portal (landlord flows only)
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError } from '@/lib/errors/api-error';

export type OrgRole =
  | 'owner'
  | 'manager'
  | 'maintenance_coordinator'
  | 'dispatcher'
  | 'field'
  | 'accountant'
  | 'tenant';

export interface OrgMembership {
  id: string;
  org_id: string;
  user_id: string;
  org_role: OrgRole;
  status: string;
}

/**
 * Fetch the caller's active membership in `orgId`, or null if they are not
 * a member. Service-role client is used server-side so RLS never blocks
 * legitimate internal checks — the caller still has to supply their
 * authenticated user id from withApiHandler's context.
 */
export async function getOrgMembership(
  orgId: string,
  userId: string
): Promise<OrgMembership | null> {
  const { data, error } = await serverSupabase
    .from('organization_memberships')
    .select('id, org_id, user_id, org_role, status')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw error;
  }
  return (data as OrgMembership | null) ?? null;
}

/**
 * Assert the caller has one of `allowedRoles` in `orgId`.
 * Throws ForbiddenError if not a member or role mismatch.
 * Returns the resolved membership so callers can read org_role without
 * a second query.
 */
export async function requireOrgRole(
  orgId: string,
  userId: string,
  allowedRoles: OrgRole[]
): Promise<OrgMembership> {
  const membership = await getOrgMembership(orgId, userId);
  if (!membership) {
    throw new ForbiddenError(
      'You are not an active member of this organization'
    );
  }
  if (!allowedRoles.includes(membership.org_role)) {
    throw new ForbiddenError(
      `This action requires one of: ${allowedRoles.join(', ')}`
    );
  }
  return membership;
}

/**
 * Convenience: assert the caller belongs to `orgId` in *any* active role.
 */
export async function requireOrgMembership(
  orgId: string,
  userId: string
): Promise<OrgMembership> {
  const membership = await getOrgMembership(orgId, userId);
  if (!membership) {
    throw new ForbiddenError(
      'You are not an active member of this organization'
    );
  }
  return membership;
}
