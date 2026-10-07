// npm ci --prefix scripts/db-tests && npm test --prefix scripts/db-tests
// Starts its own loopback-only PostgreSQL 17 cluster; never reads app env files.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import pg from 'pg';

const spawn = childProcess.spawn;
childProcess.spawn = (command, args, options) => spawn(command, args, { ...options, windowsHide: true });
syncBuiltinESMExports();
const { default: EmbeddedPostgres } = await import('embedded-postgres');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mintenance-authz-'));
const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const password = randomUUID();
const cluster = new EmbeddedPostgres({ databaseDir, user: 'postgres', password,
  port, persistent: true, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
const config = { host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres' };
const admin = new pg.Client(config);
let started = false, connected = false, passed = 0;
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const actor = uid(1), contractor = uid(2), payer = uid(3), outsider = uid(4), job = uid(10);
async function as(role, sql, user = actor) {
  await admin.query('BEGIN');
  try {
    await admin.query(`SET LOCAL ROLE ${role}`);
    await admin.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user ?? '']);
    const result = await admin.query(sql);
    await admin.query('COMMIT');
    return result;
  } catch (error) { await admin.query('ROLLBACK'); throw error; }
}
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
async function denied(role, sql, user = actor) {
  await assert.rejects(as(role, sql, user), error => error.code === '42501');
}
try {
  await cluster.initialise(); await cluster.start(); started = true;
  await admin.connect(); connected = true;
  await admin.query(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
      $$ SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    CREATE TABLE public.jobs(id uuid PRIMARY KEY, homeowner_id uuid, contractor_id uuid,
      payer_user_id uuid, status text, payment_status text);
    CREATE TABLE public.reviews(id uuid PRIMARY KEY, job_id uuid REFERENCES jobs(id),
      reviewer_id uuid, reviewee_id uuid, rating int, response text);
    CREATE TABLE public.organizations(id uuid PRIMARY KEY);
    CREATE TABLE public.organization_memberships(id uuid PRIMARY KEY,
      org_id uuid REFERENCES organizations(id) ON DELETE CASCADE, user_id uuid,
      org_role text, status text);
    CREATE TABLE public.appointments(id uuid PRIMARY KEY, contractor_id uuid,
      client_id uuid, title text);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY, bucket_id text, name text, owner uuid);
    GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated,service_role;
    GRANT INSERT(id),UPDATE(response) ON reviews TO authenticated;
    ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_jobs ON jobs FOR SELECT USING(true);
    CREATE POLICY insert_jobs ON jobs FOR INSERT TO authenticated WITH CHECK(homeowner_id=auth.uid());
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_reviews ON reviews FOR SELECT USING(true);
    CREATE POLICY insert_reviews ON reviews FOR INSERT TO authenticated WITH CHECK(reviewer_id=auth.uid());
    CREATE POLICY update_reviews ON reviews FOR UPDATE TO authenticated USING(reviewer_id=auth.uid());
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_appointments ON appointments FOR SELECT USING(true);
    CREATE POLICY insert_appointments ON appointments FOR INSERT WITH CHECK(client_id=auth.uid() OR client_id IS NULL OR contractor_id=auth.uid());
    ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
    CREATE POLICY memberships_fixture ON organization_memberships FOR ALL USING(true) WITH CHECK(true);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY storage_read ON storage.objects FOR SELECT USING(true);
    CREATE POLICY storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='job-attachments');
    CREATE POLICY storage_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='job-attachments' AND owner=auth.uid());
    INSERT INTO jobs VALUES('${job}','${actor}','${contractor}','${payer}','completed','paid');
    INSERT INTO reviews VALUES('${uid(20)}','${job}','${actor}','${contractor}',5,NULL);
  `);
  // Prove the fixture admits the audited bypasses before applying the real migration.
  await check('baseline permits forged initial job', () => as('authenticated', `INSERT INTO jobs VALUES('${uid(11)}','${actor}','${contractor}',NULL,'completed','paid')`));
  await check('baseline permits anonymous appointment', () => as('anon', `INSERT INTO appointments VALUES('${uid(30)}','${contractor}',NULL,'unauthorized')`, null));
  await check('baseline permits unrelated review target', () => as('authenticated', `INSERT INTO reviews VALUES('${uid(21)}','${job}','${actor}','${outsider}',1,NULL)`));
  await admin.query(await fs.readFile(path.join(root, 'supabase/migrations/20261007230825_beta_authoritative_mutations.sql'), 'utf8'));
  for (const role of ['anon','authenticated']) {
    await check(`${role}: job creation denied`, () => denied(role, `INSERT INTO jobs VALUES('${uid(12)}','${actor}',NULL,NULL,'completed','paid')`));
    await check(`${role}: appointment insert denied`, () => denied(role, `INSERT INTO appointments VALUES('${uid(31)}','${contractor}',NULL,'forged')`));
    await check(`${role}: review insert denied`, () => denied(role, `INSERT INTO reviews(id,reviewer_id) VALUES('${uid(22)}','${actor}')`));
    await check(`${role}: protected review update denied`, () => denied(role, `UPDATE reviews SET job_id='${uid(11)}',reviewee_id='${outsider}',response='forged' WHERE id='${uid(20)}'`));
    await check(`${role}: membership elevation denied`, () => denied(role, "UPDATE organization_memberships SET org_role='owner'"));
    await check(`${role}: membership insert/delete denied`, async () => {
      await denied(role, `INSERT INTO organization_memberships(id) VALUES('${uid(50)}')`);
      await denied(role, 'DELETE FROM organization_memberships');
    });
  }
  await check('read access preserved', async () => assert.equal((await as('authenticated','SELECT * FROM reviews')).rowCount,2));
  await check('authorized API service writes preserved', async () => {
    await as('service_role',`INSERT INTO jobs VALUES('${uid(13)}','${actor}',NULL,NULL,'posted','pending')`);
    await as('service_role',`INSERT INTO appointments VALUES('${uid(32)}','${contractor}',NULL,'private contractor slot')`);
    await as('service_role',`UPDATE reviews SET response='legitimate API reply' WHERE id='${uid(20)}'`);
  });
  await check('restrictive policy survives accidental grant restoration', async () => {
    await admin.query('GRANT INSERT ON jobs TO authenticated');
    await denied('authenticated', `INSERT INTO jobs VALUES('${uid(14)}','${actor}',NULL,NULL,'completed','paid')`);
    await admin.query('REVOKE INSERT ON jobs FROM authenticated');
  });
  for (const [label,user,prefix] of [['own folder',actor,actor],['job homeowner',actor,job],['job contractor',contractor,job],['job payer',payer,job]]) {
    await check(`attachment: ${label} allowed`, () => as('authenticated',`INSERT INTO storage.objects VALUES('${randomUUID()}','job-attachments','${prefix}/photo.jpg','${user}')`,user));
  }
  await check('attachment: outsider job/other user paths denied', async () => {
    for(const prefix of [job,actor]) await denied('authenticated',`INSERT INTO storage.objects VALUES('${randomUUID()}','job-attachments','${prefix}/photo.jpg','${outsider}')`,outsider);
  });
  await check('attachment: moving own file to another user denied', async () => {
    await denied('authenticated',`UPDATE storage.objects SET name='${outsider}/moved.jpg' WHERE name='${actor}/photo.jpg'`);
  });
  await check('attachment: own-path rename allowed', () => as('authenticated',`UPDATE storage.objects SET name='${actor}/renamed.jpg' WHERE name='${actor}/photo.jpg'`));

  async function seedOwners(org, first, second) {
    await admin.query(`INSERT INTO organizations VALUES('${org}'); INSERT INTO organization_memberships VALUES
      ('${first}','${org}','${actor}','owner','active'),('${second}','${org}','${contractor}','owner','active')`);
  }
  await seedOwners(uid(60),uid(61),uid(62));
  await check('service can remove one of two owners', () => as('service_role',`UPDATE organization_memberships SET status='removed' WHERE id='${uid(61)}'`));
  await check('last owner guarded on demotion/removal/delete/reassignment', async () => {
    for(const statement of ["SET org_role='manager'","SET status='removed'",`SET user_id='${outsider}'`])
      await assert.rejects(as('service_role',`UPDATE organization_memberships ${statement} WHERE id='${uid(62)}'`), e=>e.code==='23514');
    await assert.rejects(as('service_role',`DELETE FROM organization_memberships WHERE id='${uid(62)}'`), e=>e.code==='23514');
  });
  for(const isolation of ['READ COMMITTED','REPEATABLE READ']) {
    await check(`concurrent last-owner protection: ${isolation}`, async () => {
      const org=randomUUID(), first=randomUUID(), second=randomUUID();
      await seedOwners(org,first,second);
      const a=new pg.Client(config), b=new pg.Client(config);
      await a.connect(); await b.connect();
      try {
        for(const client of [a,b]) { await client.query(`BEGIN ISOLATION LEVEL ${isolation}`); await client.query('SET LOCAL ROLE service_role'); await client.query("SET LOCAL statement_timeout='5s'"); await client.query('SELECT count(*) FROM organization_memberships'); }
        await a.query(`UPDATE organization_memberships SET status='removed' WHERE id='${first}'`);
        const result = b.query(`UPDATE organization_memberships SET status='removed' WHERE id='${second}'`).then(()=>null,e=>e);
        await a.query('COMMIT');
        const error=await result;
        assert(error && ['23514','40001','40P01'].includes(error.code), `unexpected second result: ${error?.code}`);
        await b.query('ROLLBACK');
        assert.equal(Number((await admin.query(`SELECT count(*) FROM organization_memberships WHERE org_id='${org}' AND status='active' AND org_role='owner'`)).rows[0].count),1);
      } finally { await a.end(); await b.end(); }
    });
  }
  await check('intentional organization deletion can cascade', () => as('service_role',`DELETE FROM organizations WHERE id='${uid(60)}'`));
  console.log(`PASS ${passed} database regression checks on PostgreSQL 17; production untouched.`);
} finally {
  if(connected) await admin.end();
  if(started) await cluster.stop();
  const resolved=path.resolve(databaseDir);
  if(path.dirname(resolved)===path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('mintenance-authz-')) await fs.rm(resolved,{recursive:true,force:true});
}
