/**
 * CORS Security Module for Next.js API Routes
 *
 * VULN-007 Fix: Replaces wildcard CORS with whitelist-based validation
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { handlePreflightRequest, addCorsHeaders } from '@/lib/cors';
 *
 * if (request.method === 'OPTIONS') {
 *   return handlePreflightRequest(request);
 * }
 *
 * const response = NextResponse.next();
 * return addCorsHeaders(response, request);
 * ```
 *
 * Usage in API routes:
 * ```typescript
 * import { createCorsResponse } from '@/lib/cors';
 *
 * export async function POST(request: NextRequest) {
 *   return createCorsResponse({ success: true }, request);
 * }
 * ```
 */

export {
  getAllowedOrigins,
  isOriginAllowed,
  isCorsEnabled,
  getCorsRolloutPercentage,
} from './config';

export {
  getCorsHeaders,
  handlePreflightRequest,
  addCorsHeaders,
  createCorsResponse,
  shouldSkipCors,
} from './headers';
