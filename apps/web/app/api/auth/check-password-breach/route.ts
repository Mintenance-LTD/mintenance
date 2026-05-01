import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { checkPasswordBreach } from '@mintenance/auth';
import { BadRequestError } from '@/lib/errors/api-error';

// 2026-05-01 audit follow-up (check-api-contracts): Zod-validated body
// replaces the manual `typeof password === 'string'` + length pair.
const checkPasswordBreachSchema = z
  .object({
    password: z.string().min(1).max(128),
  })
  .strict();

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
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = checkPasswordBreachSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Password is required'
      );
    }
    const { password } = parsed.data;

    const result = await checkPasswordBreach(password);

    return NextResponse.json({
      isBreached: result.isBreached,
      occurrences: result.occurrences ?? null,
    });
  }
);
