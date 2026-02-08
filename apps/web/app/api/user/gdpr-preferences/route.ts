import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { checkGDPRRateLimit } from '@/lib/rate-limiting/admin-gdpr';
import { handleAPIError, UnauthorizedError, InternalServerError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

/**
 * GET /api/user/gdpr-preferences
 * Get user's GDPR preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for GDPR endpoints
    const rateLimitResponse = await checkGDPRRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { data, error } = await serverSupabase
      .from('user_preferences')
      .select('gdpr_preferences')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Failed to fetch GDPR preferences', error);
      throw new InternalServerError('Failed to fetch preferences');
    }

    return NextResponse.json({
      preferences: data?.gdpr_preferences || {
        dataProcessing: true,
        marketing: false,
        analytics: false,
        dataSharing: false,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/user/gdpr-preferences
 * Update user's GDPR preferences
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting for GDPR endpoints
    const rateLimitResponse = await checkGDPRRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const gdprPreferencesSchema = z.object({
      preferences: z.record(z.string(), z.boolean()),
    });

    const validation = await validateRequest(request, gdprPreferencesSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;

    // Ensure dataProcessing is always true (required for service)
    const validPreferences = {
      ...data.preferences,
      dataProcessing: true,
    };

    // Upsert preferences
    const { error: upsertError } = await serverSupabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        gdpr_preferences: validPreferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      logger.error('Failed to save GDPR preferences', upsertError);
      throw new InternalServerError('Failed to save preferences');
    }

    logger.info('GDPR preferences updated', { userId: user.id });

    return NextResponse.json({
      success: true,
      preferences: validPreferences,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

