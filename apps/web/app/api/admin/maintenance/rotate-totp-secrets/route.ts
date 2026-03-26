import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { encryptField } from '@/lib/encryption/field-encryption';
import { logger } from '@mintenance/shared';

// One-time admin maintenance route: re-encrypts any plaintext totp_secret values
// flagged by migration 20260318000002_flag_plaintext_totp_secrets.sql
//
// Auth: requires SUPABASE_SERVICE_ROLE_KEY as Bearer token.
// Idempotent: safe to run multiple times (only processes flagged rows).
// After confirming count = 0, this route should be removed or disabled.

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // Auth: only callable with service role key
  const authHeader = request.headers.get('Authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
        // Encrypt the plaintext value using the existing field encryption library
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
            '[MAINTENANCE] Failed to update TOTP secret for profile',
            updateError,
            {
              profileId: profile.id,
            }
          );
          failed++;
        } else {
          rotated++;
        }
      } catch (encryptErr) {
        logger.error(
          '[MAINTENANCE] Failed to encrypt TOTP secret for profile',
          encryptErr,
          {
            profileId: profile.id,
          }
        );
        failed++;
      }
    }

    logger.info('[MAINTENANCE] TOTP secret rotation complete', {
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
  } catch (error) {
    logger.error('[MAINTENANCE] Unexpected error during TOTP rotation', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
