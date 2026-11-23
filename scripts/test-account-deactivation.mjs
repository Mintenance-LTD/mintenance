import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
    CREATE TABLE profiles(id uuid PRIMARY KEY,email text NOT NULL,deleted_at timestamptz,
      updated_at timestamptz,tokens_revoked_at timestamptz);
    CREATE TABLE refresh_tokens(user_id uuid REFERENCES profiles, session_started_at timestamptz,
      revoked_at timestamptz,revoked_reason text);
    CREATE TABLE pre_mfa_sessions(user_id uuid REFERENCES profiles);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  for (const filename of [
    '20260915152927_serialize_web_session_revocation',
    '20261123135556_atomic_account_deactivation',
  ])
    await db.exec(
      readFileSync(
        new URL(`../supabase/migrations/${filename}.sql`, import.meta.url),
        'utf8'
      )
    );
  const userId = randomUUID();
  const row = async (sql) => (await db.query(sql, [userId])).rows[0];
  await db.query(
    "INSERT INTO profiles(id,email) VALUES($1,'test@example.test')",
    [userId]
  );
  const issue = () =>
    db.query(
      'INSERT INTO refresh_tokens(user_id,session_started_at) VALUES($1,clock_timestamp())',
      [userId]
    );
  const deactivate = () =>
    row('SELECT public.deactivate_account_and_revoke_sessions($1) AS success');
  await issue();
  await db.query('INSERT INTO pre_mfa_sessions VALUES($1)', [userId]);
  await db.exec(
    'ALTER TABLE refresh_tokens ADD CONSTRAINT failed_revoke CHECK (revoked_at IS NULL); SET ROLE service_role'
  );
  await assert.rejects(deactivate(), { code: '23514' });
  assert.deepEqual(
    await row('SELECT deleted_at,tokens_revoked_at FROM profiles WHERE id=$1'),
    { deleted_at: null, tokens_revoked_at: null }
  );
  await db.exec(
    'RESET ROLE; ALTER TABLE refresh_tokens DROP CONSTRAINT failed_revoke; SET ROLE service_role'
  );
  assert.deepEqual(await deactivate(), { success: true });
  assert.deepEqual(await deactivate(), { success: false });
  const profile = await row(
    'SELECT email,deleted_at,tokens_revoked_at FROM profiles WHERE id=$1'
  );
  assert.equal(profile.email, `deactivated-${userId}@invalid.invalid`);
  assert.ok(profile.deleted_at && profile.tokens_revoked_at);
  assert.ok(
    (await row('SELECT revoked_at FROM refresh_tokens WHERE user_id=$1'))
      .revoked_at
  );
  assert.equal(
    await row('SELECT user_id FROM pre_mfa_sessions WHERE user_id=$1'),
    undefined
  );
  await assert.rejects(issue(), { code: '28000' });
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`RESET ROLE; SET ROLE ${role}`);
    await assert.rejects(deactivate(), { code: '42501' });
  }
  console.log(
    'PASS atomic profile deactivation, session and MFA revocation, failed-revocation rollback, and rejection of new sessions'
  );
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await db.close();
}
