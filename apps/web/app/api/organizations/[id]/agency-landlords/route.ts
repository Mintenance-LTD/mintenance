import { withApiHandler } from '@/lib/api/with-api-handler';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import { agencyLandlordResponse } from '@/lib/services/property-team/agency-landlords';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    return agencyLandlordResponse(params.id, user.id, null, null);
  }
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 15 } },
  async (request, { user, params }) => {
    const blocked = await requirePortfolioModeSubscription(request, user.id);
    if (blocked) return blocked;
    return agencyLandlordResponse(params.id, user.id, null, request);
  }
);
