import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/errors/api-error';
import { getEffectiveHomeownerTier } from '@/lib/subscription/early-access';
import { hasFeatureAccess } from '@/lib/feature-access-config';

const types = ['portfolio', 'agency', 'property_management'];
const propertyFields = 'id, property_name, address';
const schema = z.object({
  propertyId: z.string().uuid(),
  workspace: z.discriminatedUnion('action', [
    z.object({
      action: z.literal('create'),
      name: z.string().trim().min(2).max(100),
    }),
    z.object({ action: z.literal('link'), orgId: z.string().uuid() }),
  ]),
});

async function canSetUpWorkspace(userId: string) {
  const tier = await getEffectiveHomeownerTier(userId);
  return hasFeatureAccess('HOMEOWNER_TEAM_ACCESS', 'homeowner', tier);
}

export const GET = withApiHandler(
  { roles: ['homeowner', 'admin'], csrf: false },
  async (request, { user }) => {
    const blocked = await requirePortfolioModeSubscription(request);
    if (blocked) return blocked;

    const { data: memberships, error } = await serverSupabase
      .from('organization_memberships')
      .select('org_id, org_role')
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (error) throw error;

    const roles = new Map(
      (memberships ?? []).map((member) => [member.org_id, member.org_role])
    );
    const canSetUp =
      user.role === 'homeowner' && (await canSetUpWorkspace(user.id));

    const [orgs, owned] = await Promise.all([
      roles.size
        ? serverSupabase
            .from('organizations')
            .select('id, name')
            .in('id', [...roles.keys()])
            .in('organization_type', types)
            .order('name')
        : Promise.resolve({ data: [], error: null }),
      canSetUp
        ? serverSupabase
            .from('properties')
            .select(propertyFields)
            .eq('owner_id', user.id)
            .is('org_id', null)
            .order('property_name')
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (orgs.error) throw orgs.error;
    if (owned.error) throw owned.error;
    return NextResponse.json(
      {
        workspaces: (orgs.data ?? []).map((org) => ({
          ...org,
          role: roles.get(org.id),
        })),
        unlinkedProperties: owned.data ?? [],
        canSetUp,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
);

export const POST = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 10 } },
  async (request, { user }) => {
    const blocked = await requirePortfolioModeSubscription(request);
    if (blocked) return blocked;
    if (!(await canSetUpWorkspace(user.id))) {
      throw new ForbiddenError(
        'An Agency plan is required to set up a shared Portfolio workspace'
      );
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      throw new BadRequestError('Choose a property and a valid workspace');
    const { propertyId, workspace } = parsed.data;
    const { data, error } = await serverSupabase.rpc(
      'setup_portfolio_workspace',
      {
        p_actor_id: user.id,
        p_property_id: propertyId,
        p_org_id: workspace.action === 'link' ? workspace.orgId : null,
        p_name: workspace.action === 'create' ? workspace.name : null,
      }
    );
    if (error?.code === '42501')
      throw new ForbiddenError(
        'You must own both the property and the workspace'
      );
    if (error?.code === 'P0002') throw new NotFoundError('Property not found');
    if (error?.code === '23505')
      throw new BadRequestError('This property already belongs to a workspace');
    if (error) throw error;
    return NextResponse.json({ orgId: data });
  }
);
