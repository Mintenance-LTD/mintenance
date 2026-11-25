// Run against a disposable PostgreSQL database in memory.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const query = async (sql, args) => (await db.query(sql, args)).rows;
const sync = (actor) =>
  query('SELECT public.sync_property_invitation_notifications($1)', [
    id(actor),
  ]);
const inbox = (actor) =>
  query(
    'SELECT type, read, action_url FROM public.notifications WHERE user_id=$1 ORDER BY id',
    [id(actor)]
  );

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text, deleted_at timestamptz);
    CREATE TABLE public.properties (id uuid PRIMARY KEY, property_name text);
    CREATE TABLE public.property_team_members (id uuid PRIMARY KEY, property_id uuid REFERENCES public.properties,
      user_id uuid, email text NOT NULL, status text NOT NULL);
    CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
      type text NOT NULL, title text NOT NULL, message text NOT NULL, action_url text, metadata jsonb,
      read boolean NOT NULL DEFAULT false);
  `);
  await db.exec(
    readFileSync(
      new URL(
        '../supabase/migrations/20261125105500_property_invitation_inbox.sql',
        import.meta.url
      ),
      'utf8'
    )
  );

  await query('INSERT INTO public.properties VALUES ($1,$2),($3,$4)', [
    id(10),
    'Test property',
    id(11),
    'Second property',
  ]);
  await query(
    'INSERT INTO public.property_team_members VALUES ($1,$2,NULL,$3,$4)',
    [id(20), id(10), 'HOMEOWNER@EXAMPLE.TEST', 'pending']
  );
  await sync(1);
  assert.deepEqual(await inbox(1), []);

  for (const [user, email, role, verified] of [
    [1, 'homeowner@example.test', 'homeowner', false],
    [2, 'contractor@example.test', 'contractor', true],
    [3, 'other@example.test', 'homeowner', true],
  ]) {
    await query(
      'INSERT INTO auth.users VALUES ($1,$2,CASE WHEN $3 THEN now() END)',
      [id(user), email, verified]
    );
    await query('INSERT INTO public.profiles VALUES ($1,$2,NULL)', [
      id(user),
      role,
    ]);
  }
  await query(
    'INSERT INTO public.property_team_members VALUES ($1,$2,NULL,$3,$4),($5,$6,$7,$8,$9)',
    [
      id(21),
      id(10),
      'contractor@example.test',
      'pending',
      id(22),
      id(11),
      id(1),
      'other@example.test',
      'pending',
    ]
  );
  for (const actor of [1, 2, 3]) {
    await sync(actor);
    assert.deepEqual(await inbox(actor), []);
  }

  await query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [
    id(1),
  ]);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(sync(1), { code: '42501' });
  await db.exec('SET ROLE service_role');
  await sync(1);
  await sync(1);
  await db.exec('RESET ROLE');
  assert.deepEqual(await inbox(1), [
    {
      type: 'property_invitation',
      read: false,
      action_url: `/properties/invitations?property=${id(10)}`,
    },
  ]);

  await query('UPDATE public.property_team_members SET status=$1 WHERE id=$2', [
    'accepted',
    id(20),
  ]);
  await sync(1);
  assert.deepEqual(await inbox(1), [
    { type: 'property_invitation', read: true, action_url: null },
  ]);

  await query(
    'INSERT INTO public.property_team_members VALUES ($1,$2,NULL,$3,$4)',
    [id(23), id(11), 'homeowner@example.test', 'pending']
  );
  await sync(1);
  assert.equal((await inbox(1)).filter((row) => !row.read).length, 1);
  await query(
    'DELETE FROM public.notifications WHERE user_id=$1 AND NOT read',
    [id(1)]
  );
  await sync(1);
  assert.equal((await inbox(1)).filter((row) => !row.read).length, 0);
  await query('DELETE FROM public.property_team_members WHERE id=$1', [id(23)]);
  await query(
    'INSERT INTO public.property_team_members VALUES ($1,$2,NULL,$3,$4)',
    [id(24), id(11), 'homeowner@example.test', 'pending']
  );
  await sync(1);
  await query('DELETE FROM public.property_team_members WHERE id=$1', [id(24)]);
  assert.equal((await inbox(1)).filter((row) => row.action_url).length, 0);
  assert.equal((await inbox(1)).length, 2);
  console.log(
    'Property invitation inbox passed verified-identity, late signup, role, duplicate, dismissal, acceptance and withdrawal checks.'
  );
} finally {
  await db.close();
}
