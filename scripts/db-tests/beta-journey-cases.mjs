import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
export async function testBetaJourney(db) {
  await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE profiles(id uuid PRIMARY KEY,first_name text,last_name text,deleted_at timestamptz);
 CREATE TABLE properties(id uuid PRIMARY KEY,property_name text,owner_id uuid);
 CREATE TABLE property_team_members(property_id uuid,user_id uuid,status text,role text);
 CREATE TABLE jobs(id uuid PRIMARY KEY,property_id uuid,homeowner_id uuid,contractor_id uuid,title text,status text,scheduled_start_date timestamptz,scheduled_end_date timestamptz);
 CREATE TABLE bids(id uuid PRIMARY KEY,status text,materials_included boolean DEFAULT true,warranty_months integer DEFAULT 12);
 CREATE TABLE contracts(id uuid PRIMARY KEY,terms jsonb,status text,homeowner_signed_at timestamptz,contractor_signed_at timestamptz);
 CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,status text);
 CREATE TABLE user_push_tokens(id uuid PRIMARY KEY,user_id uuid,push_token text,updated_at timestamptz);
 CREATE TABLE anonymous_reports(id uuid,property_id uuid,description text,status text,created_at timestamptz,urgency text);
 CREATE TABLE recurring_schedules(id uuid,property_id uuid,title text,next_due_date date,is_active boolean);
 CREATE TABLE compliance_certificates(id uuid,property_id uuid,cert_type text,status text,expiry_date date);
 CREATE TABLE property_action_followups(kind text,source_id uuid,property_id uuid,waiting_for text,due_at timestamptz,assigned_to uuid);
 GRANT USAGE ON SCHEMA public TO service_role,anon,authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;`);
  const actor = randomUUID(),
    other = randomUUID(),
    prop = randomUUID(),
    privateProp = randomUUID(),
    contract = randomUUID(),
    legacy = randomUUID(),
    bid = randomUUID(),
    escrow = randomUUID();
  await db.query(
    `INSERT INTO profiles(id,first_name) VALUES($1,'Alex'),($2,'Other');`,
    [actor, other]
  );
  await db.query(
    `INSERT INTO properties VALUES($1,'Accessible',$2),($3,'Private',$4)`,
    [prop, actor, privateProp, other]
  );
  await db.query(
    `INSERT INTO contracts VALUES($1,'{"warranty_months":12}','pending',NULL,NULL),($2,'{"legacy":true}','pending',NULL,now())`,
    [contract, legacy]
  );
  await db.query(
    `INSERT INTO user_push_tokens VALUES($1,$2,'device',now()-interval '1 day'),($3,$4,'device',now())`,
    [randomUUID(), other, randomUUID(), actor]
  );
  for (const file of [
    '20261114213000_explicit_contract_obligations.sql',
    '20261114220000_portfolio_queue_filters.sql',
    '20261114221000_device_push_ownership.sql',
    '20261114222000_job_event_timestamps.sql',
  ]) {
    if (file === '20261114221000_device_push_ownership.sql') {
      // The CLI can apply one statement at a time without an enclosing transaction.
      // Extended mode requires this lock/dedup/index operation to remain one statement.
      await db.query({
        text: await fs.readFile(
          new URL('../../supabase/migrations/' + file, import.meta.url),
          'utf8'
        ),
        queryMode: 'extended',
      });
      continue;
    }
    await db.query('BEGIN');
    try {
      await db.query(
        await fs.readFile(
          new URL('../../supabase/migrations/' + file, import.meta.url),
          'utf8'
        )
      );
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  }
  await assert.rejects(
    db.query(`UPDATE contracts SET contractor_signed_at=now() WHERE id=$1`, [
      contract,
    ]),
    (e) => e.code === '23514'
  );
  await db.query(
    `UPDATE contracts SET terms='{"materials_terms":"No materials required","warranty_terms":"No additional contractual warranty"}' WHERE id=$1`,
    [contract]
  );
  await db.query(
    `UPDATE contracts SET contractor_signed_at=now() WHERE id=$1`,
    [contract]
  );
  await db.query(`UPDATE contracts SET homeowner_signed_at=now() WHERE id=$1`, [
    legacy,
  ]);
  assert.deepEqual(
    (await db.query(`SELECT terms FROM contracts WHERE id=$1`, [legacy]))
      .rows[0].terms,
    { legacy: true }
  );
  console.log(
    'PASS explicit new obligations required; already signed legacy terms preserved'
  );
  await db.query(`INSERT INTO bids(id,status) VALUES($1,'pending')`, [bid]);
  let b = (await db.query(`SELECT * FROM bids WHERE id=$1`, [bid])).rows[0];
  assert.equal(b.materials_included, null);
  assert.equal(b.warranty_months, null);
  assert.equal(b.accepted_at, null);
  await db.query(`UPDATE bids SET status='accepted' WHERE id=$1`, [bid]);
  b = (await db.query(`SELECT * FROM bids WHERE id=$1`, [bid])).rows[0];
  assert.ok(b.accepted_at);
  await db.query(
    `UPDATE bids SET accepted_at=now()+interval '1 day' WHERE id=$1`,
    [bid]
  );
  assert.equal(
    (
      await db.query(`SELECT accepted_at FROM bids WHERE id=$1`, [bid])
    ).rows[0].accepted_at.toISOString(),
    b.accepted_at.toISOString()
  );
  await db.query(`INSERT INTO escrow_transactions VALUES($1,'pending',NULL)`, [
    escrow,
  ]);
  await db.query(`UPDATE escrow_transactions SET status='held' WHERE id=$1`, [
    escrow,
  ]);
  const funded = (
    await db.query(`SELECT funded_at FROM escrow_transactions WHERE id=$1`, [
      escrow,
    ])
  ).rows[0].funded_at;
  await db.query(
    `UPDATE escrow_transactions SET status='released' WHERE id=$1`,
    [escrow]
  );
  assert.equal(
    (
      await db.query(`SELECT funded_at FROM escrow_transactions WHERE id=$1`, [
        escrow,
      ])
    ).rows[0].funded_at.toISOString(),
    funded.toISOString()
  );
  console.log(
    'PASS real acceptance/funding timestamps survive replays and later transitions'
  );
  const additions = await db.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND ((table_name='bids' AND column_name='accepted_at') OR (table_name='escrow_transactions' AND column_name='funded_at')) ORDER BY table_name,column_name"
  );
  assert.equal(additions.rows.length, 2);
  await fs.mkdir(new URL('../../output/', import.meta.url), {
    recursive: true,
  });
  await fs.writeFile(
    new URL('../../output/beta-schema-additions.json', import.meta.url),
    JSON.stringify(additions.rows)
  );
  assert.equal(
    (await db.query('SELECT count(*)::int AS n FROM user_push_tokens')).rows[0]
      .n,
    1
  );
  assert.equal(
    (await db.query('SELECT user_id FROM user_push_tokens')).rows[0].user_id,
    actor
  );
  await db.query(
    `INSERT INTO user_push_tokens VALUES($1,$2,'device',now()) ON CONFLICT(push_token) DO UPDATE SET user_id=excluded.user_id`,
    [randomUUID(), other]
  );
  assert.equal(
    (await db.query('SELECT user_id FROM user_push_tokens')).rows[0].user_id,
    other
  );
  console.log('PASS device token has one account after registration/switching');
  for (let i = 0; i < 35; i++)
    await db.query(
      `INSERT INTO jobs VALUES($1,$2,$3,NULL,$4,'posted',NULL,now()-interval '1 day')`,
      [randomUUID(), prop, actor, 'Accessible ' + i]
    );
  await db.query(
    `INSERT INTO jobs VALUES($1,$2,$3,NULL,'Secret job','posted',NULL,now())`,
    [randomUUID(), privateProp, other]
  );
  const queue = async (
    property = null,
    priority = null,
    offset = 0,
    person = '',
    sort = 'priority'
  ) =>
    (
      await db.query(
        `SELECT portfolio_filtered_action_queue($1,$2,25,'team',$3,$4,$5,$6) AS result`,
        [actor, offset, property, priority, person, sort]
      )
    ).rows[0].result;
  let q = await queue(prop, 0, 25);
  assert.equal(q.total, 35);
  assert.equal(q.items.length, 10);
  assert.equal(q.hasMore, false);
  assert.ok(q.items.every((row) => row.property_id === prop));
  assert.equal(q.properties.length, 1);
  assert.equal((await queue(privateProp)).total, 0);
  assert.equal((await queue(prop, 2)).total, 0);
  assert.equal((await queue(null, null, 0, 'Nobody')).total, 0);
  for (const sort of ['due', 'property', 'person'])
    assert.equal((await queue(null, null, 0, '', sort)).total, 35);
  await db.query('SET ROLE anon');
  await assert.rejects(queue(), (e) => e.code === '42501');
  await db.query('RESET ROLE');
  console.log(
    'PASS queue filtering precedes count/pagination and preserves property and service-role boundaries'
  );
}
