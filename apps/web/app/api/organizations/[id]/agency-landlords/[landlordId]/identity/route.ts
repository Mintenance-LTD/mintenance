import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import {
  agencyLandlordIdentityInput,
  assertPrivateWorkResult,
  privateWorkJson,
  privateWorkUuid,
} from '@/lib/services/property-team/agency-private-dispatch';

function identityArgs(orgId: string, landlordId: string, actorId: string) {
  if (
    !privateWorkUuid.safeParse(orgId).success ||
    !privateWorkUuid.safeParse(landlordId).success
  ) {
    throw new NotFoundError('Landlord record not found');
  }
  return { p_org_id: orgId, p_landlord_id: landlordId, p_actor_id: actorId };
}

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const { data, error } = await serverSupabase.rpc(
      'get_agency_landlord_identity',
      identityArgs(params.id, params.landlordId, user.id)
    );
    assertPrivateWorkResult(error);
    return privateWorkJson(data);
  }
);
export const PUT = withApiHandler(
  { rateLimit: { maxRequests: 12 } },
  async (request, { user, params }) => {
    const parsed = agencyLandlordIdentityInput.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success)
      throw new BadRequestError(
        'Enter the exact email of an existing landlord account'
      );
    if (parsed.data.landlordEmail !== null) {
      const blocked = await requirePortfolioModeSubscription(request, user.id);
      if (blocked) return blocked;
    }
    const { data, error } = await serverSupabase.rpc(
      'set_agency_landlord_identity',
      {
        ...identityArgs(params.id, params.landlordId, user.id),
        p_email: parsed.data.landlordEmail,
      }
    );
    assertPrivateWorkResult(error);
    return privateWorkJson(data);
  }
);
