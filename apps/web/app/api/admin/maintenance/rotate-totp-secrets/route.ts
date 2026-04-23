import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { encryptField } from '@/lib/encryption/field-encryption';
import { logger } from '@mintenance/shared';

/**
 * POST /api/admin/maintenance/rotate-totp-secrets
 * Re-encrypts any plaintext totp_secret values flagged by migration.
 * Idempotent: safe to run multiple times (only processes flagged rows).
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 5 },
    // Rotates every flagged admin's TOTP secret at once. If this endpoint
    // fires on a stolen admin session the whole MFA layer is silently
    // re-keyed — demand fresh MFA proof within 15 min, matching the
    // escrow/refund precedent in apps/web/app/api/admin/refunds/[id]/route.ts.
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (_request, { user }) => {
    // Fetch flagged profiles (batch limit to prevent memory exhaustion)
    const { data: profiles, error: fetchError } = await serverSupabase
      .from('profiles')
      .select('id, totp_secret')
      .eq('totp_secret_needs_rotation', true)
      .limit(500);

    if (fetchError) {
      logger.error(
        '[MAINTENANCE] Failed to fetch profiles for TOTP rotation',
        fetchError
      );
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        message: 'No profiles require rotation',
        rotated: 0,
      });
    }

    let rotated = 0;
    let failed = 0;

    for (const profile of profiles) {
      if (!profile.totp_secret) continue;

      try {
        const encrypted = encryptField(profile.totp_secret, 'totp_secret');

        const { error: updateError } = await serverSupabase
          .from('profiles')
          .update({
            totp_secret: JSON.stringify(encrypted),
            totp_secret_needs_rotation: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          logger.error(
            '[MAINTENANCE] Failed to update TOTP secret',
            updateError,
            { profileId: profile.id }
          );
          failed++;
        } else {
          rotated++;
        }
      } catch (encryptErr) {
        logger.error(
          '[MAINTENANCE] Failed to encrypt TOTP secret',
          encryptErr,
          { profileId: profile.id }
        );
        failed++;
      }
    }

    logger.info('[MAINTENANCE] TOTP secret rotation complete', {
      adminId: user.id,
      rotated,
      failed,
      total: profiles.length,
    });

    return NextResponse.json({
      message: 'TOTP rotation complete',
      rotated,
      failed,
      total: profiles.length,
    });
  }
);
