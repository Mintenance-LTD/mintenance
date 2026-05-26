import { cache } from 'react';
import { serverSupabase } from '@/lib/api/supabaseServer';

type PropertyRole = 'owner' | 'admin' | 'manager' | 'viewer';

type Action =
  | 'view' // GET property details
  | 'edit' // PUT property details
  | 'delete' // DELETE property
  | 'manage_team' // Invite/remove team members
  | 'manage_compliance' // Upload/edit compliance certs
  | 'manage_maintenance' // Create/edit recurring maintenance
  | 'manage_contacts' // CRUD on property_contacts + tenants (audit-61 P1)
  | 'create_job'; // Post a job for this property

// 2026-05-26 audit-61 P1: `manage_contacts` introduced because the
// mobile audit-57 capability flag canManageContacts let managers see
// the PropertyContacts + TenantContacts UI, but the contacts API
// routes still gated on owner_id == user.id — managers got an empty
// list + 404/403 on create/delete. Adding the action here so the
// API layer can ask the same question the UI asks, and so a future
// "agency PA managing a portfolio" feature has a real permission to
// grant. Managers and admins get it; viewers don't.
const PERMISSION_MATRIX: Record<PropertyRole, Set<Action>> = {
  owner: new Set([
    'view',
    'edit',
    'delete',
    'manage_team',
    'manage_compliance',
    'manage_maintenance',
    'manage_contacts',
    'create_job',
  ]),
  admin: new Set([
    'view',
    'edit',
    'manage_team',
    'manage_compliance',
    'manage_maintenance',
    'manage_contacts',
    'create_job',
  ]),
  manager: new Set([
    'view',
    'edit',
    'manage_compliance',
    'manage_maintenance',
    'manage_contacts',
    'create_job',
  ]),
  viewer: new Set(['view']),
};

// audit-76 follow-up Suggestion #6: React `cache()` wraps `getRole` so
// repeat calls with the same (userId, propertyId) within ONE request
// reuse the same Promise. Covers the composite-view case the sub-agent
// flagged — same route checking authorize twice (gate + capability
// hint), or future composed handlers calling multiple PropertyTeam
// helpers in one request. Owner-only callers still short-circuit on
// the first query (the 2nd is skipped); the cache just dedupes if the
// same role is asked for again.
const getRoleCached = cache(
  async (userId: string, propertyId: string): Promise<PropertyRole | null> => {
    // Check ownership first — short-circuits the 95% owner case.
    const { data: property } = await serverSupabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single();

    if (!property) return null;
    if (property.owner_id === userId) return 'owner';

    // Check team membership
    const { data: member } = await serverSupabase
      .from('property_team_members')
      .select('role')
      .eq('property_id', propertyId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!member) return null;
    return member.role as PropertyRole;
  }
);

export class PropertyTeamService {
  /**
   * Get a user's role for a specific property.
   * Returns 'owner' if they own it, or the team role if they're a team member.
   * Per-request memoized via React `cache()`.
   */
  static getRole(
    userId: string,
    propertyId: string
  ): Promise<PropertyRole | null> {
    return getRoleCached(userId, propertyId);
  }

  /**
   * Check if a role can perform a specific action.
   */
  static canPerform(role: PropertyRole | null, action: Action): boolean {
    if (!role) return false;
    return PERMISSION_MATRIX[role]?.has(action) ?? false;
  }

  /**
   * Convenience: get role and check permission in one call.
   */
  static async authorize(
    userId: string,
    propertyId: string,
    action: Action
  ): Promise<{ authorized: boolean; role: PropertyRole | null }> {
    const role = await this.getRole(userId, propertyId);
    return { authorized: this.canPerform(role, action), role };
  }
}
