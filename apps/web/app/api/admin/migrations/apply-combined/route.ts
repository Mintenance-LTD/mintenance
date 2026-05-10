/**
 * POST /api/admin/migrations/apply-combined — DEPRECATED proxy.
 *
 * Audit P3 (2026-05-10): this route was a code-duplicated variant of
 * `/api/admin/migrations/apply` that always operated on the
 * `20250228000000_combined_platform_enhancements.sql` filename. Two
 * routes for one job invited drift — e.g. one would receive a security
 * patch (path-traversal regex, MFA gating) and the other wouldn't.
 *
 * The route is now a thin proxy that forwards to the canonical
 * `/api/admin/migrations/apply` POST with the hardcoded filename
 * baked into the body. All security gates (admin role, rate limit,
 * MFA step-up, Zod-validated filename) come from the canonical
 * handler in `../apply/route.ts`. Once any external caller is
 * confirmed gone, this directory can be deleted entirely.
 */

import { NextResponse } from 'next/server';
import { POST as applyMigrationHandler } from '../apply/route';

const COMBINED_MIGRATION_FILE =
  '20250228000000_combined_platform_enhancements.sql';

export async function POST(request: Request): Promise<Response> {
  const proxiedBody = JSON.stringify({
    migrationFile: COMBINED_MIGRATION_FILE,
  });
  const proxied = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: proxiedBody,
    // Preserve the original request's other request init bits the
    // canonical handler may inspect (mode/credentials/redirect default
    // to NextRequest defaults; signal lets the upstream cancellation
    // propagate through).
    signal: request.signal,
  });

  // Cast through `unknown` because the canonical handler's
  // signature uses NextRequest while we synthesised a plain Request.
  // At runtime they're identical (NextRequest extends Request) and
  // the handler doesn't pass any params here (no dynamic segment).
  return (
    applyMigrationHandler as unknown as (
      req: Request,
      ctx: { params: Record<string, string> }
    ) => Promise<NextResponse>
  )(proxied, { params: {} });
}
