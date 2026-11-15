import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export async function testReview48(db, config) {
  for (const file of [
    '20261115180000_win_back_delivery_claim.sql',
    '20261115181000_portfolio_queue_date_labels.sql',
    '20261115182000_compliance_applicability.sql',
  ]) {
    await db.query(
      await fs.readFile(
        new URL('../../supabase/migrations/' + file, import.meta.url),
        'utf8'
      )
    );
  }
  const { id: actor } = (
    await db.query("SELECT id FROM profiles WHERE first_name='Alex'")
  ).rows[0];
  const { id: property } = (
    await db.query('SELECT id FROM properties WHERE owner_id=$1', [actor])
  ).rows[0];
  const peer = new pg.Client(config);
  await peer.connect();
  try {
    const claims = await Promise.all([
      db.query('SELECT claim_win_back_delivery($1) AS claimed', [actor]),
      peer.query('SELECT claim_win_back_delivery($1) AS claimed', [actor]),
    ]);
    assert.deepEqual(claims.map((result) => result.rows[0].claimed).sort(), [
      false,
      true,
    ]);
    await db.query(
      "UPDATE win_back_deliveries SET status='failed' WHERE user_id=$1",
      [actor]
    );
    assert.equal(
      (await db.query('SELECT claim_win_back_delivery($1) AS claimed', [actor]))
        .rows[0].claimed,
      false
    );
    await db.query(
      "UPDATE win_back_deliveries SET attempted_at=now()-interval '31 days' WHERE user_id=$1",
      [actor]
    );
    assert.equal(
      (await db.query('SELECT claim_win_back_delivery($1) AS claimed', [actor]))
        .rows[0].claimed,
      true
    );
    console.log(
      'PASS concurrent win-back workers claim once; failed/unknown sends retain cooldown'
    );
  } finally {
    await peer.end();
  }
  await assert.rejects(
    db.query(
      "INSERT INTO property_compliance_applicability(property_id,cert_type,decision,updated_by) VALUES($1,'gas_safety','not_applicable',$2)",
      [property, actor]
    ),
    (error) => error.code === '23514'
  );
  await db.query(
    "INSERT INTO property_compliance_applicability(property_id,cert_type,decision,reason,updated_by) VALUES($1,'gas_safety','not_applicable','No gas supply',$2)",
    [property, actor]
  );
  assert.equal(
    (
      await db.query(
        'SELECT decision FROM property_compliance_applicability WHERE property_id=$1',
        [property]
      )
    ).rows[0].decision,
    'not_applicable'
  );
  for (const role of ['anon', 'authenticated']) {
    await db.query('SET ROLE ' + role);
    for (const query of [
      'SELECT * FROM property_compliance_applicability',
      'SELECT * FROM win_back_deliveries',
    ])
      await assert.rejects(db.query(query), (error) => error.code === '42501');
    await assert.rejects(db.query('SELECT claim_win_back_delivery($1)', [actor]), error => error.code === '42501');
    await db.query('RESET ROLE');
  }
  console.log(
    'PASS applicability requires a reason; delivery/applicability records reject direct client access'
  );
  const job = randomUUID();
  await db.query(
    "INSERT INTO jobs VALUES($1,$2,$3,$3,'Scheduled repair','assigned',now()+interval '1 day',now()+interval '2 days')",
    [job, property, actor]
  );
  const queue = async () =>
    (
      await db.query(
        "SELECT portfolio_filtered_action_queue($1,0,100,'team',$2) AS result",
        [actor, property]
      )
    ).rows[0].result.items.find((item) => item.id === job);
  assert.equal((await queue()).due_label, 'Job end');
  assert.equal((await queue()).next_action, 'Review scheduled job start');
  await db.query(
    "INSERT INTO property_action_followups VALUES('job',$1,$2,'owner reply',now()+interval '3 days',NULL)",
    [job, property]
  );
  assert.equal((await queue()).due_label, 'Follow-up due');
  assert.equal((await queue()).next_action, 'Awaiting owner reply');
  console.log(
    'PASS portfolio dates distinguish job end from follow-up deadlines'
  );
  const { testJobRetries } = await import('./job-retry-cases.mjs');
  await testJobRetries(db, config, actor);
}
