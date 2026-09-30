import { withApiHandler } from '@/lib/api/with-api-handler';
import { conversation } from '@/lib/reports/conversation';
export const GET = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 30 } },
  (request) => conversation(request, null)
);
export const POST = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 10 } },
  (request) => conversation(request, null)
);
