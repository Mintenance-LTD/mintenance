import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { LearningMatchingService } from '@/lib/services/agents/LearningMatchingService';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  let jobId: string | undefined;
  let bidId: string | undefined;

  try {
    const paramsResolved = await params;
    jobId = paramsResolved.id;
    bidId = paramsResolved.bidId;
    const user = await getCurrentUserFromCookies();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'homeowner') {
      return NextResponse.json({ error: 'Only homeowners can accept bids' }, { status: 403 });
    }

    // Verify the job belongs to this homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Failed to fetch job', {
        service: 'jobs',
        jobId,
        error: jobError?.message,
      });
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to accept bids for this job' }, { status: 403 });
    }

    // Verify the bid exists and belongs to this job
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, contractor_id, status, amount, bid_amount')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      console.error('Failed to fetch bid', {
        service: 'jobs',
        bidId,
        error: bidError?.message,
      });
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    // Use atomic function to accept bid, reject others, and update job status
    // This prevents race conditions where multiple bids could be accepted for the same job
    const { data: acceptResult, error: acceptError } = await serverSupabase
      .rpc('accept_bid_atomic', {
        p_bid_id: bidId,
        p_job_id: jobId,
        p_contractor_id: bid.contractor_id,
        p_homeowner_id: user.id,
      })
      .single();

    if (acceptError) {
      console.error('Failed to accept bid atomically', {
        service: 'jobs',
        bidId,
        jobId,
        error: acceptError.message,
        errorCode: acceptError.code,
      });

      // Handle unique constraint violation (race condition detected)
      if (acceptError.code === '23505' || acceptError.message?.includes('unique constraint') || acceptError.message?.includes('duplicate key')) {
        return NextResponse.json({ 
          error: 'A bid has already been accepted for this job. Please refresh the page.',
        }, { status: 409 }); // 409 Conflict
      }

      return NextResponse.json({ error: 'Failed to accept bid' }, { status: 500 });
    }

    // Check function return value
    if (!acceptResult || !acceptResult.success) {
      const errorMessage = acceptResult?.error_message || 'Failed to accept bid';
      
      console.error('Bid acceptance failed', {
        service: 'jobs',
        bidId,
        jobId,
        errorMessage,
        acceptedBidId: acceptResult?.accepted_bid_id,
      });

      // Handle specific error cases
      if (errorMessage.includes('already been accepted')) {
        return NextResponse.json({ 
          error: 'A bid has already been accepted for this job. Please refresh the page.',
        }, { status: 409 }); // 409 Conflict
      }

      if (errorMessage.includes('not found')) {
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }

      if (errorMessage.includes('Not authorized')) {
        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Fetch job title for notification (after successful acceptance)
    const { data: jobDetails } = await serverSupabase
      .from('jobs')
      .select('title, amount')
      .eq('id', jobId)
      .single();

    // Create notification for contractor
    try {
      console.log('[Bid Accept] Creating notification for contractor', {
        service: 'jobs',
        contractorId: bid.contractor_id,
        bidId,
        jobId,
        jobTitle: jobDetails?.title,
        bidAmount: Number((bid as any).amount || (bid as any).bid_amount || 0),
      });

      const notificationData = {
        user_id: bid.contractor_id,
        title: 'Bid Accepted! 🎉',
        message: `Congratulations! Your bid of £${Number((bid as any).amount || (bid as any).bid_amount || 0).toLocaleString()} for "${jobDetails?.title || 'the job'}" has been accepted. You can now contact the homeowner and create a contract.`,
        type: 'bid_accepted',
        read: false,
        action_url: `/contractor/jobs/${jobId}`,
        created_at: new Date().toISOString(),
      };

      console.log('[Bid Accept] Notification data:', notificationData);

      const { data: insertedNotification, error: notificationError } = await serverSupabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (notificationError) {
        console.error('[Bid Accept] Failed to create bid acceptance notification', {
          service: 'jobs',
          contractorId: bid.contractor_id,
          bidId,
          jobId,
          error: notificationError.message,
          errorDetails: notificationError,
          notificationData,
        });
        // Don't fail the request if notification fails, but log it
      } else {
        console.log('[Bid Accept] Bid acceptance notification created successfully', {
          service: 'jobs',
          contractorId: bid.contractor_id,
          bidId,
          jobId,
          notificationId: insertedNotification?.id,
          notificationType: insertedNotification?.type,
          actionUrl: insertedNotification?.action_url,
        });
      }
    } catch (notificationError) {
      console.error('[Bid Accept] Unexpected error creating notification', {
        service: 'jobs',
        contractorId: bid.contractor_id,
        bidId,
        jobId,
        error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
        errorStack: notificationError instanceof Error ? notificationError.stack : undefined,
      });
      // Don't fail the request if notification fails
    }

    // Auto-create welcome message thread - send initial message from homeowner to contractor
    try {
      // Get homeowner details for the message
      const { data: homeownerData } = await serverSupabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const homeownerName = homeownerData?.first_name 
        ? `${homeownerData.first_name}${homeownerData.last_name ? ` ${homeownerData.last_name}` : ''}`
        : 'Homeowner';

      const welcomeMessage = `Hi! I've accepted your bid for "${jobDetails?.title || 'this job'}". Let's discuss the details and schedule a start date. Feel free to ask any questions!`;

      const { error: messageError } = await serverSupabase
        .from('messages')
        .insert({
          job_id: jobId,
          sender_id: user.id,
          receiver_id: bid.contractor_id,
          message_text: welcomeMessage,
          message_type: 'text',
          read: false,
          created_at: new Date().toISOString(),
        });

      if (messageError) {
        console.error('Failed to create welcome message', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
          error: messageError.message,
        });
        // Don't fail the request if message creation fails
      } else {
        console.log('Welcome message created', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
      }
    } catch (messageError) {
      console.error('Unexpected error creating welcome message', {
        service: 'jobs',
        jobId,
        error: messageError instanceof Error ? messageError.message : 'Unknown error',
      });
      // Don't fail the request if message creation fails
    }

    // Auto-create draft contract from accepted bid
    try {
      const bidAmount = (bid as any).amount || (bid as any).bid_amount || 0;
      
      const { error: contractError } = await serverSupabase
        .from('contracts')
        .insert({
          job_id: jobId,
          contractor_id: bid.contractor_id,
          homeowner_id: user.id,
          title: `Contract for ${jobDetails?.title || 'Job'}`,
          description: `Contract created from accepted bid for "${jobDetails?.title || 'this job'}"`,
          amount: bidAmount,
          status: 'draft', // Contractor can complete and submit for homeowner signature
          terms: {
            source: 'accepted_bid',
            bid_id: bidId,
            created_from: 'bid_acceptance',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (contractError) {
        console.error('Failed to create draft contract', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
          error: contractError.message,
        });
        // Don't fail the request if contract creation fails
      } else {
        console.log('Draft contract created', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
      }
    } catch (contractError) {
      console.error('Unexpected error creating draft contract', {
        service: 'jobs',
        jobId,
        error: contractError instanceof Error ? contractError.message : 'Unknown error',
      });
      // Don't fail the request if contract creation fails
    }

    // Create notifications for rejected bids (other contractors)
    try {
      const { data: rejectedBids } = await serverSupabase
        .from('bids')
        .select('id, contractor_id, amount')
        .eq('job_id', jobId)
        .eq('status', 'rejected');

      if (rejectedBids && rejectedBids.length > 0) {
        const rejectedNotifications = rejectedBids.map((rejectedBid) => ({
          user_id: rejectedBid.contractor_id,
          title: 'Bid Not Selected',
          message: `Your bid for "${jobDetails?.title || 'the job'}" was not selected. Keep bidding on other opportunities!`,
          type: 'bid_rejected',
          read: false,
          action_url: `/contractor/jobs-near-you`,
          created_at: new Date().toISOString(),
        }));

        const { error: rejectedNotificationError } = await serverSupabase
          .from('notifications')
          .insert(rejectedNotifications);

        if (rejectedNotificationError) {
          console.error('Failed to create rejected bid notifications', {
            service: 'jobs',
            error: rejectedNotificationError.message,
          });
        }

        // Learn from rejected bids for pricing agent
        rejectedBids.forEach((rejectedBid) => {
          PricingAgent.learnFromBidOutcome(rejectedBid.id, false).catch((error) => {
            console.error('Error learning from rejected bid for pricing', error, {
              service: 'jobs',
              bidId: rejectedBid.id,
            });
          });
        });
      }
    } catch (rejectedNotificationError) {
      console.error('Unexpected error creating rejected bid notifications', {
        service: 'jobs',
        error: rejectedNotificationError instanceof Error ? rejectedNotificationError.message : 'Unknown error',
      });
    }

    // Learn from this acceptance for future matching improvements
    LearningMatchingService.learnFromAcceptance(
      jobId,
      user.id,
      bid.contractor_id,
      Number((bid as any).amount || (bid as any).bid_amount || 0)
    ).catch((error) => {
      console.error('Error learning from acceptance', error, {
        service: 'jobs',
        jobId,
      });
    });

    // Learn from bid acceptance for pricing agent
    PricingAgent.learnFromBidOutcome(bidId, true).catch((error) => {
      console.error('Error learning from bid acceptance for pricing', error, {
        service: 'jobs',
        bidId,
      });
    });

    console.log('Bid accepted successfully', {
      service: 'jobs',
      bidId,
      jobId,
      contractorId: bid.contractor_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Bid accepted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in accept bid', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      jobId,
      bidId,
    });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

