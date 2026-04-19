/**
 * GET /api/user/organizations
 *
 * Returns the orgs this user is an active member of, with their role in
 * each. Used by:
 *   - contractor team page (shows contractor_company orgs)
 *   - landlord portfolio page (shows portfolio orgs)
 *   - mobile TeamScreen
 */

import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: memberships, error } = await serverSupabase
      .from('organization_memberships')
      .select('org_id, org_role, status')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    const orgIds = (memberships || []).map((m) => m.org_id as string);
    if (orgIds.length === 0) {
      return NextResponse.json({ organizations: [] });
    }

    const { data: orgs, error: orgErr } = await serverSupabase
      .from('organizations')
      .select('id, name, organization_type')
      .in('id', orgIds);
    if (orgErr) {
      throw orgErr;
    }

    const roleByOrgId = Object.fromEntries(
      (memberships || []).map((m) => [m.org_id as string, m.org_role as string])
    );

    return NextResponse.json({
      organizations: (orgs || []).map((o) => ({
        id: o.id as string,
        name: o.name as string,
        organization_type: o.organization_type as string,
        myRole: roleByOrgId[o.id as string] ?? null,
      })),
    });
  }
);
