import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(200).optional(),
});

export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 5 } },
  async (request) => {
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
  }
);
