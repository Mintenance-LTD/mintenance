// @vitest-environment node
/** Real-DB contract participant and completed-job review checks. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestJob,
  createTestUser,
  type TestJob,
  type TestUser,
} from '../../test/integration/fixtures';

describe('contract and review lifecycle (real DB)', () => {
  let homeowner: TestUser;
  let contractor: TestUser;
  let outsider: TestUser;
  let homeownerClient: SupabaseClient;
  let contractorClient: SupabaseClient;
  let outsiderClient: SupabaseClient;
  let job: TestJob;
  let bidId: string;
  let contractId: string;
  let reviewId: string;

  beforeAll(async () => {
    if (!(await isLocalSupabaseAvailable())) {
      throw new Error('Local Supabase is required for contract/review tests');
    }

    homeowner = await createTestUser({ role: 'homeowner' });
    contractor = await createTestUser({ role: 'contractor' });
    outsider = await createTestUser({ role: 'homeowner' });
    homeownerClient = await createAuthenticatedClient(
      homeowner.email,
      homeowner.password
    );
    contractorClient = await createAuthenticatedClient(
      contractor.email,
      contractor.password
    );
    outsiderClient = await createAuthenticatedClient(
      outsider.email,
      outsider.password
    );

    job = await createTestJob({
      homeowner_id: homeowner.id,
      status: 'completed',
    });
    const service = createServiceClient();
    const { error: assignError } = await service
      .from('jobs')
      .update({ contractor_id: contractor.id, status: 'completed' })
      .eq('id', job.id);
    if (assignError) throw new Error(assignError.message);

    const { data: bid, error: bidError } = await contractorClient
      .from('bids')
      .insert({
        job_id: job.id,
        contractor_id: contractor.id,
        amount: 450,
        description: 'itest contractor quote',
        message: 'itest quote message',
        status: 'pending',
        estimated_duration_days: 3,
      })
      .select('id')
      .single();
    if (bidError || !bid) throw new Error(bidError?.message);
    bidId = bid.id;

    const homeownerBid = await homeownerClient
      .from('bids')
      .select('id, amount')
      .eq('id', bidId)
      .single();
    if (homeownerBid.error || homeownerBid.data?.id !== bidId) {
      throw new Error(
        homeownerBid.error?.message ||
          'Homeowner could not read contractor quote'
      );
    }

    const { data: contract, error: contractError } = await homeownerClient
      .from('contracts')
      .insert({
        job_id: job.id,
        homeowner_id: homeowner.id,
        contractor_id: contractor.id,
        status: 'pending_homeowner',
        title: 'itest contract',
        description: 'itest contract description',
        amount: 450,
        terms: { source: 'itest' },
      })
      .select('id')
      .single();
    if (contractError || !contract) throw new Error(contractError?.message);
    contractId = contract.id;

    const { data: review, error: reviewError } = await homeownerClient
      .from('reviews')
      .insert({
        job_id: job.id,
        reviewer_id: homeowner.id,
        reviewee_id: contractor.id,
        rating: 5,
        comment: 'itest completed-job review',
        would_recommend: true,
      })
      .select('id')
      .single();
    if (reviewError || !review) throw new Error(reviewError?.message);
    reviewId = review.id;
  }, 30_000);

  afterAll(async () => {
    const service = createServiceClient();
    if (reviewId) await service.from('reviews').delete().eq('id', reviewId);
    if (contractId)
      await service.from('contracts').delete().eq('id', contractId);
    if (bidId) await service.from('bids').delete().eq('id', bidId);
    await job?.cleanup();
    await homeowner?.cleanup();
    await contractor?.cleanup();
    await outsider?.cleanup();
  });

  it('allows contract participants to read but hides contracts from outsiders', async () => {
    const homeownerRead = await homeownerClient
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .single();
    expect(homeownerRead.error).toBeNull();
    const contractorRead = await contractorClient
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .single();
    expect(contractorRead.error).toBeNull();
    const outsiderRead = await outsiderClient
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .maybeSingle();
    expect(outsiderRead.data).toBeNull();
  });

  it('completes the homeowner-to-contractor quote handoff before contracting', async () => {
    const contractorJob = await contractorClient
      .from('jobs')
      .select('id, status')
      .eq('id', job.id)
      .single();
    expect(contractorJob.error).toBeNull();
    expect(contractorJob.data?.status).toBe('completed');

    const homeownerBid = await homeownerClient
      .from('bids')
      .select('id, contractor_id, amount')
      .eq('id', bidId)
      .single();
    expect(homeownerBid.error).toBeNull();
    expect(homeownerBid.data?.contractor_id).toBe(contractor.id);
    expect(Number(homeownerBid.data?.amount)).toBe(450);
    expect(contractId).toBeTruthy();
  });

  it('permits the reviewer to update within the review window but blocks an outsider', async () => {
    const reviewerUpdate = await homeownerClient
      .from('reviews')
      .update({ comment: 'itest updated review' })
      .eq('id', reviewId)
      .select('id')
      .single();
    expect(reviewerUpdate.error).toBeNull();

    const outsiderUpdate = await outsiderClient
      .from('reviews')
      .update({ comment: 'itest forged review' })
      .eq('id', reviewId)
      .select('id', { count: 'exact', head: true });
    expect(
      outsiderUpdate.error === null && (outsiderUpdate.count ?? 0) > 0
    ).toBe(false);
  });

  it('keeps completed-job review eligibility tied to job participants', async () => {
    const contractorReview = await contractorClient
      .from('reviews')
      .insert({
        job_id: job.id,
        reviewer_id: contractor.id,
        reviewee_id: homeowner.id,
        rating: 4,
        comment: 'itest contractor review',
      })
      .select('id')
      .single();
    expect(contractorReview.error).toBeNull();
    if (contractorReview.data?.id) {
      await createServiceClient()
        .from('reviews')
        .delete()
        .eq('id', contractorReview.data.id);
    }

    const outsiderReview = await outsiderClient.from('reviews').insert({
      job_id: job.id,
      reviewer_id: outsider.id,
      reviewee_id: contractor.id,
      rating: 1,
      comment: 'itest forged review',
    });
    expect(outsiderReview.error).not.toBeNull();
  });
});
