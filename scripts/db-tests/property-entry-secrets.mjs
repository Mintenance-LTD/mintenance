import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function testPropertyEntrySecrets({ admin, as, check, uid, root }) {
  const owner=uid(1), contractor=uid(2), payer=uid(3), outsider=uid(4), platformAdmin=uid(5), property=uid(90), job=uid(10);
  await admin.query(`
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text);
    INSERT INTO profiles VALUES('${owner}','homeowner'),('${contractor}','contractor'),('${payer}','homeowner'),('${outsider}','homeowner'),('${platformAdmin}','admin');
    CREATE TABLE public.properties(id uuid PRIMARY KEY,owner_id uuid,property_name text,key_safe_code text);
    ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_properties ON properties FOR ALL USING(true) WITH CHECK(true);
    GRANT ALL ON properties,profiles TO anon,authenticated,service_role;
    ALTER TABLE jobs ADD COLUMN property_id uuid REFERENCES properties(id);
    ALTER TABLE jobs ADD COLUMN scheduled_start_date timestamptz;
    INSERT INTO properties VALUES('${property}','${owner}','House','synthetic-code');
    UPDATE jobs SET property_id='${property}',status='assigned',scheduled_start_date=now()+interval '2 hours' WHERE id='${job}';
  `);
  await admin.query(await fs.readFile(path.join(root,'supabase/migrations/20261007232435_private_property_entry_secrets.sql'),'utf8'));
  const read = async (actor,jobId=job) => (await as('service_role',`SELECT public.read_property_entry_secret('${property}','${actor}',${jobId ? `'${jobId}'` : 'NULL'}) AS code`)).rows[0].code;
  await check('entry secret: migrated out of public SELECT *',async()=>{
    assert.equal((await as('authenticated',`SELECT * FROM properties WHERE id='${property}'`,outsider)).rows[0].key_safe_code,null);
    assert.equal(await read(owner),'synthetic-code');
  });
  await check('entry secret: private table and RPC reject direct client reads',async()=>{
    for(const role of ['anon','authenticated']) {
      await assert.rejects(as(role,'SELECT * FROM private.property_entry_secrets'),e=>e.code==='42501');
      await assert.rejects(as(role,`SELECT read_property_entry_secret('${property}','${owner}',NULL)`),e=>e.code==='42501');
    }
  });
  await check('entry secret: owner and platform admin retain access',async()=>{
    assert.equal(await read(owner,null),'synthetic-code');
    assert.equal(await read(platformAdmin,null),'synthetic-code');
  });
  await check('entry secret: team outsider and payer have no owner privilege',async()=>{
    assert.equal(await read(outsider),null); assert.equal(await read(payer),null);
  });
  await check('entry secret: assigned contractor cannot reveal early',async()=>assert.equal(await read(contractor),null));
  await check('entry secret: assigned contractor can reveal in one-hour window',async()=>{
    await admin.query(`UPDATE jobs SET scheduled_start_date=now()+interval '30 minutes' WHERE id='${job}'`);
    assert.equal(await read(contractor),'synthetic-code');
  });
  await check('entry secret: cannot substitute an unrelated job',async()=>assert.equal(await read(contractor,uid(11)),null));
  await check('entry secret: unscheduled assigned job stays hidden',async()=>{
    await admin.query(`UPDATE jobs SET scheduled_start_date=NULL WHERE id='${job}'`);
    assert.equal(await read(contractor),null);
  });
  await check('entry secret: in-progress unscheduled visit reveals code',async()=>{
    await admin.query(`UPDATE jobs SET status='in_progress' WHERE id='${job}'`);
    assert.equal(await read(contractor),'synthetic-code');
  });
  for(const status of ['completed','cancelled','disputed']) {
    await check(`entry secret: ${status} job hides code`,async()=>{
      await admin.query(`UPDATE jobs SET status='${status}' WHERE id='${job}'`);
      assert.equal(await read(contractor),null);
    });
  }
  await check('entry secret: direct client cannot set or clear code',async()=>{
    for(const value of ["'forged'",'NULL'])await assert.rejects(as('authenticated',`UPDATE properties SET key_safe_code=${value} WHERE id='${property}'`),e=>e.code==='42501');
    assert.equal(await read(owner),'synthetic-code');
  });
  await check('entry secret: unrelated property edits remain compatible',async()=>{
    await as('authenticated',`UPDATE properties SET property_name='Renamed' WHERE id='${property}'`);
    assert.equal(await read(owner),'synthetic-code');
  });
  await check('entry secret: service update stays private and atomic',async()=>{
    const result=await as('service_role',`UPDATE properties SET key_safe_code='new-synthetic-code' WHERE id='${property}' RETURNING key_safe_code`);
    assert.equal(result.rows[0].key_safe_code,null);
    assert.equal(await read(owner),'new-synthetic-code');
    await admin.query('BEGIN');
    await admin.query(`UPDATE properties SET key_safe_code='rolled-back-code' WHERE id='${property}'`);
    await admin.query('ROLLBACK');
    assert.equal(await read(owner),'new-synthetic-code');
  });
  await check('entry secret: service clear persists',async()=>{
    await as('service_role',`UPDATE properties SET key_safe_code=NULL WHERE id='${property}'`);
    assert.equal(await read(owner),null);
  });
  await check('entry secret: create with secret and cascade delete work',async()=>{
    const p=uid(91);
    await as('service_role',`INSERT INTO properties VALUES('${p}','${owner}','New house','created-code')`);
    assert.equal((await as('service_role',`SELECT read_property_entry_secret('${p}','${owner}',NULL) AS code`)).rows[0].code,'created-code');
    await as('service_role',`DELETE FROM properties WHERE id='${p}'`);
    assert.equal((await admin.query(`SELECT * FROM private.property_entry_secrets WHERE property_id='${p}'`)).rowCount,0);
  });
}
