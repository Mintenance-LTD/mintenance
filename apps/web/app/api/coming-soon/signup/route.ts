import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(200).optional(),
  referralCode: z.string().max(20).optional(),
});

// auth-check: ok — coming-soon waitlist signup is public by design;
// a logged-in user wouldn't be on the waitlist.
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

    const { email, name, referralCode } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already signed up
    const { data: existing } = await serverSupabase
      .from('coming_soon_signups')
      .select('id, position, referral_code')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
        position: existing.position,
        referralCode: existing.referral_code,
        alreadySignedUp: true,
      });
    }

    // Resolve referrer if a referral code was provided
    let referredById: string | null = null;
    if (referralCode) {
      const { data: referrer } = await serverSupabase
        .from('coming_soon_signups')
        .select('id')
        .eq('referral_code', referralCode.trim())
        .single();

      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Get current max position to assign the next one
    const { data: maxPos } = await serverSupabase
      .from('coming_soon_signups')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPos?.position ?? 0) + 1;

    // Generate a unique 8-character referral code
    const newReferralCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

    const { data: signup, error } = await serverSupabase
      .from('coming_soon_signups')
      .upsert(
        {
          email: normalizedEmail,
          name: name?.trim() || null,
          position: nextPosition,
          referral_code: newReferralCode,
          referred_by: referredById,
          source: referralCode ? 'referral' : 'direct',
        },
        { onConflict: 'email' }
      )
      .select('id, position, referral_code')
      .single();

    if (error) {
      logger.error('Failed to save coming soon signup', error, {
        service: 'coming-soon',
      });
      return NextResponse.json(
        { error: 'Failed to save your signup. Please try again.' },
        { status: 500 }
      );
    }

    // Increment referrer's referral count (non-blocking)
    if (referredById) {
      serverSupabase
        .rpc('increment_referral_count', { referrer_id: referredById })
        .then(({ error: rpcError }) => {
          if (rpcError) {
            // Fallback: direct increment if RPC doesn't exist
            serverSupabase
              .from('coming_soon_signups')
              .update({ referral_count: (maxPos?.position ?? 0) + 1 }) // approximate
              .eq('id', referredById)
              .then(() => {});
          }
        });
    }

    // Send confirmation email (non-blocking)
    const displayName = name?.trim() || 'there';
    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/coming-soon?ref=${signup?.referral_code || newReferralCode}`;

    EmailService.sendEmail({
      to: normalizedEmail,
      subject:
        "You're #" +
        (signup?.position || nextPosition) +
        ' on the Mintenance waitlist!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #0d9488; margin-bottom: 16px;">
            Welcome to Mintenance
          </h1>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
            Hi ${displayName},
          </p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
            You're <strong>#${signup?.position || nextPosition}</strong> on our early access waitlist!
            We're building a better way to connect homeowners with trusted local contractors.
          </p>
          <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="font-size: 14px; color: #0d9488; font-weight: 600; margin: 0 0 8px 0;">
              Move up the list! Share your referral link:
            </p>
            <a href="${referralLink}" style="font-size: 14px; color: #0d9488; word-break: break-all;">
              ${referralLink}
            </a>
            <p style="font-size: 13px; color: #6b7280; margin: 8px 0 0 0;">
              Each friend who signs up moves you closer to the front.
            </p>
          </div>
          <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
            We'll notify you as soon as the platform is ready. Stay tuned!
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
            Best regards,<br/>The Mintenance Team
          </p>
          ${EmailService.getUnsubscribeFooter()}
        </div>
      `,
      text: `Hi ${displayName},\n\nYou're #${signup?.position || nextPosition} on our early access waitlist!\n\nShare your referral link to move up: ${referralLink}\n\nEach friend who signs up moves you closer to the front.\n\nWe'll notify you as soon as the platform is ready.\n\nBest regards,\nThe Mintenance Team`,
    }).catch((emailError) => {
      logger.warn('Failed to send early access confirmation email', {
        service: 'coming-soon',
        email: normalizedEmail,
        error: String(emailError),
      });
    });

    return NextResponse.json({
      success: true,
      message: `You're #${signup?.position || nextPosition} on the waitlist!`,
      position: signup?.position || nextPosition,
      referralCode: signup?.referral_code || newReferralCode,
    });
  }
);
