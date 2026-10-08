import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

export async function testHomeownerSubscriptions({
  admin,
  as,
  check,
  uid,
  root,
  config,
}) {
  const owner = uid(1),
    old = uid(201),
    current = uid(202);
  await admin.query(`
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text, ADD COLUMN subscription_status text, ADD COLUMN updated_at timestamptz;
    UPDATE profiles SET stripe_customer_id='cus_fixture' WHERE id='${owner}';
    CREATE TABLE homeowner_subscriptions(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homeowner_id uuid REFERENCES profiles(id),
      stripe_subscription_id text UNIQUE, stripe_customer_id text, stripe_price_id text,
      plan_type text CHECK(plan_type IN ('landlord','agency')), plan_name text,
      status text CHECK(status IN ('incomplete','active','past_due','unpaid','canceled','expired','trial')),
      amount numeric, currency text, current_period_start timestamptz,current_period_end timestamptz,
      cancel_at_period_end boolean,canceled_at timestamptz,metadata jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz);
    CREATE UNIQUE INDEX homeowner_current_unique ON homeowner_subscriptions(homeowner_id)
      WHERE status IN ('incomplete','active','past_due','unpaid','trial');
    ALTER TABLE homeowner_subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_billing ON homeowner_subscriptions FOR ALL USING(true) WITH CHECK(true);
    GRANT ALL ON homeowner_subscriptions TO anon,authenticated,service_role;
    INSERT INTO homeowner_subscriptions(id,homeowner_id,stripe_subscription_id,stripe_customer_id,plan_type,status,created_at)
      VALUES('${old}','${owner}','sub_old','cus_fixture','landlord','canceled',now()-interval '1 day'),
      ('${current}','${owner}','sub_current','cus_fixture','landlord','incomplete',now());
  `);
  await admin.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261007234517_homeowner_subscription_transitions.sql'
      ),
      'utf8'
    )
  );
  const state = {
    status: 'active',
    stripe_price_id: 'price_fixture',
    plan_type: 'agency',
    plan_name: 'Homeowner Agency',
    amount: 49.99,
    currency: 'gbp',
    metadata: { billingCycle: 'monthly' },
  };
  const sync = (
    sub = 'sub_current',
    payload = state,
    customer = 'cus_fixture',
    role = 'service_role'
  ) =>
    as(
      role,
      `SELECT sync_homeowner_subscription('${owner}','${sub}','${customer}','${JSON.stringify(payload)}'::jsonb)`
    );
  await check(
    'billing: clients cannot mutate billing records or invoke provider sync',
    async () => {
      for (const role of ['anon', 'authenticated']) {
        await assert.rejects(
          as(
            role,
            "INSERT INTO homeowner_subscriptions(status) VALUES('active')"
          ),
          (e) => e.code === '42501'
        );
        await assert.rejects(
          as(role, "UPDATE homeowner_subscriptions SET status='active'"),
          (e) => e.code === '42501'
        );
        await assert.rejects(
          as(role, 'DELETE FROM homeowner_subscriptions'),
          (e) => e.code === '42501'
        );
        await assert.rejects(
          sync('sub_current', state, 'cus_fixture', role),
          (e) => e.code === '42501'
        );
      }
    }
  );
  await check(
    'billing: unique current subscription reservation rejects competing purchase',
    async () => {
      await assert.rejects(
        as(
          'service_role',
          `INSERT INTO homeowner_subscriptions(homeowner_id,plan_type,status) VALUES('${owner}','landlord','incomplete')`
        ),
        (e) => e.code === '23505'
      );
    }
  );
  await check(
    'billing: simultaneous first purchases have exactly one reservation winner',
    async () => {
      const a = new pg.Client(config),
        b = new pg.Client(config);
      await a.connect();
      await b.connect();
      try {
        for (const client of [a, b]) {
          await client.query('BEGIN');
          await client.query('SET LOCAL ROLE service_role');
          await client.query("SET LOCAL statement_timeout='5s'");
        }
        const sql = `INSERT INTO homeowner_subscriptions(homeowner_id,plan_type,status) VALUES('${uid(2)}','landlord','incomplete')`;
        await a.query(sql);
        const pending = b.query(sql).then(
          () => null,
          (error) => error
        );
        await a.query('COMMIT');
        assert.equal((await pending)?.code, '23505');
        await b.query('ROLLBACK');
        assert.equal(
          Number(
            (
              await admin.query(
                `SELECT count(*) FROM homeowner_subscriptions WHERE homeowner_id='${uid(2)}'`
              )
            ).rows[0].count
          ),
          1
        );
      } finally {
        await a.end();
        await b.end();
      }
    }
  );
  await check(
    'billing: provider sync atomically updates tier and profile status',
    async () => {
      await sync();
      assert.equal(
        (
          await admin.query(
            `SELECT plan_type FROM homeowner_subscriptions WHERE id='${current}'`
          )
        ).rows[0].plan_type,
        'agency'
      );
      assert.equal(
        (
          await admin.query(
            `SELECT subscription_status FROM profiles WHERE id='${owner}'`
          )
        ).rows[0].subscription_status,
        'active'
      );
    }
  );
  await check(
    'billing: historical activation and deletion cannot change current access',
    async () => {
      await sync('sub_old');
      await sync('sub_old', { ...state, status: 'canceled' });
      assert.equal(
        (
          await admin.query(
            `SELECT status FROM homeowner_subscriptions WHERE id='${old}'`
          )
        ).rows[0].status,
        'canceled'
      );
      assert.equal(
        (
          await admin.query(
            `SELECT subscription_status FROM profiles WHERE id='${owner}'`
          )
        ).rows[0].subscription_status,
        'active'
      );
    }
  );
  await check(
    'billing: customer mismatch and unlinked provider events fail closed',
    async () => {
      await assert.rejects(
        sync('sub_current', state, 'cus_wrong'),
        /customer mismatch/
      );
      await assert.rejects(sync('sub_unlinked'), /not linked/);
    }
  );
  await check(
    'billing: invalid provider state rolls back the complete transaction',
    async () => {
      await assert.rejects(
        sync('sub_current', { ...state, status: 'unsupported' }),
        (e) => e.code === '23514'
      );
      assert.equal(
        (
          await admin.query(
            `SELECT subscription_status FROM profiles WHERE id='${owner}'`
          )
        ).rows[0].subscription_status,
        'active'
      );
    }
  );
  await check(
    'billing: current cancellation ends access and frees a new reservation',
    async () => {
      await sync('sub_current', { ...state, status: 'canceled' });
      assert.equal(
        (
          await admin.query(
            `SELECT subscription_status FROM profiles WHERE id='${owner}'`
          )
        ).rows[0].subscription_status,
        'none'
      );
      await sync('sub_current', state);
      assert.equal(
        (
          await admin.query(
            `SELECT subscription_status FROM profiles WHERE id='${owner}'`
          )
        ).rows[0].subscription_status,
        'none'
      );
      await as(
        'service_role',
        `INSERT INTO homeowner_subscriptions(homeowner_id,plan_type,status) VALUES('${owner}','landlord','incomplete')`
      );
    }
  );
  await check(
    'billing: restored grants cannot bypass restrictive mutation policies',
    async () => {
      await admin.query(
        'GRANT INSERT,UPDATE,DELETE ON homeowner_subscriptions TO authenticated'
      );
      await assert.rejects(
        as(
          'authenticated',
          "INSERT INTO homeowner_subscriptions(status) VALUES('active')"
        ),
        (e) => e.code === '42501'
      );
      assert.equal(
        (
          await as(
            'authenticated',
            "UPDATE homeowner_subscriptions SET status='active'"
          )
        ).rowCount,
        0
      );
      assert.equal(
        (await as('authenticated', 'DELETE FROM homeowner_subscriptions'))
          .rowCount,
        0
      );
    }
  );
}
