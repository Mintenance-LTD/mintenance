import { withApiHandler } from '@/lib/api/with-api-handler';
import { conversation } from '@/lib/reports/conversation';
// auth-check: ok — anonymous residents authenticate with the x-report-receipt secret.
// conversation() validates and hashes it; report_conversation checks the hash against
// this report before reading or writing messages. No cookie authority is accepted.
export const GET = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 30 } },
  (request) => conversation(request, null)
);
export const POST = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 10 } },
  (request) => conversation(request, null)
);
