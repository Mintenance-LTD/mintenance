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
  releaseOnError,
} from '@/lib/idempotency';
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  sendBidAcceptedNotificationsAndEmail,
  syncLinkedQuoteStatuses,
} from './_helpers';

/** Type for bid data from Supabase query */
interface BidRow {
  id: string;
  job_id: string;
  contractor_id: string;
  status: string;
  amount: number;
  // 2026-05-13 contract-pipeline audit: pulling extra fields so the
  // auto-created draft contract reflects what the contractor actually
  // bid on (proposal text, schedule, quote link, warranty terms),
  // rather than the previous generic boilerplate.
  description: string | null;
  message: string | null;
  estimated_duration_days: number | null;
  proposed_start_date: string | null;
  quote_id: string | null;
  warranty_months: number | null;
  materials_included: boolean | null;
}

export const POST = withApiHandler(
  // Audit P2 (2026-05-10): added explicit `roles: ['homeowner', 'admin']`.
  // Functional behaviour unchanged — the manual `user.role !== 'homeowner'`
  // check below still rejects everyone except homeowners (admins were not
  // previously allowed to accept on a homeowner's behalf and that hasn't
  // changed; the wrapper-level admin entry is wider than the body check
  // and exists only so a future support flow can opt in without touching
  // the wrapper).
  { roles: ['homeowner', 'admin'], rateLimit: { maxRequests: 30 } },
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

    return await releaseOnError(idempotencyKey, 'accept_bid', async () => {
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
        .select(
          'id, job_id, contractor_id, status, amount, description, message, estimated_duration_days, proposed_start_date, quote_id, warranty_months, materials_included'
        )
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

      // 2026-05-13 onboarding audit fix: previously this only logged a
      // warning when a bid came from a contractor without Stripe Connect,
      // and accepted the bid anyway. Result: homeowner pays into escrow,
      // platform can't release funds, and only the auto-release safety
      // net (7 days later) would surface the problem. BidCard already
      // has a helpful client-side prompt that triggers on error messages
      // containing the literal "payment account setup" / "payment setup"
      // — that branch was effectively dead. Now we throw a 403 with the
      // expected phrasing so the homeowner gets the explanation
      // immediately and the bid stays `pending` (selectable again once
      // the contractor finishes Stripe Connect).
      //
      // 2026-05-25 audit-46 P0: previously checked only
      // stripe_connect_account_id. That ID is written the moment Stripe
      // returns an account (before the contractor has submitted
      // anything), so a contractor who clicked "Set up payouts" and
      // immediately abandoned would still pass this gate. Result:
      // homeowner pays into escrow but the Stripe transfer rejects at
      // release time because payouts aren't enabled. Tighten to the
      // real readiness flags webhook handlers maintain
      // (stripe_payouts_enabled + stripe_transfers_active are both
      // boolean live; verified 2026-05-25 via information_schema).
      const { data: contractor } = await userDb
        .from('profiles')
        .select(
          'stripe_connect_account_id, stripe_payouts_enabled, stripe_transfers_active, first_name, last_name'
        )
        .eq('id', bid.contractor_id)
        .single();

      const payoutsReady =
        !!contractor?.stripe_connect_account_id &&
        contractor.stripe_payouts_enabled === true &&
        contractor.stripe_transfers_active === true;
      if (!payoutsReady) {
        logger.warn(
          'Bid acceptance blocked — contractor Stripe payouts not ready',
          {
            service: 'jobs',
            contractorId: bid.contractor_id,
            bidId,
            jobId,
            hasAccountId: !!contractor?.stripe_connect_account_id,
            payoutsEnabled: contractor?.stripe_payouts_enabled,
            transfersActive: contractor?.stripe_transfers_active,
          }
        );
        throw new ForbiddenError(
          'This contractor has not completed their payment account setup. They must finish Stripe Connect onboarding before their bid can be accepted.'
        );
      }

      // 2026-05-22 Sprint 2: Active-jobs cap on Free/Basic contractors. A
      // free contractor can bid on 10 jobs/month but only WORK ON 3 at a
      // time. The cap creates upgrade pressure — once they're consistently
      // winning, Pro removes it. Skipped for Pro/Business (and early-access
      // founding members, who resolve to enterprise).
      //
      // Counted at acceptance time, not bid-submit time, so a Free
      // contractor can still queue up bids during slow weeks and pick
      // selectively — homeowner just hits the limit when accepting a 4th
      // simultaneous one.
      const { FeeCalculationService } =
        await import('@/lib/services/payment/FeeCalculationService');
      const acceptingContractorTier =
        await FeeCalculationService.resolveContractorTier(bid.contractor_id);
      if (
        acceptingContractorTier === 'free' ||
        acceptingContractorTier === 'basic'
      ) {
        const { count: activeJobsCount } = await serverSupabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('contractor_id', bid.contractor_id)
          .in('status', [JOB_STATUS.ASSIGNED, JOB_STATUS.IN_PROGRESS]);

        const ACTIVE_JOBS_CAP_FREE_BASIC = 3;
        if (
          activeJobsCount !== null &&
          activeJobsCount >= ACTIVE_JOBS_CAP_FREE_BASIC
        ) {
          logger.info(
            'Bid acceptance blocked — contractor at active-jobs cap',
            {
              service: 'jobs',
              contractorId: bid.contractor_id,
              tier: acceptingContractorTier,
              activeJobsCount,
              cap: ACTIVE_JOBS_CAP_FREE_BASIC,
              bidId,
              jobId,
            }
          );
          throw new ConflictError(
            `This contractor is currently at their ${ACTIVE_JOBS_CAP_FREE_BASIC}-job concurrent work limit (Basic plan). They need to complete a current job — or upgrade to Professional for unlimited active jobs — before they can take on this one.`
          );
        }
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

      // Fetch job title for notifications (after successful acceptance).
      //
      // 2026-05-26 audit-51 P2: previously selected `title, amount`,
      // but live `jobs` has `budget` not `amount` (verified via
      // information_schema). PostgREST rejected the whole SELECT,
      // jobDetails returned null, and the notification copy fell
      // back to "this job" / "Job". The notification fan-out below
      // uses `Number(bid.amount || 0)` for the payment amount —
      // jobs.budget isn't needed here at all — so drop it from the
      // SELECT and just pull the title.
      const { data: jobDetails } = await serverSupabase
        .from('jobs')
        .select('title')
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

      // Sync `contractor_quotes` status to mirror the bid outcome. This
      // closes the quote → bid → outcome loop so the contractor's
      // /contractor/quotes dashboard reflects reality (accepted count +
      // total-revenue tile). Fire-and-forget — never blocks accept flow.
      syncLinkedQuoteStatuses({ acceptedBidId: bidId, jobId }).catch((err) => {
        logger.error('Quote status sync failed (non-blocking)', err, {
          service: 'quotes',
          jobId,
          bidId,
        });
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

        // 2026-05-23 audit: messages live schema requires job_id +
        // receiver_id at the top level and has no thread_id / read_by
        // columns (those were dropped in the messages-table redesign
        // that landed in 20260417000616 and the read-flag tightening
        // in 20260523000007). The previous insert with thread_id +
        // read_by silently failed — the message_threads row was
        // created and updated, but the actual welcome message never
        // landed, so the contractor opened an empty chat after their
        // bid was accepted. `message_threads` itself is still around
        // as the conversation-metadata parent, so we keep wiring the
        // thread + last_message_at update.
        const { error: messageError } = threadId
          ? await serverSupabase.from('messages').insert({
              job_id: jobId,
              sender_id: user.id,
              receiver_id: bid.contractor_id,
              content: welcomeMessage,
              message_type: 'text',
              read: false,
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
        logger.error(
          'Unexpected error creating welcome message',
          messageError,
          {
            service: 'jobs',
            jobId,
          }
        );
      }

      // Auto-create draft contract from accepted bid (idempotency guard)
      //
      // 2026-05-13 bid → contract pipeline audit: this block previously
      // wrote a near-empty contract — generic title, boilerplate
      // description ("Contract created from accepted bid for X"), no
      // schedule, no contractor identity, no insurance, no quote link.
      // Homeowner was then asked to sign a contract whose body told
      // them nothing about what the contractor actually proposed.
      //
      // The contractor's full submission lived in three places:
      //   • bids.message          — proposal text (50–5000 chars)
      //   • bids.proposed_start_date / estimated_duration_days
      //   • bids.warranty_months / materials_included
      //   • bids.quote_id → contractor_quotes (line items, subtotal,
      //     tax_rate, tax_amount, total_amount, terms text)
      //   • profiles (company_name, license_number, license_type)
      //   • contractor_insurance (provider, policy_number)
      //
      // We now pull all of that into the draft so the homeowner sees the
      // real proposal at the signature step.
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
          // Pull the contractor's identity + insurance in parallel with
          // the rest of the accept-flow side-effects. Failures here are
          // non-fatal — we degrade to the previous bare-bones contract
          // rather than block acceptance.
          const [profileRes, insuranceRes] = await Promise.all([
            serverSupabase
              .from('profiles')
              .select('company_name, license_number, license_type')
              .eq('id', bid.contractor_id)
              .maybeSingle(),
            serverSupabase
              .from('contractor_insurance')
              .select('provider, policy_number, expiry_date')
              .eq('contractor_id', bid.contractor_id)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const contractorProfile = profileRes.data;
          const insurance = insuranceRes.data;
          const bidAmount = bid.amount || 0;

          // Prefer `message` (the canonical proposal column on bids) but
          // fall back to `description` for older rows.
          const proposalText =
            (bid.message ?? bid.description ?? '').toString().trim() || null;

          // contracts.start_date / end_date are `timestamp with time
          // zone`; bids.proposed_start_date is a `date`. Promote to ISO
          // and compute the projected end-date from the duration if both
          // are present.
          let startDateIso: string | null = null;
          let endDateIso: string | null = null;
          if (bid.proposed_start_date) {
            const start = new Date(`${bid.proposed_start_date}T09:00:00.000Z`);
            if (!Number.isNaN(start.getTime())) {
              startDateIso = start.toISOString();
              if (
                bid.estimated_duration_days &&
                bid.estimated_duration_days > 0
              ) {
                const end = new Date(start);
                end.setUTCDate(end.getUTCDate() + bid.estimated_duration_days);
                endDateIso = end.toISOString();
              }
            }
          }

          const termsPayload: Record<string, unknown> = {
            source: 'accepted_bid',
            bid_id: bidId,
            created_from: 'bid_acceptance',
          };
          if (insurance?.provider) {
            termsPayload.insurance_provider = insurance.provider;
          }
          if (insurance?.policy_number) {
            termsPayload.insurance_policy_number = insurance.policy_number;
          }
          if (insurance?.expiry_date) {
            termsPayload.insurance_expiry_date = insurance.expiry_date;
          }
          if (bid.estimated_duration_days && bid.estimated_duration_days > 0) {
            termsPayload.estimated_duration_days = bid.estimated_duration_days;
          }
          if (bid.warranty_months && bid.warranty_months > 0) {
            termsPayload.warranty_months = bid.warranty_months;
          }
          // Only persist `materials_included: true` — the falsy case
          // would render as literal "false" under ContractScope's
          // additional-terms list, which is confusing UX.
          if (bid.materials_included === true) {
            termsPayload.materials_included = true;
          }

          const contractPayload: Record<string, unknown> = {
            job_id: jobId,
            contractor_id: bid.contractor_id,
            homeowner_id: user.id,
            title: `Contract for ${jobDetails?.title || 'Job'}`,
            description:
              proposalText ||
              `Contract created from accepted bid for "${jobDetails?.title || 'this job'}"`,
            amount: bidAmount,
            status: CONTRACT_STATUS.PENDING_CONTRACTOR,
            start_date: startDateIso,
            end_date: endDateIso,
            terms: termsPayload,
            contractor_company_name: contractorProfile?.company_name ?? null,
            contractor_license_registration:
              contractorProfile?.license_number ?? null,
            contractor_license_type: contractorProfile?.license_type ?? null,
            quote_id: bid.quote_id ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: contractError } = await serverSupabase
            .from('contracts')
            .insert(contractPayload);

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
        logger.error(
          'Unexpected error creating draft contract',
          contractError,
          {
            service: 'jobs',
            jobId,
          }
        );
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
    });
  }
);
