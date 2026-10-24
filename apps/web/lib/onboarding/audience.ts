import { serverSupabase } from '@/lib/api/supabaseServer';

/** Membership determines the suggested journey, never grants authorization. */
export async function contractorOnboardingAudience(
  userId: string
): Promise<'contractor' | 'team-member'> {
  const { data: memberships, error } = await serverSupabase
    .from('organization_memberships')
    .select('org_id,org_role')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) throw new Error('Could not load onboarding membership');
  if (!memberships?.length) return 'contractor';
  const { data: companies, error: companyError } = await serverSupabase
    .from('organizations')
    .select('id')
    .in(
      'id',
      memberships.map((m) => m.org_id)
    )
    .eq('organization_type', 'contractor_company');
  if (companyError) throw new Error('Could not load onboarding organization');
  const companyIds = new Set((companies ?? []).map((c) => c.id));
  const roles = memberships.filter((m) => companyIds.has(m.org_id));
  return roles.length > 0 && roles.every((m) => m.org_role !== 'owner')
    ? 'team-member'
    : 'contractor';
}
