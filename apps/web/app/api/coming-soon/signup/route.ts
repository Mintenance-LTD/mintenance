import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(200).optional(),
});

export const POST = withApiHandler(
  { auth: false, csrf: false, rateLimit: { maxRequests: 5 } },
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
      logger.error('Failed to save coming soon signup', error, {
        service: 'coming-soon',
      });
      return NextResponse.json(
        { error: 'Failed to save your signup. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email (non-blocking -- failure should not affect the signup response)
    try {
      const displayName = name || 'there';
      await EmailService.sendEmail({
        to: email.toLowerCase(),
        subject: "Welcome to Mintenance - You're on the early access list!",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #0d9488; margin-bottom: 16px;">
              Welcome to Mintenance
            </h1>
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
              Hi ${displayName},
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
              Thank you for joining our early access list! We are building a better way to connect homeowners with trusted local contractors for property maintenance.
            </p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
              We will notify you as soon as the platform is ready to launch. Stay tuned!
            </p>
            <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
              Best regards,<br/>The Mintenance Team
            </p>
            ${EmailService.getUnsubscribeFooter()}
          </div>
        `,
        text: `Hi ${displayName},\n\nThank you for joining our early access list! We are building a better way to connect homeowners with trusted local contractors for property maintenance.\n\nWe will notify you as soon as the platform is ready to launch. Stay tuned!\n\nBest regards,\nThe Mintenance Team`,
      });
    } catch (emailError) {
      logger.warn('Failed to send early access confirmation email', {
        service: 'coming-soon',
        email: email.toLowerCase(),
        error: String(emailError),
      });
    }

    return NextResponse.json({ success: true, message: "You're on the list!" });
  }
);
