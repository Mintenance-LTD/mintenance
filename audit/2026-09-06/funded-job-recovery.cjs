// Synthetic local HTTP role matrix. Does not load deployment credentials or send invitations.
const fs = require('fs'),
  { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const keys = fs
  .readFileSync('apps/web/test/integration/supabase-test-client.ts', 'utf8')
  .match(/eyJ[^'\s]+/g);
const service = createClient('http://127.0.0.1:55321', keys[1], {
  auth: { persistSession: false, autoRefreshToken: false },
});
const web = process.env.AUDIT_WEB_URL || 'http://localhost:3017',
  property = randomUUID(),
  users = [];
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(web))
  throw new Error('Local audit server required');
const bearerMode = process.argv.includes('--bearer');
function check(ok, message) {
  if (!ok) throw new Error(message);
}
function db(result) {
  if (result.error)
    throw new Error('Local fixture failed: ' + result.error.code);
  return result.data;
}
async function actorAccount(role = 'homeowner') {
  const email = `manager_${randomUUID()}@example.invalid`,
    password = `Aa1!${randomUUID()}`;
  const user = db(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  ).user;
  users.push(user.id);
  db(
    await service
      .from('profiles')
      .update({ role, first_name: 'Synthetic', last_name: 'Audit' })
      .eq('id', user.id)
  );
  const jar = new Map();
  let accessToken;
  async function request(path, method = 'GET', body) {
    const response = await fetch(web + path, {
      method,
      headers: {
        origin: web,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
        'x-csrf-token': jar.get('csrf-token') || '',
        ...(body instanceof FormData
          ? {}
          : { 'content-type': 'application/json' }),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(90000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const part = cookie.split(';')[0],
        index = part.indexOf('=');
      jar.set(part.slice(0, index), part.slice(index + 1));
    }
    return {
      status: response.status,
      data: await response.json().catch(() => null),
    };
  }
  if (bearerMode) {
    const client = createClient('http://127.0.0.1:55321', keys[0], {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    accessToken = db(await client.auth.signInWithPassword({ email, password }))
      .session?.access_token;
    check(accessToken, 'Synthetic provider sign-in failed');
    return { id: user.id, email, request };
  }
  await request('/api/csrf');
  let login = await request('/api/auth/login', 'POST', { email, password });
  check(login.status === 200, 'Synthetic role login failed: ' + login.status);
  return { id: user.id, email, request };
}

const assert = require('assert/strict'),
  dotenv = require('dotenv'),
  { spawnSync } = require('child_process');
const Stripe = require(
  require('module')
    .createRequire(require('path').resolve('apps/web/package.json'))
    .resolve('stripe')
);
const cfg = dotenv.parse(fs.readFileSync('apps/web/.env.test'));
assert(cfg.STRIPE_SECRET_KEY.startsWith('sk_test_'));
const stripe = new Stripe(cfg.STRIPE_SECRET_KEY, {
  timeout: 20000,
  maxNetworkRetries: 1,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const job = randomUUID(),
  disabled = [];
let jobId, uploadPath, account, intent, transfer, fundingCharge;
let stage = 'isolation';
function sql(statement) {
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_mintenance-audit-20260906',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: statement, encoding: 'utf8', windowsHide: true }
  );
  if (r.status !== 0) throw Error('Isolated fault SQL failed');
}
function fault(status) {
  assert.match(jobId, /^[0-9a-f-]{36}$/);
  assert(['held', 'completed'].includes(status));
  sql(
    `CREATE OR REPLACE FUNCTION public.audit_gate_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.job_id='${jobId}'::uuid AND NEW.status='${status}' THEN RAISE EXCEPTION 'Synthetic gate fault'; END IF; RETURN NEW; END $$; REVOKE ALL ON FUNCTION public.audit_gate_fault() FROM PUBLIC; DROP TRIGGER IF EXISTS audit_gate_fault ON public.escrow_transactions; CREATE TRIGGER audit_gate_fault BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_gate_fault();`
  );
}
function clearFault() {
  sql(
    'DROP TRIGGER IF EXISTS audit_gate_fault ON public.escrow_transactions; DROP FUNCTION IF EXISTS public.audit_gate_fault();'
  );
}
(async () => {
  try {
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    assert(!endpoints.has_more);
    for (const ep of endpoints.data) {
      assert.equal(ep.livemode, false);
      if (ep.status !== 'enabled') continue;
      assert.equal(new URL(ep.url).hostname, 'web-nu-six-10.vercel.app');
      disabled.push(ep.id);
      await stripe.webhookEndpoints.update(ep.id, { disabled: true });
      assert.equal(
        (await stripe.webhookEndpoints.retrieve(ep.id)).status,
        'disabled'
      );
    }
    console.log('Hosted sandbox webhook isolated; no live-mode actions.');
    stage = 'connect';
    account = await stripe.accounts.create({
      type: 'custom',
      country: 'GB',
      business_type: 'individual',
      email: 'audit-' + job + '@example.invalid',
      business_profile: { mcc: '1520', url: 'https://mintenance.co.uk' },
      individual: {
        first_name: 'Synthetic',
        last_name: 'Contractor',
        email: 'audit-' + job + '@example.invalid',
        phone: '+447700900077',
        dob: { day: 1, month: 1, year: 1902 },
        address: {
          line1: 'address_full_match',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'GB',
        },
        verification: { document: { front: 'file_identity_document_success' } },
      },
      external_account: {
        object: 'bank_account',
        country: 'GB',
        currency: 'gbp',
        routing_number: '108800',
        account_number: '00012345',
      },
      tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      settings: { payouts: { schedule: { interval: 'manual' } } },
      metadata: { audit_run: job },
    });
    for (let i = 0; i < 150; i++) {
      account = await stripe.accounts.retrieve(account.id);
      if (
        account.payouts_enabled &&
        account.capabilities.transfers === 'active'
      )
        break;
      await sleep(2000);
    }
    console.log(
      JSON.stringify({
        check: 'synthetic-readiness',
        payoutsEnabled: account.payouts_enabled,
        transfers: account.capabilities.transfers,
        due: account.requirements.currently_due,
        pending: account.requirements.pending_verification,
        reason: account.requirements.disabled_reason,
      })
    );
    assert(account.payouts_enabled);
    assert.equal(account.capabilities.transfers, 'active');

    const owner = await actorAccount(),
      contractor = await actorAccount('contractor'),
      unrelated = await actorAccount();
    // Baseline onboarding fixture only: no provider call or claim of payout verification.
    db(
      await service
        .from('profiles')
        .update({
          verification_status: 'verified',
          stripe_connect_account_id: account.id,
          stripe_payouts_enabled: true,
          stripe_transfers_active: true,
        })
        .eq('id', contractor.id)
    );
    db(
      await service.rpc('initialize_trial_period', {
        p_contractor_id: contractor.id,
      })
    );
    const photo = await require('sharp')({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 80, g: 150, b: 120 },
      },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set('file', new Blob([photo], { type: 'image/png' }), 'synthetic.png');
    const upload = await owner.request('/api/upload', 'POST', form);
    check(upload.status === 200, 'Photo upload failed: ' + upload.status);
    uploadPath = upload.data.path;
    const createdJob = await owner.request('/api/jobs', 'POST', {
      title: 'Repair kitchen tap',
      description:
        'Synthetic acceptance test: repair a leaking kitchen tap and test the water supply.',
      photoUrls: [
        upload.data.url.replace(
          'http://127.0.0.1:55321',
          process.env.AUDIT_STORAGE_ORIGIN || 'http://127.0.0.1:55321'
        ),
      ],
      category: 'plumbing',
      budget: 100,
      location: 'Synthetic test property',
    });
    check(
      createdJob.status === 201,
      'Create job failed: ' +
        createdJob.status +
        ' ' +
        JSON.stringify(createdJob.data)
    );
    jobId = createdJob.data.job.id;
    console.log('PASS: homeowner creates job through API');
    const bid = await contractor.request('/api/contractor/submit-bid', 'POST', {
      jobId,
      bidAmount: 100,
      proposalText:
        'I will replace the worn tap washer, check the connections and test for leaks after the repair.',
      estimatedDuration: 1,
    });
    check(
      bid.status === 201,
      'Submit bid failed: ' + bid.status + ' ' + JSON.stringify(bid.data)
    );
    const bids = db(
      await service.from('bids').select('id').eq('job_id', jobId)
    );
    check(bids.length === 1, 'Expected one real submitted bid');
    const acceptPath = '/api/jobs/' + jobId + '/bids/' + bids[0].id + '/accept';
    check(
      [403, 404].includes(
        (await unrelated.request(acceptPath, 'POST', {})).status
      ),
      'Unrelated user accepted bid'
    );
    const accepted = await owner.request(acceptPath, 'POST', {});
    check(
      accepted.status === 200,
      'Accept bid failed: ' +
        accepted.status +
        ' ' +
        JSON.stringify(accepted.data)
    );
    check(
      (await owner.request(acceptPath, 'POST', {})).status === 200,
      'Acceptance retry failed'
    );
    const contracts = db(
      await service
        .from('contracts')
        .select('id,status,amount')
        .eq('job_id', jobId)
    );
    check(
      contracts.length === 1,
      'Acceptance did not create exactly one contract'
    );
    const id = contracts[0].id;
    check(
      [403, 404].includes(
        (
          await unrelated.request(
            '/api/contracts/' + id + '/accept',
            'POST',
            {}
          )
        ).status
      ),
      'Unrelated user signed'
    );
    for (const actor of [owner, contractor]) {
      const signed = await actor.request(
        '/api/contracts/' + id + '/accept',
        'POST',
        {}
      );
      check(
        signed.status === 200,
        'Sign failed: ' + signed.status + ' ' + JSON.stringify(signed.data)
      );
    }
    const persisted = db(
      await service
        .from('contracts')
        .select('status,homeowner_signed_at,contractor_signed_at,amount')
        .eq('id', id)
        .single()
    );
    check(
      persisted.status === 'accepted' &&
        persisted.homeowner_signed_at &&
        persisted.contractor_signed_at &&
        Number(persisted.amount) === 100,
      'Dual signature not persisted'
    );

    stage = 'funding';
    fundingCharge = await stripe.charges.create(
      {
        amount: 50000,
        currency: 'gbp',
        source: 'tok_bypassPending',
        metadata: { audit_run: job },
        description: 'Synthetic recovery test balance',
      },
      { idempotencyKey: 'fund-' + job }
    );
    assert.equal(fundingCharge.livemode, false);
    const payload = {
      jobId,
      contractorId: contractor.id,
      amount: 1,
      currency: 'gbp',
    };
    assert.equal(
      (await unrelated.request('/api/payments/create-intent', 'POST', payload))
        .status,
      403
    );
    const created = await owner.request(
      '/api/payments/create-intent',
      'POST',
      payload
    );
    assert.equal(created.status, 200);
    intent = created.data.paymentIntentId;
    assert(intent);
    const pi = await stripe.paymentIntents.retrieve(intent);
    assert.equal(pi.livemode, false);
    assert.equal(pi.amount, 10000);
    assert.equal(
      (await owner.request('/api/payments/create-intent', 'POST', payload)).data
        .paymentIntentId,
      intent
    );
    fault('held');
    assert.equal(
      (
        await stripe.paymentIntents.confirm(intent, {
          payment_method: 'pm_card_visa',
          return_url: 'http://localhost:3018/dashboard',
        })
      ).status,
      'succeeded'
    );
    const failedConfirm = await owner.request(
      '/api/payments/confirm-intent',
      'POST',
      { jobId, paymentIntentId: intent }
    );
    assert(failedConfirm.status >= 400);
    const pending = db(
      await service
        .from('escrow_transactions')
        .select('id,status')
        .eq('job_id', jobId)
        .single()
    );
    assert.notEqual(pending.status, 'held');
    clearFault();
    const healed = await owner.request('/api/payments/confirm-intent', 'POST', {
      jobId,
      paymentIntentId: intent,
    });
    assert.equal(healed.status, 200);
    const escrow = db(
      await service
        .from('escrow_transactions')
        .select('id,status')
        .eq('job_id', jobId)
        .single()
    );
    assert.equal(escrow.status, 'held');
    console.log(
      'PASS: actual provider success with failed funding DB transition recovers on confirmation retry; same intent, authorized server amount.'
    );
    stage = 'work evidence';
    const sharp = require('sharp');
    const pixels = Buffer.alloc(800 * 600 * 3);
    for (let i = 0; i < pixels.length; i++)
      pixels[i] =
        ((Math.floor(i / 3) % 800) + Math.floor(i / (800 * 3))) % 2 ? 240 : 40;
    const evidence = await sharp(pixels, {
      raw: { width: 800, height: 600, channels: 3 },
    })
      .png()
      .toBuffer();
    function photos() {
      const form = new FormData();
      for (const angle of ['wide', 'close-up', 'detail']) {
        form.append(
          'photos',
          new Blob([evidence], { type: 'image/png' }),
          angle + '.png'
        );
        form.append('angleTypes', angle);
      }
      return form;
    }
    const before = await contractor.request(
      '/api/jobs/' + jobId + '/photos/before',
      'POST',
      photos()
    );
    assert.equal(before.status, 200);
    const started = await contractor.request(
      '/api/jobs/' + jobId + '/start',
      'POST',
      {}
    );
    assert.equal(started.status, 200);
    assert.equal(
      (await contractor.request('/api/jobs/' + jobId + '/complete', 'POST', {}))
        .status,
      400
    );
    const after = await contractor.request(
      '/api/jobs/' + jobId + '/photos/after',
      'POST',
      photos()
    );
    assert.equal(after.status, 200);
    let completed = db(
      await service
        .from('jobs')
        .select('status,completed_at')
        .eq('id', jobId)
        .single()
    );
    if (completed.status !== 'completed') {
      assert.equal(
        (
          await contractor.request(
            '/api/jobs/' + jobId + '/complete',
            'POST',
            {}
          )
        ).status,
        200
      );
      completed = db(
        await service
          .from('jobs')
          .select('status,completed_at')
          .eq('id', jobId)
          .single()
      );
    }
    assert.equal(completed.status, 'completed');
    assert.equal(
      (
        await unrelated.request(
          '/api/escrow/' + escrow.id + '/homeowner/approve',
          'POST',
          { completedAt: completed.completed_at }
        )
      ).status,
      403
    );
    // Use the real approve-and-release action; a separate approval intentionally starts a 48-hour cooling-off window.
    assert.equal(
      db(
        await service
          .from('escrow_transactions')
          .select('homeowner_approval')
          .eq('id', escrow.id)
          .single()
      ).homeowner_approval,
      false
    );
    console.log(
      'PASS: before evidence, funded start, missing-after denial, after evidence, completion through real APIs; approval will be committed by approve-and-release.'
    );
    stage = 'transfer recovery';
    fault('completed');
    const release = {
      escrowTransactionId: escrow.id,
      releaseReason: 'dispute_resolved',
      approveAndWaiveCoolingOff: true,
    };
    const failedRelease = await owner.request(
      '/api/payments/release-escrow',
      'POST',
      release
    );
    if (failedRelease.status !== 500)
      console.log({
        releaseStatus: failedRelease.status,
        message: failedRelease.data.error?.message || failedRelease.data.error,
      });
    assert.equal(failedRelease.status, 500);
    const transfers = await stripe.transfers.list({ destination: account.id });
    assert.equal(transfers.data.length, 1);
    transfer = transfers.data[0];
    assert.equal(transfer.livemode, false);
    const audit = db(
      await service
        .from('escrow_audit_log')
        .select('id')
        .eq('escrow_transaction_id', escrow.id)
        .eq('release_reason', 'transfer_succeeded_final_update_failed')
    );
    assert(audit.length > 0);
    clearFault();
    const retry = await owner.request(
      '/api/payments/release-escrow',
      'POST',
      release
    );
    assert.equal(retry.status, 200);
    assert.equal(
      (await stripe.transfers.list({ destination: account.id })).data.length,
      1
    );
    const final = db(
      await service
        .from('escrow_transactions')
        .select('status,contractor_payout')
        .eq('id', escrow.id)
        .single()
    );
    assert.equal(final.status, 'completed');
    assert.equal(
      transfer.amount,
      Math.round(Number(final.contractor_payout) * 100)
    );
    console.log(
      'PASS: provider transfer succeeds, final DB write fails with reconciliation evidence, retry settles the same transfer exactly once.'
    );
  } finally {
    clearFault();
    if (transfer) {
      try {
        await stripe.transfers.createReversal(transfer.id);
      } catch {
        console.log('Transfer cleanup requires review');
        process.exitCode = 1;
      }
    }
    if (fundingCharge) {
      try {
        await stripe.refunds.create(
          { charge: fundingCharge.id },
          { idempotencyKey: 'cleanup-fund-' + job }
        );
      } catch {
        console.log('Funding cleanup requires review');
        process.exitCode = 1;
      }
    }
    if (intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(intent);
        if (pi.status === 'succeeded')
          await stripe.refunds.create(
            { payment_intent: intent },
            { idempotencyKey: 'cleanup-' + job }
          );
        else if (pi.status !== 'canceled')
          await stripe.paymentIntents.cancel(intent);
      } catch {
        console.log('Intent cleanup requires review');
        process.exitCode = 1;
      }
    }
    if (account) {
      try {
        await stripe.accounts.del(account.id);
      } catch {
        console.log('Connect cleanup requires review');
        process.exitCode = 1;
      }
    }
    await sleep(3000);
    for (const id of disabled) {
      let done = false;
      for (let i = 0; i < 3 && !done; i++) {
        try {
          await stripe.webhookEndpoints.update(id, { disabled: false });
          done =
            (await stripe.webhookEndpoints.retrieve(id)).status === 'enabled';
        } catch {
          await sleep(1000);
        }
      }
      console.log(
        done
          ? 'Hosted sandbox webhook restored and verified.'
          : 'URGENT webhook restoration failed'
      );
      if (!done) process.exitCode = 1;
    }
    if (jobId) {
      const paths = db(
        await service
          .from('job_photos_metadata')
          .select('storage_path')
          .eq('job_id', jobId)
      )
        .map((x) => x.storage_path)
        .filter(Boolean);
      if (paths.length)
        db(await service.storage.from('Job-storage').remove(paths));
      const escrow = (
        await service
          .from('escrow_transactions')
          .select('id')
          .eq('job_id', jobId)
          .maybeSingle()
      ).data;
      if (escrow)
        db(
          await service
            .from('escrow_transfer_attempts')
            .delete()
            .eq('escrow_id', escrow.id)
        );
      for (const table of [
        'payment_funding_reservations',
        'escrow_transactions',
        'contracts',
        'bids',
      ])
        db(await service.from(table).delete().eq('job_id', jobId));
      db(await service.from('jobs').delete().eq('id', jobId));
    }
    if (uploadPath)
      db(await service.storage.from('job-attachments').remove([uploadPath]));
    db(await service.from('escrow_audit_log').delete().in('actor_id', users));
    for (const id of users) db(await service.auth.admin.deleteUser(id));
    console.log('Synthetic fixtures cleaned; diagnostic trigger removed.');
  }
})().catch((error) => {
  console.log(
    JSON.stringify({ result: 'FAIL', stage, message: error.message })
  );
  process.exitCode = 1;
});
