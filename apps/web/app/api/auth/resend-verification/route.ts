import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { validateRequest } from '@/lib/validation/validator';
import { getAppUrl } from '@/lib/env';
import { z } from 'zod';

const schema = z.object({ email: z.string().trim().email().max(254) });

// Unconfirmed users deliberately have no app session. Keep this rate-limited,
// CSRF-protected recovery endpoint anonymous and never disclose account status.
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 3, windowMs: 900_000 } },
  async (request) => {
    const validation = await validateRequest(request, schema);
    if ('headers' in validation) return validation;
    try {
      const { error } = await createAnonClient().auth.resend({
        type: 'signup',
        email: validation.data.email,
        options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
      });
      if (error) {
        return NextResponse.json(
          {
            error:
              'Unable to send a verification email right now. Please try again later.',
          },
          { status: error.status === 429 ? 429 : 503 }
        );
      }
      return NextResponse.json({
        message:
          'If this address has an account awaiting verification, a new link has been requested. Check your inbox and spam folder.',
      });
    } catch {
      return NextResponse.json(
        {
          error:
            'Unable to send a verification email right now. Please try again later.',
        },
        { status: 503 }
      );
    }
  }
);
