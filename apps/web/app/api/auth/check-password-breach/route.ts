import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { checkPasswordBreach } from '@mintenance/auth';
import { BadRequestError } from '@/lib/errors/api-error';

/**
 * POST /api/auth/check-password-breach
 *
 * Pre-signup / pre-password-change HIBP probe. Mobile clients call this before
 * `supabase.auth.signUp()` because they cannot run the SHA-1 + HIBP-range fetch
 * locally without adding a crypto dependency. Web routes (/api/auth/register,
 * /api/auth/reset-password) already wrap checkPasswordBreach inline.
 *
 * The endpoint receives the raw password over HTTPS, identical privacy posture
 * to the existing register endpoint. The password is never persisted; only the
 * SHA-1 prefix leaves the server (k-anonymity, see packages/auth/src/password-security.ts).
 *
 * Auth: false — needed before account exists.
 * Rate limit: tighter than register so it can't be used as a credential-stuffing
 * oracle (low cost = high enumeration risk if unbounded).
 */
export const POST = withApiHandler(
  {
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  },
  async (request) => {
    let body: { password?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    if (typeof body.password !== 'string' || body.password.length === 0) {
      throw new BadRequestError('Password is required');
    }
    if (body.password.length > 128) {
      throw new BadRequestError('Password exceeds maximum length');
    }

    const result = await checkPasswordBreach(body.password);

    return NextResponse.json({
      isBreached: result.isBreached,
      occurrences: result.occurrences ?? null,
    });
  }
);
