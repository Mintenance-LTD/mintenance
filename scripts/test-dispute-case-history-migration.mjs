import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.disputes(id uuid PRIMARY KEY, status text NOT NULL, description text);
    INSERT INTO public.disputes VALUES
      ('00000000-0000-4000-8000-000000000001', 'open', 'Original claim'),
      ('00000000-0000-4000-8000-000000000002', 'open', 'Another claim');
    GRANT UPDATE, SELECT ON public.disputes TO service_role;
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261123233543_dispute_case_status_history.sql',
        import.meta.url
      ),
      'utf8'
    )
  );
  await db.exec(`
    SET ROLE service_role;
    UPDATE public.disputes SET status = 'open';
    UPDATE public.disputes SET description = 'Amended claim' WHERE id = '00000000-0000-4000-8000-000000000001';
    UPDATE public.disputes SET status = 'under_review' WHERE id = '00000000-0000-4000-8000-000000000001';
    UPDATE public.disputes SET status = 'resolved' WHERE id = '00000000-0000-4000-8000-000000000001';
  `);
  const { rows } = await db.query(`
    SELECT dispute_id, status, changed_at FROM public.dispute_case_status_history ORDER BY id
  `);
  assert.deepEqual(
    rows.map(({ status }) => status),
    ['under_review', 'resolved']
  );
  assert.ok(
    rows.every(
      (row) => row.dispute_id === '00000000-0000-4000-8000-000000000001'
    )
  );
  assert.ok(rows[0].changed_at <= rows[1].changed_at);
  await assert.rejects(
    db.query('DELETE FROM public.dispute_case_status_history'),
    /permission denied/
  );
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await assert.rejects(
    db.query('SELECT * FROM public.dispute_case_status_history'),
    /permission denied/
  );
  await db.exec(
    "RESET ROLE; DELETE FROM public.disputes WHERE id = '00000000-0000-4000-8000-000000000001'"
  );
  assert.equal(
    (await db.query('SELECT id FROM public.dispute_case_status_history')).rows
      .length,
    0
  );
  console.log(
    'Dispute status history records transitions and enforces its access and retention rules.'
  );
} finally {
  await db.close();
}
