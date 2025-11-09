import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/**
 * GET /api/user/gdpr-preferences
 * Get user's GDPR preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await serverSupabase
      .from('user_preferences')
      .select('gdpr_preferences')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.error('Failed to fetch GDPR preferences', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
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
    logger.error('Error fetching GDPR preferences', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/gdpr-preferences
 * Update user's GDPR preferences
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid preferences data' },
        { status: 400 }
      );
    }

    // Ensure dataProcessing is always true (required for service)
    const validPreferences = {
      ...preferences,
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
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    logger.info('GDPR preferences updated', { userId: user.id });

    return NextResponse.json({
      success: true,
      preferences: validPreferences,
    });
  } catch (error) {
    logger.error('Error saving GDPR preferences', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

