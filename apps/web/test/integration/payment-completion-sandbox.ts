import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import * as OTPAuth from 'otpauth';
import { stripe } from '@/lib/stripe';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { MFAService } from '@/lib/mfa/mfa-service';
import { buildStepUpCookieValue } from '@/lib/auth/mfa-step-up';
import { createTestUser } from './fixtures';
import { createAnonClient } from './supabase-test-client';
import { syntheticWorkPhoto } from './synthetic-work-photo';
import type { SandboxJourney } from './payment-acceptance-sandbox';

async function jsonSuccess(response: Response, label: string) {
  const body = await response.json();
  assert.ok(
    response.ok && body.success,
    `${label}: HTTP ${response.status} ${JSON.stringify(body)}`
  );
  return body;
}

async function escrowFor(jobId: string) {
  const result = await db
    .from('escrow_transactions')
    .select('*')
    .eq('job_id', jobId)
    .single();
  assert.equal(result.error, null);
  return result.data!;
}

async function completeWork(journey: SandboxJourney) {
  const { jobId, request } = journey;
  const params = { params: Promise.resolve({ id: jobId }) };
  const { POST: start } = await import('@/app/api/jobs/[id]/start/route');
  const premature = await start(
    request(`/api/jobs/${jobId}/start`, 'contractor', {}),
    params
  );
  assert.equal(
    premature.status,
    400,
    'Work cannot start without before evidence'
  );

  const bytes = await syntheticWorkPhoto();
  const upload = async (
    phase: 'before' | 'after',
    angles: string[],
    role: 'owner' | 'contractor' = 'contractor'
  ) => {
    const form = new FormData();
    for (const angle of angles) {
      form.append(
        'photos',
        new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        `synthetic-${angle}.png`
      );
      form.append('angleTypes', angle);
    }
    const url = `/api/jobs/${jobId}/photos/${phase}`;
    const headers = new Headers(request(url, role, {}).headers);
    headers.delete('content-type');
    const uploadRequest = new NextRequest(`http://localhost${url}`, {
      method: 'POST',
      headers,
      body: form,
    });
    const handler =
      phase === 'before'
        ? (await import('@/app/api/jobs/[id]/photos/before/route')).POST
        : (await import('@/app/api/jobs/[id]/photos/after/route')).POST;
    return handler(uploadRequest, params);
  };
  const unauthorized = await upload('before', ['wide'], 'owner');
  assert.equal(
    unauthorized.status,
    403,
    'Only the assigned contractor can submit evidence'
  );
  await jsonSuccess(await upload('before', ['wide']), 'Before photo upload');
  await jsonSuccess(
    await start(request(`/api/jobs/${jobId}/start`, 'contractor', {}), params),
    'Start job'
  );
  const incomplete = await jsonSuccess(
    await upload('after', ['wide']),
    'First after photo'
  );
  assert.equal(
    incomplete.jobCompleted,
    false,
    'One photo must not satisfy category requirements'
  );
  const completed = await jsonSuccess(
    await upload('after', ['close-up', 'wide']),
    'Remaining after photos'
  );
  assert.equal(completed.jobCompleted, true);
  const job = await db
    .from('jobs')
    .select('status, completed_at')
    .eq('id', jobId)
    .single();
  assert.equal(job.error, null);
  assert.equal(job.data?.status, 'completed');
  assert.ok(job.data?.completed_at);
  const photos = await db
    .from('job_photos_metadata')
    .select('photo_type, verified, storage_path')
    .eq('job_id', jobId);
  assert.equal(photos.error, null);
  assert.equal(photos.data?.length, 4);
  assert.ok(
    photos.data?.every((photo) => photo.verified && photo.storage_path)
  );
}

/** Real handlers, Auth, Storage, Postgres and Stripe; no status/evidence fixtures. */
export async function verifySandboxCompletion(journey: SandboxJourney) {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:57321');
  assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
  const escrow = await escrowFor(journey.jobId);
  const { POST: release } =
    await import('@/app/api/payments/release-escrow/route');
  const body = {
    escrowTransactionId: escrow.id,
    releaseReason: 'job_completed',
    approveAndWaiveCoolingOff: true,
  };
  const params = { params: Promise.resolve({}) };
  const early = await release(
    journey.request('/api/payments/release-escrow', 'owner', body),
    params
  );
  assert.equal(
    early.status,
    403,
    'Payment cannot be released before completed work evidence'
  );
  assert.equal((await escrowFor(journey.jobId)).homeowner_approval, false);
  await completeWork(journey);
  const wrongRole = await release(
    journey.request('/api/payments/release-escrow', 'contractor', body),
    params
  );
  assert.equal(wrongRole.status, 403, 'Contractor cannot self-approve payment');
  const key = randomUUID();
  const releaseRequest = () => {
    const request = journey.request(
      '/api/payments/release-escrow',
      'owner',
      body
    );
    request.headers.set('idempotency-key', key);
    return request;
  };
  let transferId: string | undefined;
  try {
    const released = await jsonSuccess(
      await release(releaseRequest(), params),
      'Release payment'
    );
    transferId = released.transferId;
    assert.ok(transferId);
    const replay = await jsonSuccess(
      await release(releaseRequest(), params),
      'Release replay'
    );
    assert.equal(replay.transferId, transferId);
    const persisted = await escrowFor(journey.jobId);
    assert.equal(persisted.status, 'completed');
    assert.equal(persisted.transfer_id, transferId);
    assert.equal(persisted.homeowner_approval, true);
    const transfer = await stripe.transfers.retrieve(transferId);
    assert.equal(transfer.livemode, false);
    assert.equal(transfer.destination, journey.accountId);
    assert.equal(
      transfer.amount,
      Math.round(Number(persisted.contractor_payout) * 100)
    );
    const transfers = await stripe.transfers.list({
      destination: journey.accountId,
      limit: 100,
    });
    assert.equal(
      transfers.data.length,
      1,
      'Release retries must not duplicate contractor funds'
    );
  } finally {
    if (transferId)
      await stripe.transfers.createReversal(
        transferId,
        {},
        { idempotencyKey: `cleanup_${transferId}` }
      );
  }
}

export async function verifySandboxDispute(journey: SandboxJourney) {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:57321');
  assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
  await completeWork(journey);
  const escrow = await escrowFor(journey.jobId);
  const { POST: dispute } = await import('@/app/api/jobs/[id]/dispute/route');
  const disputeBody = {
    category: 'quality',
    reason: 'Synthetic readiness dispute: the agreed work needs correction.',
  };
  const disputed = await jsonSuccess(
    await dispute(
      journey.request(
        `/api/jobs/${journey.jobId}/dispute`,
        'owner',
        disputeBody
      ),
      { params: Promise.resolve({ id: journey.jobId }) }
    ),
    'File dispute'
  );
  assert.equal(disputed.escrowId, escrow.id);
  const { POST: release } =
    await import('@/app/api/payments/release-escrow/route');
  const blocked = await release(
    journey.request('/api/payments/release-escrow', 'owner', {
      escrowTransactionId: escrow.id,
      releaseReason: 'job_completed',
      approveAndWaiveCoolingOff: true,
    }),
    { params: Promise.resolve({}) }
  );
  assert.equal(blocked.status, 403, 'Dispute must stop payment release');
  assert.equal((await escrowFor(journey.jobId)).homeowner_approval, false);

  const admin = await createTestUser({ role: 'admin' });
  const auth = createAnonClient();
  const session = await auth.auth.signInWithPassword({
    email: admin.email,
    password: admin.password,
  });
  assert.equal(session.error, null);
  const { POST: resolve } =
    await import('@/app/api/admin/disputes/resolve/route');
  const resolution = {
    escrowId: escrow.id,
    decision: 'refund_homeowner',
    reason: 'Synthetic readiness test refund approved after review.',
  };
  const adminRequest = (cookie?: string) =>
    new NextRequest('http://localhost/api/admin/disputes/resolve', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.data.session!.access_token}`,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(resolution),
    });
  try {
    const missingMfa = await resolve(adminRequest(), {
      params: Promise.resolve({}),
    });
    assert.equal(missingMfa.status, 403);
    assert.equal((await missingMfa.json()).requiresStepUp, true);
    // Exercise real enrollment and code verification before issuing the same
    // signed proof used by the HTTP step-up route (no Next cookie context here).
    const enrollment = await MFAService.enrollTOTP(admin.id);
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(enrollment.secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    assert.equal(
      (await MFAService.verifyTOTPEnrollment(admin.id, totp.generate()))
        .success,
      true
    );
    assert.equal(
      (
        await MFAService.verifyMFA(
          admin.id,
          enrollment.backupCodes[0],
          'backup_code'
        )
      ).success,
      true
    );
    const cookie = `mfa-stepup=${buildStepUpCookieValue(admin.id)}`;
    const settled = await jsonSuccess(
      await resolve(adminRequest(cookie), { params: Promise.resolve({}) }),
      'Admin dispute refund'
    );
    assert.equal(settled.status, 'completed');
    const replay = await jsonSuccess(
      await resolve(adminRequest(cookie), { params: Promise.resolve({}) }),
      'Dispute resolution replay'
    );
    assert.equal(replay.resolutionId, settled.resolutionId);
    const refunds = await stripe.refunds.list({
      payment_intent: escrow.payment_intent_id,
      limit: 100,
    });
    assert.equal(refunds.data.length, 1);
    assert.equal(refunds.data[0].status, 'succeeded');
    assert.equal(refunds.data[0].amount, 500);
    const persisted = await escrowFor(journey.jobId);
    assert.equal(persisted.status, 'refunded');
    const record = await db
      .from('disputes')
      .select('status')
      .eq('id', disputed.disputeRecordId)
      .single();
    assert.equal(record.error, null);
    assert.equal(record.data?.status, 'resolved');
    assert.equal(
      (
        await stripe.transfers.list({
          destination: journey.accountId,
          limit: 100,
        })
      ).data.length,
      0
    );
  } finally {
    await auth.auth.signOut();
  }
}
