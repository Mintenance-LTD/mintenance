import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
export async function testLaunchBilling({
  admin,
  as,
  check,
  uid,
  root,
  config,
}) {
  const contractor = uid(2);
  await admin.query(`
    UPDATE profiles SET stripe_customer_id='cus_contractor' WHERE id='${contractor}';
    CREATE TABLE help_article_views(id uuid DEFAULT gen_random_uuid(),user_id uuid,ip_address text);
    ALTER TABLE help_article_views ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Anyone can view help article view counts" ON help_article_views FOR SELECT USING(true);
    GRANT ALL ON help_article_views TO anon,authenticated,service_role;
    INSERT INTO help_article_views(ip_address) VALUES('192.0.2.1');
    CREATE TABLE contractor_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contractor_id uuid REFERENCES profiles(id),stripe_customer_id text,stripe_subscription_id text UNIQUE,
      stripe_price_id text,plan_type text,plan_name text,status text CHECK(status IN ('free','trial','active','past_due','canceled','expired','unpaid')),
      amount numeric,currency text,created_at timestamptz DEFAULT now(),updated_at timestamptz,
      canceled_at timestamptz,current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean);
    ALTER TABLE contractor_subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_cs ON contractor_subscriptions FOR ALL USING(true) WITH CHECK(true);
    GRANT ALL ON contractor_subscriptions TO anon,authenticated,service_role;
  `);
  await admin.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261029204149_launch_privacy_and_contractor_billing.sql'
      ),
      'utf8'
    )
  );
  for (const role of ['anon', 'authenticated'])
    await check(
      `launch: ${role} raw analytics and billing writes denied`,
      async () => {
        for (const sql of [
          'SELECT * FROM help_article_views',
          "INSERT INTO contractor_subscriptions(status) VALUES('active')",
          `SELECT reserve_contractor_subscription('${contractor}','cus_contractor','professional','yearly')`,
        ])
          await assert.rejects(as(role, sql), (e) => e.code === '42501');
      }
    );
  const reserve = `SELECT reserve_contractor_subscription('${contractor}','cus_contractor','professional','yearly') result`;
  let row;
  await check(
    'launch: concurrent checkout reservations reuse one unpaid annual row',
    async () => {
      const clients = [new pg.Client(config), new pg.Client(config)];
      try {
        for (const c of clients) {
          await c.connect();
          await c.query('SET ROLE service_role');
        }
        const result = await Promise.all(clients.map((c) => c.query(reserve)));
        row = result[0].rows[0].result;
        assert.equal(row.id, result[1].rows[0].result.id);
        assert.equal(row.status, 'unpaid');
        assert.equal(Number(row.amount), 290);
        assert.equal(row.billing_cycle, 'yearly');
      } finally {
        await Promise.all(clients.map((c) => c.end()));
      }
    }
  );
  await check(
    'launch: a different pending plan/customer is rejected',
    async () => {
      await assert.rejects(
        as('service_role', reserve.replace('professional', 'enterprise'))
      );
      await assert.rejects(
        as('service_role', reserve.replace('cus_contractor', 'cus_wrong'))
      );
    }
  );
  const state = {
    status: 'active',
    plan_type: 'professional',
    plan_name: 'Professional',
    billing_cycle: 'yearly',
    amount: 290,
    currency: 'gbp',
    stripe_price_id: 'price_year',
  };
  const sync = (payload) =>
    as(
      'service_role',
      `SELECT sync_contractor_subscription('${contractor}','sub_new','cus_contractor','${JSON.stringify(payload)}'::jsonb) result`
    );
  await check(
    'launch: unlinked provider state cannot grant entitlement',
    async () => {
      await assert.rejects(sync(state));
    }
  );
  await admin.query(
    "UPDATE contractor_subscriptions SET stripe_subscription_id='sub_new' WHERE id=$1",
    [row.id]
  );
  await check(
    'launch: verified provider state synchronizes annual amount and entitlement',
    async () => {
      await sync(state);
      assert.equal(
        (
          await admin.query(
            'SELECT subscription_status FROM profiles WHERE id=$1',
            [contractor]
          )
        ).rows[0].subscription_status,
        'active'
      );
      await sync({ ...state, status: 'canceled' });
      const stale = await sync(state);
      assert.equal(stale.rows[0].result.current, false);
      assert.equal(
        (
          await admin.query(
            'SELECT subscription_status FROM profiles WHERE id=$1',
            [contractor]
          )
        ).rows[0].subscription_status,
        'none'
      );
    }
  );
  await check(
    'launch: a new attempt after cancellation gets a new reservation',
    async () => {
      const next = (await as('service_role', reserve)).rows[0].result;
      assert.notEqual(next.id, row.id);
    }
  );
  await check(
    'launch: restored grants cannot expose raw visitor data or billing writes',
    async () => {
      await admin.query(
        'GRANT ALL ON help_article_views,contractor_subscriptions TO authenticated'
      );
      assert.equal(
        (await as('authenticated', 'SELECT * FROM help_article_views'))
          .rowCount,
        0
      );
      await assert.rejects(
        as(
          'authenticated',
          "INSERT INTO contractor_subscriptions(status) VALUES('active')"
        ),
        (e) => e.code === '42501'
      );
      assert.equal(
        (await as('service_role', 'SELECT * FROM help_article_views')).rowCount,
        1
      );
    }
  );
}
