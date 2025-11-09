import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';

/**
 * Handle swipe actions on the Discover page
 * POST /api/discover/swipe
 * 
 * For contractors: tracks job views and creates bid/interest
 * For homeowners: tracks contractor matches
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
    const { action, itemId, itemType } = body;

    if (!action || !itemId || !itemType) {
      return NextResponse.json(
        { error: 'Missing required fields: action, itemId, itemType' },
        { status: 400 }
      );
    }

    if (!['like', 'pass', 'super_like', 'maybe'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: like, pass, super_like, or maybe' },
        { status: 400 }
      );
    }

    const isContractor = user.role === 'contractor';
    const isHomeowner = user.role === 'homeowner';

    // For contractors swiping on jobs
    if (isContractor && itemType === 'job') {
      // Check subscription requirement for contractors
      const { requireSubscriptionForAction } = await import('@/lib/middleware/subscription-check');
      const subscriptionCheck = await requireSubscriptionForAction(request, 'swipe_job');
      if (subscriptionCheck) {
        return subscriptionCheck;
      }

      // Always track view when contractor sees a job
      await serverSupabase
        .from('job_views')
        .upsert({
          job_id: itemId,
          contractor_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'job_id,contractor_id',
        });

      // If contractor swiped right (like), create a bid to show interest
      if (action === 'like' || action === 'super_like') {
        // Check if bid already exists
        const { data: existingBid } = await serverSupabase
          .from('bids')
          .select('id')
          .eq('job_id', itemId)
          .eq('contractor_id', user.id)
          .single();

        // Only create bid if it doesn't exist
        if (!existingBid) {
          // Fetch job to get budget for default bid amount
          const { data: job } = await serverSupabase
            .from('jobs')
            .select('budget')
            .eq('id', itemId)
            .single();

          const bidAmount = job?.budget ? parseFloat(job.budget.toString()) : 0;

          await serverSupabase
            .from('bids')
            .insert({
              job_id: itemId,
              contractor_id: user.id,
              amount: bidAmount,
              status: 'pending',
              message: action === 'super_like' ? 'Super interested in this job!' : '',
            });
        }

        // Check for match (if homeowner previously liked this contractor for this job)
        // This would require checking if homeowner has a match with this contractor
        // For now, we'll return success without match detection
        return NextResponse.json({
          success: true,
          action: 'like',
          matched: false,
        });
      }

      // If contractor passed, just track the view
      return NextResponse.json({
        success: true,
        action: 'pass',
      });
    }

    // For homeowners swiping on contractors
    if (isHomeowner && itemType === 'contractor') {
      // Track match action
      const matchAction = action === 'like' || action === 'super_like' ? 'like' : 'pass';

      // Upsert match record
      const { error: matchError } = await serverSupabase
        .from('contractor_matches')
        .upsert({
          homeowner_id: user.id,
          contractor_id: itemId,
          action: matchAction,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'homeowner_id,contractor_id',
        });

      if (matchError) {
        console.error('Error saving contractor match:', matchError);
        return NextResponse.json(
          { error: 'Failed to save match' },
          { status: 500 }
        );
      }

      // Check for mutual match (contractor also liked this homeowner's job)
      // This would require checking contractor's interest in homeowner's jobs
      // For now, return success
      return NextResponse.json({
        success: true,
        action: matchAction,
        matched: false,
      });
    }

    return NextResponse.json(
      { error: 'Invalid user role or item type combination' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/discover/swipe', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

