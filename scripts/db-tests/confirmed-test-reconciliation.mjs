import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function testConfirmedTestExclusion({ admin, check, uid, root }) {
  await admin.query(`
    CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,payment_intent_id text,metadata jsonb,created_at timestamptz DEFAULT now());
    CREATE TABLE payment_reconciliation_work(escrow_id uuid PRIMARY KEY,claim_token uuid,lease_until timestamptz,source jsonb,
      last_checked_at timestamptz,next_check_at timestamptz,outcome text,evidence jsonb);
    CREATE FUNCTION payment_reconciliation_source(p_id uuid) RETURNS jsonb LANGUAGE sql AS
      $$ SELECT jsonb_build_object('id',id,'payment_intent_id',payment_intent_id) FROM escrow_transactions WHERE id=p_id $$;
    INSERT INTO escrow_transactions VALUES('${uid(500)}','pi_confirmed_test','{"reconciliation_exclusion":"confirmed_owner_test","reconciliation_flag":false}',now()-interval '1 day'),
      ('${uid(501)}','pi_customer','{}',now());
  `);
  await admin.query(
    await fs.readFile(
      path.join(
        root,
        'supabase/migrations/20261029204850_confirmed_test_reconciliation.sql'
      ),
      'utf8'
    )
  );
  await check(
    'reconciliation: confirmed owner tests skipped but normal transactions still claimed',
    async () => {
      const work = (
        await admin.query('SELECT claim_payment_reconciliation() result')
      ).rows[0].result;
      assert.equal(work.escrow_id, uid(501));
      const finished = await admin.query(
        'SELECT finish_payment_reconciliation($1,$2,$3,$4) result',
        [work.escrow_id, work.token, 'matched', {}]
      );
      assert.equal(finished.rows[0].result, true);
      assert.equal(
        (await admin.query('SELECT claim_payment_reconciliation() result'))
          .rows[0].result,
        null
      );
    }
  );
  await check(
    'reconciliation: an in-flight result cannot reopen a classified test exception',
    async () => {
      await admin.query(
        "UPDATE escrow_transactions SET metadata='{}' WHERE id=$1",
        [uid(500)]
      );
      const work = (
        await admin.query('SELECT claim_payment_reconciliation() result')
      ).rows[0].result;
      await admin.query(
        'UPDATE escrow_transactions SET metadata=$1 WHERE id=$2',
        [
          {
            reconciliation_exclusion: 'confirmed_owner_test',
            reconciliation_flag: false,
          },
          uid(500),
        ]
      );
      const result = await admin.query(
        'SELECT finish_payment_reconciliation($1,$2,$3,$4) result',
        [work.escrow_id, work.token, 'missing', {}]
      );
      assert.equal(result.rows[0].result, false);
      assert.equal(
        (
          await admin.query(
            'SELECT metadata FROM escrow_transactions WHERE id=$1',
            [uid(500)]
          )
        ).rows[0].metadata.reconciliation_flag,
        false
      );
    }
  );
}
