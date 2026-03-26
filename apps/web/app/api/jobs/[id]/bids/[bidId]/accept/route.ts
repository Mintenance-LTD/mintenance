import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { LearningMatchingService } from '@/lib/services/agents/LearningMatchingService';
import { PricingAgent } from '@/lib/services/agents/PricingAgent';
import {
  logger,
  validateStatusTransition,
  validateBidTransition,
  JOB_STATUS,
  BID_STATUS,
  CONTRACT_STATUS,
  type JobStatus,
  type BidStatusValue,
} from '@mintenance/shared';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import {
  getIdempotencyKeyFromRequest,
  checkIdempotency,
  storeIdempotencyResult,
} from '@/lib/idempotency';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { sendBidAcceptedNotificationsAndEmail } from './_helpers';

/** Type for bid data from Supabase query */
interface BidRow {
  id: string;
  job_id: string;
  contractor_id: string;
  status: string;
  amount: number;
}

export const POST = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    // Create a fresh Supabase client per request to avoid singleton auth state corruption
    const serverSupabase = createServerSupabaseClient();
    // RLS-enforced client for user-scoped reads; falls back to service role
    const userDb = createRequestScopedClient(request) ?? serverSupabase;

    const jobId = params.id as string;
    const bidId = params.bidId as string;

    // Idempotency check - prevent duplicate bid acceptances
    const idempotencyKey = getIdempotencyKeyFromRequest(
      request,
      'accept_bid',
      user.id,
      `${jobId}_${bidId}`
    );

    const idempotencyCheck = await checkIdempotency(
      idempotencyKey,
      'accept_bid'
    );
    if (idempotencyCheck?.isDuplicate && idempotencyCheck.cachedResult) {
      logger.info(
        'Duplicate bid acceptance detected, returning cached result',
        {
          service: 'jobs',
          idempotencyKey,
          userId: user.id,
          jobId,
          bidId,
        }
      );
      return NextResponse.json(idempotencyCheck.cachedResult);
    }

    if (user.role !== 'homeowner') {
      throw new ForbiddenError('Only homeowners can accept bids');
    }

    // Verify the job belongs to this homeowner (user-scoped read)
    const { data: job, error: jobError } = await userDb
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
      throw new NotFoundError(
        `Job (${jobError?.message || 'not found in database'})`
      );
    }

    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to accept bids for this job');
    }

    // Verify the bid exists and belongs to this job (user-scoped read)
    const { data: bidData, error: bidError } = await userDb
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
      throw new NotFoundError(
        `Bid (${bidError?.message || 'not found in database'})`
      );
    }

    // Log Stripe payment setup status (non-blocking - payment enforcement comes later)
    const { data: contractor } = await userDb
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

    // Validate bid status transition (must be pending -> accepted)
    validateBidTransition(
      bid.status as BidStatusValue,
      BID_STATUS.ACCEPTED as BidStatusValue
    );

    // Validate job status transition (must be posted -> assigned)
    validateStatusTransition(
      job.status as JobStatus,
      JOB_STATUS.ASSIGNED as JobStatus
    );

    // Step 1: Accept this bid (atomic — DB unique index prevents duplicates)
    // The partial unique index idx_bids_one_accepted_per_job on (job_id)
    // WHERE status = 'accepted' ensures only one bid per job can be accepted.
    // If a concurrent request already accepted another bid, this UPDATE will
    // fail with a unique constraint violation (code 23505).
    const { error: acceptError } = await serverSupabase
      .from('bids')
      .update({
        status: BID_STATUS.ACCEPTED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidId)
      .eq('job_id', jobId);

    if (acceptError) {
      // Postgres unique violation = another bid was accepted concurrently
      if (acceptError.code === '23505') {
        throw new ConflictError(
          'A bid has already been accepted for this job. Please refresh the page.'
        );
      }
      logger.error('Failed to accept bid - detailed error', {
        service: 'jobs',
        bidId,
        jobId,
        errorMessage: acceptError.message,
        errorCode: acceptError.code,
        errorDetails: acceptError.details,
        errorHint: (acceptError as unknown as Record<string, unknown>).hint,
      });
      throw new InternalServerError(
        `Failed to accept bid: ${acceptError.message} (code: ${acceptError.code})`
      );
    }

    // Step 2: Reject other pending bids for this job
    const { error: rejectError } = await serverSupabase
      .from('bids')
      .update({
        status: BID_STATUS.REJECTED,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId)
      .eq('status', BID_STATUS.PENDING)
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
        status: JOB_STATUS.ASSIGNED,
        contractor_id: bid.contractor_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (jobUpdateError) {
      logger.error(
        'Failed to update job status after bid acceptance',
        jobUpdateError,
        {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        }
      );
      // Don't throw - bid is already accepted, job status update is secondary
    }

    // Fetch job title for notifications (after successful acceptance)
    const { data: jobDetails } = await serverSupabase
      .from('jobs')
      .select('title, amount')
      .eq('id', jobId)
      .single();

    // Notify contractor (in-app + email) and homeowner (in-app)
    await sendBidAcceptedNotificationsAndEmail({
      contractorId: bid.contractor_id,
      homeownerId: user.id,
      bidId,
      jobId,
      jobTitle: jobDetails?.title,
      bidAmount: Number(bid.amount || 0),
      userDb,
    });

    // Auto-create welcome message thread + insert welcome message
    try {
      const welcomeMessage = `Hi! I've accepted your bid for "${jobDetails?.title || 'this job'}". Let's discuss the details and schedule a start date. Feel free to ask any questions!`;

      let threadId: string | undefined;
      const { data: existingThread } = await serverSupabase
        .from('message_threads')
        .select('id')
        .eq('job_id', jobId)
        .single();

      if (existingThread) {
        threadId = existingThread.id;
      } else {
        const { data: newThread } = await serverSupabase
          .from('message_threads')
          .insert({
            job_id: jobId,
            participant_ids: [user.id, bid.contractor_id].filter(Boolean),
            last_message_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        threadId = newThread?.id;
      }

      if (!threadId) {
        logger.error('Failed to create or find message thread', {
          service: 'jobs',
          jobId,
        });
      }

      const { error: messageError } = threadId
        ? await serverSupabase.from('messages').insert({
            thread_id: threadId,
            sender_id: user.id,
            content: welcomeMessage,
            message_type: 'text',
            read_by: [user.id],
          })
        : { error: { message: 'No thread ID' } };

      if (messageError) {
        logger.error('Failed to create welcome message', messageError, {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });
      } else {
        await serverSupabase
          .from('message_threads')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', threadId!);

        logger.info('Welcome message created', {
          service: 'jobs',
          jobId,
          contractorId: bid.contractor_id,
        });

        await NotificationService.createNotification({
          userId: bid.contractor_id,
          title: 'New Message',
          message: `You have a new message from the homeowner about "${jobDetails?.title || 'your job'}"`,
          type: 'message',
          actionUrl: `/contractor/messages`,
        });
      }
    } catch (messageError) {
      logger.error('Unexpected error creating welcome message', messageError, {
        service: 'jobs',
        jobId,
      });
    }

    // Auto-create draft contract from accepted bid (idempotency guard)
    try {
      const { data: existingContract } = await serverSupabase
        .from('contracts')
        .select('id')
        .eq('job_id', jobId)
        .limit(1);

      if (existingContract && existingContract.length > 0) {
        logger.info(
          'Contract already exists for this job, skipping auto-creation',
          {
            service: 'jobs',
            jobId,
            existingContractId: existingContract[0].id,
          }
        );
      } else {
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
            status: CONTRACT_STATUS.PENDING_CONTRACTOR,
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
        } else {
          logger.info('Draft contract created', {
            service: 'jobs',
            jobId,
            contractorId: bid.contractor_id,
          });

          await Promise.all([
            NotificationService.createNotification({
              userId: bid.contractor_id,
              title: 'Contract Ready for Review',
              message: `A contract for "${jobDetails?.title || 'the job'}" has been created. Review the terms and sign to proceed.`,
              type: 'contract_created',
              actionUrl: `/contractor/jobs/${jobId}`,
            }),
            NotificationService.createNotification({
              userId: user.id,
              title: 'Contract Created',
              message: `A contract for "${jobDetails?.title || 'your job'}" has been created. It will be ready for your signature once the contractor reviews it.`,
              type: 'contract_created',
              actionUrl: `/jobs/${jobId}`,
            }),
          ]);
        }
      }
    } catch (contractError) {
      logger.error('Unexpected error creating draft contract', contractError, {
        service: 'jobs',
        jobId,
      });
    }

    // Create notifications for rejected bids (other contractors)
    try {
      const { data: rejectedBids } = await serverSupabase
        .from('bids')
        .select('id, contractor_id, amount')
        .eq('job_id', jobId)
        .eq('status', BID_STATUS.REJECTED);

      if (rejectedBids && rejectedBids.length > 0) {
        await Promise.all(
          rejectedBids.map((rejectedBid) =>
            NotificationService.createNotification({
              userId: rejectedBid.contractor_id,
              title: 'Bid Not Selected',
              message: `Your bid for "${jobDetails?.title || 'the job'}" was not selected. Keep bidding on other opportunities!`,
              type: 'bid_rejected',
              actionUrl: `/contractor/jobs-near-you`,
            })
          )
        );

        rejectedBids.forEach((rejectedBid) => {
          PricingAgent.learnFromBidOutcome(rejectedBid.id, false).catch(
            (error) => {
              logger.error(
                'Error learning from rejected bid for pricing',
                error,
                {
                  service: 'jobs',
                  bidId: rejectedBid.id,
                }
              );
            }
          );
        });
      }
    } catch (rejectedNotificationError) {
      logger.error(
        'Unexpected error creating rejected bid notifications',
        rejectedNotificationError,
        {
          service: 'jobs',
        }
      );
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

    await storeIdempotencyResult(
      idempotencyKey,
      'accept_bid',
      responseData,
      user.id,
      { jobId, bidId, contractorId: bid.contractor_id }
    );

    return NextResponse.json(responseData);
  }
);
