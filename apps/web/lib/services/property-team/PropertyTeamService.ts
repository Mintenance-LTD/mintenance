import { serverSupabase } from '@/lib/api/supabaseServer';

export type PropertyRole = 'owner' | 'admin' | 'manager' | 'viewer';

type Action =
  | 'view'           // GET property details
  | 'edit'           // PUT property details
  | 'delete'         // DELETE property
  | 'manage_team'    // Invite/remove team members
  | 'manage_compliance' // Upload/edit compliance certs
  | 'manage_maintenance' // Create/edit recurring maintenance
  | 'create_job';    // Post a job for this property

const PERMISSION_MATRIX: Record<PropertyRole, Set<Action>> = {
  owner: new Set(['view', 'edit', 'delete', 'manage_team', 'manage_compliance', 'manage_maintenance', 'create_job']),
  admin: new Set(['view', 'edit', 'manage_team', 'manage_compliance', 'manage_maintenance', 'create_job']),
  manager: new Set(['view', 'edit', 'manage_compliance', 'manage_maintenance', 'create_job']),
  viewer: new Set(['view']),
};

export class PropertyTeamService {
  /**
   * Get a user's role for a specific property.
   * Returns 'owner' if they own it, or the team role if they're a team member.
   */
  static async getRole(userId: string, propertyId: string): Promise<PropertyRole | null> {
    // Check ownership first
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
  static async authorize(userId: string, propertyId: string, action: Action): Promise<{ authorized: boolean; role: PropertyRole | null }> {
    const role = await this.getRole(userId, propertyId);
    return { authorized: this.canPerform(role, action), role };
  }
}
