import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError } from '@/lib/errors/api-error';
import { requirePortfolioModeSubscription } from '@/lib/middleware/subscription-check';
import {
  agencyDispatchInput,
  privateDispatchFor,
} from '@/lib/services/property-team/agency-private-dispatch';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) =>
    privateDispatchFor(params.id, user.id, null)
);

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  async (request, { user, params }) => {
    const parsed = agencyDispatchInput.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsed.success)
      throw new BadRequestError('Check the private work details');
    if (['quote', 'dispatch'].includes(parsed.data.action)) {
      const blocked = await requirePortfolioModeSubscription(request, user.id);
      if (blocked) return blocked;
    }
    return privateDispatchFor(params.id, user.id, parsed.data);
  }
);
