// Audit-only harness: reuse existing mocks; exercise unchanged production routes.
const fs = require('fs');
const source = fs.readFileSync('apps/web/__tests__/api/payments/create-intent-concurrent-dedup.test.ts', 'utf8');
let harness = source.slice(0, source.indexOf("  it('two CONCURRENT"));
harness = harness.replace('singleData?: unknown;', 'singleData?: unknown; listData?: () => unknown;');
harness = harness.replace('{ data: [], count: 0, error: null }\n    ).then(resolve)', '{ data: overrides?.listData?.() ?? [], count: 0, error: null }\n    ).then(resolve)');
harness = harness.replace('onInsert: (row) => {\n          escrowInserts.push(row);', 'listData: () => escrowInserts,\n        onInsert: (row) => {\n          escrowInserts.push(row);');
harness += `
  it('AUDIT: a completed create request cannot replay after its escrow insert is visible', async () => {
    const first = await callRoute(makeHeaderlessRequest());
    expect(first.status).toBe(200);
    const second = await callRoute(makeHeaderlessRequest());
    expect(second.status).toBe(400); // observed defect; repaired acceptance criterion: 200 and same secret
    expect(await second.json()).toMatchObject({error: 'A payment is already in progress for this job. Please wait a moment and refresh.'});
    expect(mocks.stripePaymentIntentsCreate).toHaveBeenCalledTimes(1);
  });
  it('AUDIT: supplied keys collide across users and resources', () => {
    const r = makeHeaderlessRequest();
    r.headers.set('Idempotency-Key', 'shared-client-key');
    expect(getDeterministicIdempotencyKeyFromRequest(r, 'create_payment_intent', 'user-a', 'job-a'))
      .toBe(getDeterministicIdempotencyKeyFromRequest(r, 'create_payment_intent', 'user-b', 'job-b'));
  });
  it('AUDIT: cache hit can return another payer payment secret for an otherwise valid job', async () => {
    claimStore.set('shared-client-key', {status: 'completed', result: {clientSecret: 'synthetic_other_payer_secret', paymentIntentId: 'pi_other'}});
    const r = makeHeaderlessRequest();
    r.headers.set('Idempotency-Key', 'shared-client-key');
    const response = await callRoute(r);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({clientSecret: 'synthetic_other_payer_secret'});
    expect(mocks.stripePaymentIntentsCreate).not.toHaveBeenCalled();
  });
  it('AUDIT: a 50 GBP referral credit reduces the contractor escrow principal from 500 to 450', async () => {
    mocks.spendCredit.mockResolvedValue(5000);
    const response = await callRoute(makeHeaderlessRequest());
    expect(response.status).toBe(200);
    expect(escrowInserts[0]).toMatchObject({amount: 450, metadata: {credit_applied_pence: 5000}});
    expect(mocks.stripePaymentIntentsCreate.mock.calls[0][0].amount).toBe(45000);
  });
});
`;
fs.mkdirSync('apps/web/__tests__/audit', {recursive:true});
fs.writeFileSync('apps/web/__tests__/audit/readiness-payment-diagnostics.test.ts', harness);
