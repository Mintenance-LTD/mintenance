// Read-only provider evidence. Usage: node scripts/billing-production-evidence.mjs <env-file> <local-db-snapshot> <output-file>
// Input/output are private local audit artifacts, never committed customer data.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const env = await fs.readFile(process.argv[2], 'utf8');
const key = env.match(/^STRIPE_SECRET_KEY\s*=\s*["']?(sk_live_[^\s"']+)/m)?.[1];
assert(key, 'A live read credential is required');
const snapshot = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
const testKey = env.match(
  /^STRIPE_TEST_SECRET_KEY\s*=\s*["']?(sk_test_[^\s"']+)/m
)?.[1];
async function get(endpoint, credential = key) {
  const response = await fetch('https://api.stripe.com/v1/' + endpoint, {
    headers: { Authorization: 'Bearer ' + credential },
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok)
    return {
      httpStatus: response.status,
      errorCode: body.error?.code ?? body.error?.type,
    };
  return body;
}
const account = await get('account'),
  balance = await get('balance');
assert.equal(account.id, 'acct_1SDXwDJZfKi2oDP6');
assert.equal(balance.livemode, true);
const result = {
  account: account.id,
  livemode: true,
  capturedAt: new Date().toISOString(),
  escrows: [],
  subscriptions: [],
};
if (testKey) {
  const testAccount = await get('account', testKey),
    testBalance = await get('balance', testKey);
  assert.equal(testAccount.id, account.id);
  assert.equal(testBalance.livemode, false);
}
const fields = (o, names) =>
  Object.fromEntries(names.map((k) => [k, o?.[k] ?? null]));
for (const row of snapshot.escrows) {
  const intent = await get(
    'payment_intents/' +
      encodeURIComponent(row.payment_intent_id) +
      '?expand[]=latest_charge'
  );
  const charge =
    typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const refunds = charge
    ? await get(
        'refunds?charge=' + encodeURIComponent(charge.id) + '&limit=100'
      )
    : null;
  const transfers = row.transfer_id
    ? await get('transfers/' + encodeURIComponent(row.transfer_id))
    : null;
  const alternate =
    intent.errorCode === 'resource_missing' &&
    testKey &&
    row.payment_intent_id !== 'pi_test_simulated'
      ? await get(
          'payment_intents/' + encodeURIComponent(row.payment_intent_id),
          testKey
        )
      : null;
  result.escrows.push({
    local: row,
    provider: fields(intent, [
      'id',
      'livemode',
      'status',
      'amount',
      'amount_received',
      'currency',
      'customer',
      'metadata',
      'httpStatus',
      'errorCode',
    ]),
    alternateTestMode: alternate
      ? fields(alternate, [
          'id',
          'livemode',
          'status',
          'amount_received',
          'currency',
          'metadata',
          'httpStatus',
          'errorCode',
        ])
      : null,
    charge: charge
      ? fields(charge, [
          'id',
          'livemode',
          'paid',
          'captured',
          'disputed',
          'amount',
          'amount_refunded',
          'refunded',
          'currency',
          'transfer',
          'balance_transaction',
        ])
      : null,
    refunds: refunds
      ? {
          hasMore: refunds.has_more,
          items: refunds.data?.map((r) =>
            fields(r, ['id', 'amount', 'status', 'payment_intent', 'charge'])
          ),
          errorCode: refunds.errorCode,
        }
      : null,
    transfer: transfers
      ? fields(transfers, [
          'id',
          'amount',
          'currency',
          'destination',
          'reversed',
          'amount_reversed',
          'source_transaction',
          'httpStatus',
          'errorCode',
        ])
      : null,
  });
}
for (const row of snapshot.subscriptions) {
  const sub = await get(
    'subscriptions/' + encodeURIComponent(row.stripe_subscription_id)
  );
  const invoices = await get(
    'invoices?subscription=' +
      encodeURIComponent(row.stripe_subscription_id) +
      '&limit=100'
  );
  result.subscriptions.push({
    local: row,
    provider: fields(sub, [
      'id',
      'livemode',
      'status',
      'customer',
      'metadata',
      'cancel_at_period_end',
      'canceled_at',
      'httpStatus',
      'errorCode',
    ]),
    items: sub.items?.data.map((i) => ({
      price: i.price.id,
      amount: i.price.unit_amount,
      currency: i.price.currency,
      interval: i.price.recurring?.interval,
    })),
    invoices: {
      hasMore: invoices.has_more,
      errorCode: invoices.errorCode,
      items: invoices.data?.map((i) =>
        fields(i, [
          'id',
          'livemode',
          'status',
          'amount_due',
          'amount_paid',
          'amount_remaining',
          'currency',
          'customer',
          'charge',
          'payment_intent',
          'created',
        ])
      ),
    },
  });
}
result.customerInventories = [];
for (const id of [
  ...new Set(
    snapshot.subscriptions
      .flatMap((s) => [s.stripe_customer_id, s.profile_customer_id])
      .filter(Boolean)
  ),
]) {
  const customer = await get('customers/' + encodeURIComponent(id));
  const subscriptions = await get(
    'subscriptions?customer=' + encodeURIComponent(id) + '&status=all&limit=100'
  );
  const charges = await get(
    'charges?customer=' + encodeURIComponent(id) + '&limit=100'
  );
  result.customerInventories.push({
    customer: id,
    customerEvidence: fields(customer, [
      'id',
      'livemode',
      'metadata',
      'deleted',
      'httpStatus',
      'errorCode',
    ]),
    subscriptions: {
      hasMore: subscriptions.has_more,
      errorCode: subscriptions.errorCode,
      items: subscriptions.data?.map((s) =>
        fields(s, ['id', 'livemode', 'status', 'metadata', 'created'])
      ),
    },
    charges: {
      hasMore: charges.has_more,
      errorCode: charges.errorCode,
      items: charges.data?.map((c) =>
        fields(c, [
          'id',
          'livemode',
          'status',
          'paid',
          'amount',
          'amount_refunded',
          'currency',
          'invoice',
          'payment_intent',
          'created',
        ])
      ),
    },
  });
}
await fs.writeFile(process.argv[4], JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    accountVerified: true,
    liveMode: true,
    escrows: result.escrows.map((e) => ({
      record: e.local.id.slice(0, 8),
      providerStatus: e.provider.status,
      error: e.provider.errorCode,
      received: e.provider.amount_received,
    })),
    subscriptions: result.subscriptions.map((s) => ({
      record: s.local.id.slice(0, 8),
      providerStatus: s.provider.status,
      error: s.provider.errorCode,
      invoiceCount: s.invoices.items?.length,
      paidPence: s.invoices.items?.reduce((a, i) => a + i.amount_paid, 0),
    })),
  })
);
