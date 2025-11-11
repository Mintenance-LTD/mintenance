import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * POST /api/contractor/payout/setup
 * Set up Stripe Connect account for contractor payouts
 */
export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can set up payout accounts' }, { status: 403 });
    }

    // Invoke Supabase Edge Function to set up Stripe Connect
    const { data, error } = await serverSupabase.functions.invoke('setup-contractor-payout', {
      body: { contractorId: user.id },
    });

    if (error) {
      throw new Error(error.message || 'Failed to set up payout account');
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    const accountUrl = (payload['accountUrl'] ?? payload['url']) as string | undefined;

    if (!accountUrl) {
      throw new Error('Stripe onboarding link was not returned');
    }

    logger.info('Contractor payout setup initiated', {
      service: 'payments',
      userId: user.id,
    });

    return NextResponse.json({
      accountUrl,
      message: 'Redirecting to Stripe onboarding...',
    });
  } catch (error) {
    logger.error('Error setting up contractor payout', error, { service: 'payments' });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up payout account' },
      { status: 500 }
    );
  }
}

