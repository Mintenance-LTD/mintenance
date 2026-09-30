import { withApiHandler } from '@/lib/api/with-api-handler';
import { conversation } from '@/lib/reports/conversation';
export const GET = withApiHandler({}, (request, { user }) =>
  conversation(request, user.id)
);
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 20 } },
  (request, { user }) => conversation(request, user.id)
);
