import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const owner = randomUUID();
const outsider = randomUUID();
const property = randomUUID();
const job = randomUUID();
const date = '2026-11-23 12:00:00.123456+00';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,deleted_at timestamptz);
    CREATE TABLE properties(id uuid PRIMARY KEY,owner_id uuid);
    CREATE TABLE jobs(id uuid PRIMARY KEY,property_id uuid,title text,created_at timestamptz,completed_at timestamptz,
      homeowner_id uuid,status text,budget numeric,category text,scheduled_start_date timestamptz,deleted_at timestamptz);
    CREATE TABLE property_document_files(id uuid PRIMARY KEY,property_id uuid,name text,status text,created_at timestamptz);
    CREATE TABLE property_inspection_reports(id uuid PRIMARY KEY,property_id uuid,title text,created_at timestamptz);
    CREATE TABLE escrow_transactions(id uuid PRIMARY KEY,job_id uuid,payer_id uuid,created_at timestamptz,funded_at timestamptz,released_at timestamptz);
    CREATE TABLE messages(id uuid PRIMARY KEY,job_id uuid,sender_id uuid,receiver_id uuid,content text,created_at timestamptz);
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  await db.query('INSERT INTO profiles(id) VALUES($1),($2)', [owner, outsider]);
  await db.query('INSERT INTO properties VALUES($1,$2)', [property, owner]);
  await db.query("INSERT INTO jobs VALUES($1,$2,'A test job',$3,NULL)", [
    job,
    property,
    date,
  ]);
  await db.query(
    `INSERT INTO property_document_files SELECT gen_random_uuid(),$1,'Reading','ready',$2
    FROM generate_series(1,1050)`,
    [property, date]
  );
  await db.query(
    "INSERT INTO property_inspection_reports VALUES(gen_random_uuid(),$1,'Inspection',$2)",
    [property, date]
  );
  await db.query(
    "INSERT INTO escrow_transactions VALUES(gen_random_uuid(),$1,$2,$3::timestamptz,NULL,$3::timestamptz + interval '1 day')",
    [job, owner, date]
  );
  await db.query(
    "INSERT INTO escrow_transactions VALUES(gen_random_uuid(),$1,$2,$3::timestamptz,NULL,$3::timestamptz + interval '2 day')",
    [job, outsider, date]
  );
  await db.query(
    "INSERT INTO messages VALUES(gen_random_uuid(),$1,$2,$3,'Private content',$4)",
    [job, owner, outsider, date]
  );
  await db.query(
    "INSERT INTO messages VALUES(gen_random_uuid(),$1,$2,$2,'Other private content',$3)",
    [job, outsider, date]
  );
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261123140505_property_activity_cursor.sql',
        import.meta.url
      ),
      'utf8'
    )
  );

  const read = (actor = owner, before = null, key = null) =>
    db.query(
      'SELECT id,title,date::text,kind,href FROM public.read_property_activity_page($1,$2,$3,$4)',
      [actor, property, before, key]
    );
  await db.exec('SET ROLE service_role');
  const first = (await read()).rows;
  assert.equal(first.length, 26);
  assert.equal(first[0].title, 'Payment released');
  assert.equal(first[0].kind, 'payment');
  await db.exec('RESET ROLE');
  await db.query(
    "INSERT INTO jobs VALUES(gen_random_uuid(),$1,'Newer concurrent insert',now(),NULL)",
    [property]
  );
  await db.exec('SET ROLE service_role');

  const received = first.slice(0, 25);
  for (let page = 0; page < 50; page++) {
    const last = received.at(-1);
    const next = (await read(owner, last.date, last.id)).rows;
    received.push(...next.slice(0, 25));
    if (next.length <= 25) break;
  }
  assert.equal(received.length, 1055);
  assert.equal(new Set(received.map((event) => event.id)).size, 1055);
  assert.equal(received.filter((event) => event.kind === 'message').length, 1);
  assert.equal(received.filter((event) => event.kind === 'payment').length, 2);
  assert.ok(
    !received.some(
      (event) =>
        event.title.includes('Private content') || event.title.includes('Newer')
    )
  );
  await assert.rejects(read(outsider), { code: '42501' });
  await db.exec('RESET ROLE');
  await db.query(
    `INSERT INTO jobs(id,property_id,homeowner_id,title,status,budget,created_at,category)
    SELECT gen_random_uuid(),$1,$2,'Synthetic job','completed',20,now(),'plumbing'
    FROM generate_series(1,1025)`,
    [property, owner]
  );
  await db.exec('SET ROLE service_role');
  const summary = (
    await db.query(
      'SELECT completed_jobs,completed_budgets,recent_categories FROM public.read_owned_property_job_summary($1,$2)',
      [owner, [property]]
    )
  ).rows[0];
  assert.equal(Number(summary.completed_jobs), 1025);
  assert.equal(Number(summary.completed_budgets), 20_500);
  assert.equal(summary.recent_categories.length, 5);
  const privateSummary = await db.query(
    'SELECT property_id FROM public.read_owned_property_job_summary($1,$2)',
    [outsider, [property]]
  );
  assert.deepEqual(privateSummary.rows, []);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(read(), { code: '42501' });
  console.log(
    'PASS owner-scoped activity retains 1,055 events, stable ties and microseconds across pages after a newer insert'
  );
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await db.close();
}
