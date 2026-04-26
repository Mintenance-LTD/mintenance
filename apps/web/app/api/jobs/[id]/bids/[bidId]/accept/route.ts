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
      // Full DB error is logged server-side. The client-visible 404
      // intentionally drops schema-leaking detail (constraint / column /
      // table names that help an attacker fingerprint the DB).
      logger.error('Failed to fetch job for bid acceptance', {
        service: 'jobs',
        jobId,
        errorMessage: jobError?.message,
        errorCode: jobError?.code,
        errorDetails: jobError?.details,
        hasData: !!job,
      });
      throw new NotFoundError('Job not found');
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
      throw new NotFoundError('Bid not found');
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

    // Sprint 7 fix (2.1): atomic bid acceptance.
    //
    // Previously this block ran three separate UPDATEs (accept target bid,
    // reject losers, assign job). Under concurrent acceptance attempts or a
    // mid-sequence failure, we could end up with:
    //   - Winner accepted but losers still 'pending'
    //   - Winner accepted but job still 'posted' with no contractor
    //   - Two winners (protected only by a partial unique index)
    //
    // The DB already has accept_bid_atomic(p_bid_id, p_job_id, p_contractor_id,
    // p_homeowner_id) SECURITY DEFINER function that locks the job row FOR
    // UPDATE, verifies ownership, ensures no prior accepted bid, and then
    // performs all three writes inside a single implicit transaction. Switch
    // to that RPC so the invariants hold even under race conditions.
    interface AcceptBidResult {
      success: boolean;
      error_message: string | null;
      accepted_bid_id: string | null;
      job_status: string | null;
    }

    const { data: rpcRaw, error: rpcError } = await serverSupabase.rpc(
      'accept_bid_atomic',
      {
        p_bid_id: bidId,
        p_job_id: jobId,
        p_contractor_id: bid.contractor_id,
        p_homeowner_id: user.id,
      }
    );

    if (rpcError) {
      logger.error(
        'accept_bid_atomic RPC failed — bid acceptance aborted',
        rpcError,
        { service: 'jobs', bidId, jobId, contractorId: bid.contractor_id }
      );
      if (rpcError.code === '23505') {
        throw new ConflictError('Bid has already been accepted for this job');
      }
      throw new InternalServerError(
        `Failed to accept bid: ${rpcError.message}`
      );
    }

    // RPC returns a setof row; grab the first
    const rpcRow = Array.isArray(rpcRaw)
      ? (rpcRaw[0] as AcceptBidResult | undefined)
      : (rpcRaw as AcceptBidResult | null);
    if (!rpcRow) {
      throw new InternalServerError('accept_bid_atomic returned no rows');
    }

    if (!rpcRow.success) {
      const msg = rpcRow.error_message ?? 'Unknown bid acceptance error';
      // The RPC detects concurrent acceptance and reports it via error_message;
      // treat it as a ConflictError so the client can retry cleanly.
      if (msg.toLowerCase().includes('already')) {
        throw new ConflictError(msg);
      }
      if (msg.toLowerCase().includes('not authorized')) {
        throw new ForbiddenError(msg);
      }
      if (msg.toLowerCase().includes('not found')) {
        throw new NotFoundError(msg);
      }
      throw new InternalServerError(msg);
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
