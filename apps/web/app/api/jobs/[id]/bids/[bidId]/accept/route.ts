import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import { LearningMatchingService } from '@/lib/services/agents/LearningMatchingService';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  let jobId: string | undefined;
  let bidId: string | undefined;

  try {
    // CSRF protection
    await requireCSRF(request);

    const paramsResolved = await params;
    jobId = paramsResolved.id;
    bidId = paramsResolved.bidId;

    const user = await getCurrentUserFromCookies();

    if (!user) {
      throw new UnauthorizedError('Authentication required to accept bids');
    }

    // Idempotency check - prevent duplicate bid acceptances
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'accept_bid',
      user.id,
      `${jobId}_${bidId}`
    );

    const idempotencyCheck = await checkIdempotency(idempotencyKey, 'accept_bid');
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info('Duplicate bid acceptance detected, returning cached result', {
        service: 'jobs',
        idempotencyKey,
        userId: user.id,
        jobId,
        bidId,
      });
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    if (user.role !== 'homeowner') {
      throw new ForbiddenError('Only homeowners can accept bids');
    }

    // Verify the job belongs to this homeowner
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      logger.error('Failed to fetch job', jobError, {
        service: 'jobs',
        jobId,
      });
      throw new NotFoundError('Job not found');
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to accept bids for this job');
    }

    // Verify the bid exists and belongs to this job
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, contractor_id, status, amount')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    if (bidError || !bid) {
      logger.error('Failed to fetch bid', bidError, {
        service: 'jobs',
        bidId,
        jobId,
      });
      throw new NotFoundError('Bid not found');
    }

    // Check if contractor has payment setup before accepting bid
    // Check both users table and contractor_payout_accounts for completeness
    const { data: contractor, error: contractorError } = await serverSupabase
      .from('users')
      .select('stripe_connect_account_id, first_name, last_name')
      .eq('id', bid.contractor_id)
      .single();

    if (contractorError || !contractor?.stripe_connect_account_id) {
      throw new BadRequestError('This contractor has not completed payment account setup. They must set up their payment account before accepting jobs.');
    }

    // Also check if the payout account is marked as complete
    const { data: payoutAccount } = await serverSupabase
      .from('contractor_payout_accounts')
      .select('account_complete, stripe_account_id')
      .eq('contractor_id', bid.contractor_id)
      .single();

    // If payout account exists but is not complete, verify with Stripe
    // This provides a fallback if webhook didn't update the status
    if (payoutAccount && !payoutAccount.account_complete && payoutAccount.stripe_account_id) {
      try {
        // Only verify if Stripe is configured
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
          });

          const stripeAccount = await stripe.accounts.retrieve(payoutAccount.stripe_account_id);
          
          // Check if account is actually complete
          const isAccountComplete = stripeAccount.details_submitted && 
                                    stripeAccount.charges_enabled && 
                                    stripeAccount.payouts_enabled;

          if (!isAccountComplete) {
            throw new BadRequestError('This contractor has started payment setup but has not completed the onboarding process. They must finish setting up their payment account before accepting jobs.');
          }

          // Update database if account is actually complete but not marked as such
          await serverSupabase
            .from('contractor_payout_accounts')
            .update({ account_complete: true })
            .eq('contractor_id', bid.contractor_id);
        }
      } catch (stripeError) {
        // If Stripe check fails, log but don't block (webhook will sync later)
        logger.warn('Failed to verify Stripe account status', {
          service: 'jobs',
          contractorId: bid.contractor_id,
          error: stripeError,
        });
        // Don't block bid acceptance if verification fails - assume webhook will sync
      }
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
      logger.error('Failed to accept bid atomically', acceptError, {
        service: 'jobs',
        bidId,
        jobId,
      });

      // Handle unique constraint violation (race condition detected)
      if (acceptError.code === '23505' || acceptError.message?.includes('unique constraint') || acceptError.message?.includes('duplicate key')) {
        throw new ConflictError('A bid has already been accepted for this job. Please refresh the page.'); // 409 Conflict
      }

      throw new InternalServerError('Failed to accept bid');
    }

    // Check function return value
    const result = acceptResult as { success?: boolean; error_message?: string; accepted_bid_id?: string } | null;
    if (!result || !result.success) {
      const errorMessage = result?.error_message || 'Failed to accept bid';
      
      logger.error('Bid acceptance failed', undefined, {
        service: 'jobs',
        bidId,
        jobId,
        errorMessage,
        acceptedBidId: result?.accepted_bid_id,
      });

      // Handle specific error cases
      if (errorMessage.includes('already been accepted')) {
        throw new ConflictError('A bid has already been accepted for this job. Please refresh the page.'); // 409 Conflict
      }

      if (errorMessage.includes('not found')) {
        throw new NotFoundError(errorMessage);
      }

      if (errorMessage.includes('Not authorized')) {
        throw new ForbiddenError(errorMessage);
      }

      throw new BadRequestError(errorMessage);
    }

    // Fetch job title for notification (after successful acceptance)
    const { data: jobDetails } = await serverSupabase
      .from('jobs')
      .select('title, amount')
      .eq('id', jobId)
      .single();

    // Create notifications for both contractor and homeowner
    // Use NotificationHelper for job status change (assigned status)
    try {
      const { notifyJobStatusChange } = await import('@/lib/services/notifications/NotificationHelper');
      
      // Get job details including status
      const { data: jobData } = await serverSupabase
        .from('jobs')
        .select('title, status, homeowner_id, contractor_id')
        .eq('id', jobId)
        .single();

      if (jobData) {
        // Notify about job assignment (status change to assigned)
        await notifyJobStatusChange({
          jobId,
          jobTitle: jobData.title,
          oldStatus: 'posted',
          newStatus: 'assigned',
          homeownerId: jobData.homeowner_id,
          contractorId: jobData.contractor_id,
        });
      }

      // Also create bid acceptance notification for contractor (existing logic)
      logger.info('Creating notification for contractor', {
        service: 'jobs',
        contractorId: bid.contractor_id,
        bidId,
        jobId,
        jobTitle: jobDetails?.title,
        bidAmount: Number((bid as any).amount || 0),
      });

      const notificationData = {
        user_id: bid.contractor_id,
        title: 'Bid Accepted! 🎉',
        message: `Congratulations! Your bid of £${Number((bid as any).amount || 0).toLocaleString()} for "${jobDetails?.title || 'the job'}" has been accepted. You can now contact the homeowner and create a contract.`,
        type: 'bid_accepted',
        read: false,
        action_url: `/contractor/jobs/${jobId}`,
        created_at: new Date().toISOString(),
      };

      const { data: insertedNotification, error: notificationError } = await serverSupabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (notificationError) {
        logger.error('Failed to create bid acceptance notification', notificationError, {
          service: 'jobs',
          contractorId: bid.contractor_id,
          bidId,
          jobId,
        });
      } else {
        logger.info('Bid acceptance notification created successfully', {
          service: 'jobs',
          contractorId: bid.contractor_id,
          bidId,
          jobId,
          notificationId: insertedNotification?.id,
        });
      }
    } catch (notificationError) {
      logger.error('Unexpected error creating notification', notificationError, {
        service: 'jobs',
        contractorId: bid.contractor_id,
        bidId,
        jobId,
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
          content: welcomeMessage, // Use 'content' column (schema uses 'content', not 'message_text')
          message_type: 'text',
          read: false,
          created_at: new Date().toISOString(),
        });

      if (messageError) {
        logger.error('Failed to create welcome message', messageError, {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
        // Don't fail the request if message creation fails
      } else {
        logger.info('Welcome message created', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
      }
    } catch (messageError) {
      logger.error('Unexpected error creating welcome message', messageError, {
        service: 'jobs',
        jobId,
      });
      // Don't fail the request if message creation fails
    }

    // Auto-create draft contract from accepted bid
    try {
      const bidAmount = (bid as any).amount || 0;
      
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
        logger.error('Failed to create draft contract', contractError, {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
        // Don't fail the request if contract creation fails
      } else {
        logger.info('Draft contract created', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
      }
    } catch (contractError) {
      logger.error('Unexpected error creating draft contract', contractError, {
        service: 'jobs',
        jobId,
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
          logger.error('Failed to create rejected bid notifications', rejectedNotificationError, {
            service: 'jobs',
          });
        }

        // Learn from rejected bids for pricing agent
        rejectedBids.forEach((rejectedBid) => {
          PricingAgent.learnFromBidOutcome(rejectedBid.id, false).catch((error) => {
            logger.error('Error learning from rejected bid for pricing', error, {
              service: 'jobs',
              bidId: rejectedBid.id,
            });
          });
        });
      }
    } catch (rejectedNotificationError) {
      logger.error('Unexpected error creating rejected bid notifications', rejectedNotificationError, {
        service: 'jobs',
      });
    }

    // Learn from this acceptance for future matching improvements
    LearningMatchingService.learnFromAcceptance(
      jobId,
      user.id,
      bid.contractor_id,
      Number((bid as any).amount || 0)
    ).catch((error) => {
      logger.error('Error learning from acceptance', error, {
        service: 'jobs',
        jobId,
      });
    });

    // Learn from bid acceptance for pricing agent
    PricingAgent.learnFromBidOutcome(bidId, true).catch((error) => {
      logger.error('Error learning from bid acceptance for pricing', error, {
        service: 'jobs',
        bidId,
      });
    });

    logger.info('Bid accepted successfully', {
      service: 'jobs',
      bidId,
      jobId,
      contractorId: bid.contractor_id,
    });

    const responseData = {
      success: true,
      message: 'Bid accepted successfully',
    };

    // Store idempotency result
    await storeIdempotencyResult(
      idempotencyKey,
      'accept_bid',
      responseData,
      user.id,
      { jobId, bidId, contractorId: bid.contractor_id }
    );

    return NextResponse.json(responseData);
  } catch (error) {
    return handleAPIError(error);
  }
}

