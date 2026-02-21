import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous'}:coming-soon-signup`,
      windowMs: 60000,
      maxRequests: 5,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;

    const { error } = await serverSupabase
      .from('coming_soon_signups')
      .upsert(
        { email: email.toLowerCase(), name: name || null },
        { onConflict: 'email' }
      );

    if (error) {
      logger.error('Failed to save coming soon signup', error, { service: 'coming-soon' });
      return NextResponse.json(
        { error: 'Failed to save your signup. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "You're on the list!" });
  } catch (error) {
    logger.error('Coming soon signup error', error, { service: 'coming-soon' });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
