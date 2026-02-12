import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/api/supabaseServer';
import { LearningMatchingService } from '@/lib/services/agents/LearningMatchingService';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { getIdempotencyKeyFromRequest, checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/** Type for bid data from Supabase query */
interface BidRow {
  id: string;
  job_id: string;
  contractor_id: string;
  status: string;
  amount: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bidId: string }> }
) {
  let jobId: string | undefined;
  let bidId: string | undefined;

  try {
  // Create a fresh Supabase client per request to avoid singleton auth state corruption
  const serverSupabase = createServerSupabaseClient();

  // Rate limiting check - use IP only, not URL (job/bid IDs in URL make each request unique)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `accept-bid:${ip}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

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
      logger.error('Failed to fetch job for bid acceptance', {
        service: 'jobs',
        jobId,
        errorMessage: jobError?.message,
        errorCode: jobError?.code,
        errorDetails: jobError?.details,
        hasData: !!job,
      });
      throw new NotFoundError(`Job (${jobError?.message || 'not found in database'})`);
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to accept bids for this job');
    }

    // Verify the bid exists and belongs to this job
    const { data: bidData, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, job_id, contractor_id, status, amount')
      .eq('id', bidId)
      .eq('job_id', jobId)
      .single();

    const bid = bidData as BidRow | null;

    if (bidError || !bid) {
      logger.error('Failed to fetch bid for acceptance', {
        service: 'jobs',
        bidId,
        jobId,
        errorMessage: bidError?.message,
        errorCode: bidError?.code,
        hasData: !!bidData,
      });
      throw new NotFoundError(`Bid (${bidError?.message || 'not found in database'})`);
    }

    // Log Stripe payment setup status (non-blocking - payment enforcement comes later)
    const { data: contractor } = await serverSupabase
      .from('profiles')
      .select('stripe_connect_account_id, first_name, last_name')
      .eq('id', bid.contractor_id)
      .single();

    if (!contractor?.stripe_connect_account_id) {
      logger.warn('Contractor accepting bid without Stripe setup', {
        service: 'jobs',
        contractorId: bid.contractor_id,
        bidId,
        jobId,
      });
    }

    // Check if another bid is already accepted for this job
    const { data: existingAccepted } = await serverSupabase
      .from('bids')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .limit(1);

    if (existingAccepted && existingAccepted.length > 0) {
      throw new ConflictError('A bid has already been accepted for this job. Please refresh the page.');
    }

    // Step 1: Accept this bid
    const { error: acceptError } = await serverSupabase
      .from('bids')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', bidId)
      .eq('job_id', jobId);

    if (acceptError) {
      logger.error('Failed to accept bid - detailed error', {
        service: 'jobs',
        bidId,
        jobId,
        errorMessage: acceptError.message,
        errorCode: acceptError.code,
        errorDetails: acceptError.details,
        errorHint: (acceptError as Record<string, unknown>).hint,
      });
      // Include actual DB error for debugging
      throw new InternalServerError(`Failed to accept bid: ${acceptError.message} (code: ${acceptError.code})`);
    }

    // Step 2: Reject other pending bids for this job
    const { error: rejectError } = await serverSupabase
      .from('bids')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .neq('id', bidId);

    if (rejectError) {
      logger.warn('Failed to reject other bids', {
        service: 'jobs',
        jobId,
        error: rejectError.message,
      });
    }

    // Step 3: Update job status and assign contractor
    const { error: jobUpdateError } = await serverSupabase
      .from('jobs')
      .update({
        status: 'assigned',
        contractor_id: bid.contractor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (jobUpdateError) {
      logger.error('Failed to update job status after bid acceptance', jobUpdateError, {
        service: 'jobs',
        jobId,
        contractorId: bid.contractor_id,
      });
      // Don't throw - bid is already accepted, job status update is secondary
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
        bidAmount: Number(bid.amount || 0),
      });

      const notificationData = {
        user_id: bid.contractor_id,
        title: 'Bid Accepted! 🎉',
        message: `Congratulations! Your bid of £${Number(bid.amount || 0).toLocaleString()} for "${jobDetails?.title || 'the job'}" has been accepted. You can now contact the homeowner and create a contract.`,
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
        .from('profiles')
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
      const bidAmount = bid.amount || 0;
      
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
      Number(bid.amount || 0)
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

