// Verify the migration on an isolated PostgreSQL instance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const query = async (sql, params) => (await db.query(sql, params)).rows;

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY, deleted_at timestamptz, email_confirmed_at timestamptz,
      banned_until timestamptz
    );
    CREATE TABLE profiles (
      id uuid PRIMARY KEY, email text, first_name text, last_name text, phone text, role text,
      company_name text, license_number text, insurance_expiry_date date, business_address text,
      admin_verified boolean, skills text[], rating numeric, total_jobs_completed int,
      city text, created_at timestamptz DEFAULT now(), updated_at timestamptz,
      background_check_status text, verification_status text, deleted_at timestamptz, is_available boolean
    );
    CREATE TABLE contractor_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contractor_id uuid, verification_type text,
      created_at timestamptz DEFAULT now(), review_status text
    );
    CREATE TABLE credential_verifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, register text,
      registration_number text, status text, created_at timestamptz DEFAULT now(), expires_at timestamptz
    );
    CREATE TABLE admin_verification_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contractor_id uuid UNIQUE, admin_id uuid,
      status text DEFAULT 'open', email_status text DEFAULT 'pending',
      created_at timestamptz DEFAULT now(), completed_at timestamptz
    );
    CREATE TABLE jobs (id uuid PRIMARY KEY, title text);
    CREATE TABLE retained_contract_records (contract_id uuid PRIMARY KEY, archived_at timestamptz, review_due_at timestamptz, evidence jsonb);
    CREATE TABLE retained_dispute_records (dispute_id uuid PRIMARY KEY, job_id uuid, archived_at timestamptz, review_due_at timestamptz, evidence jsonb);
    CREATE TABLE evidence_retention_reviews (record_kind text, record_id uuid, revision int, legal_hold boolean, reason text, review_due_at timestamptz);
    CREATE TABLE support_operator_settings (admin_id uuid PRIMARY KEY, can_broadcast boolean);
    CREATE TABLE support_messages (id uuid PRIMARY KEY, ticket_id uuid);
    CREATE TABLE customer_campaigns (
      id uuid PRIMARY KEY, title text, body text, audience text, recipient_ids uuid[], channels text[], published_at timestamptz
    );
    CREATE TABLE customer_communication_outbox (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text UNIQUE, recipient_id uuid,
      recipient_email text, subject text, body text, channel text, status text DEFAULT 'pending', action_url text,
      provider_id text, attempts int DEFAULT 0, last_error text, created_at timestamptz DEFAULT now(),
      completed_at timestamptz, last_checked_at timestamptz
    );
  `);
  await db.exec(
    readFileSync(
      'supabase/migrations/20261125142028_admin_work_queues.sql',
      'utf8'
    )
  );
  await query(
    `
    INSERT INTO profiles (id, email, role, is_available, admin_verified, background_check_status) VALUES
      ($1, 'admin@example.invalid', 'admin', true, false, NULL),
      ($2, 'ready@example.invalid', 'contractor', false, false, NULL),
      ($3, 'missing@example.invalid', 'contractor', false, false, NULL),
      ($4, 'rejected@example.invalid', 'contractor', false, false, 'rejected'),
      ($5, 'verified@example.invalid', 'contractor', false, true, NULL),
      ($6, 'resident@example.invalid', 'homeowner', false, false, NULL)
  `,
    [1, 2, 3, 4, 5, 6].map(id)
  );
  await query(
    `INSERT INTO contractor_documents (contractor_id, verification_type, review_status) VALUES
    ($1,'identity','approved'), ($1,'business_licence','pending'), ($2,'identity','pending'),
    ($3,'identity','approved'), ($3,'business_licence','approved')`,
    [id(2), id(3), id(4)]
  );
  const classifications = await query(
    'SELECT id, queue_status FROM admin_verification_queue ORDER BY id'
  );
  assert.deepEqual(
    classifications.map((row) => row.queue_status),
    ['ready', 'incomplete', 'rejected', 'verified']
  );
  const assigned = () => query('SELECT assign_admin_verifications() AS count');
  await query(
    `INSERT INTO jobs VALUES ($1, 'Boiler repair');
    `.trim(),
    [id(8)]
  );
  await query(
    `INSERT INTO retained_contract_records VALUES
    ($1,'2026-01-01','2026-11-24','{"contract":{"title":"Kitchen agreement"}}')`,
    [id(10)]
  );
  await query(
    `INSERT INTO retained_dispute_records VALUES
    ($1,$2,'2026-11-01','2026-11-20','{"dispute_reason":"Test dispute"}')`,
    [id(11), id(8)]
  );
  await query(
    `INSERT INTO evidence_retention_reviews VALUES ('contract',$1,1,true,'Test hold','2026-11-19')`,
    [id(10)]
  );
  const reviews = await query(
    'SELECT title, legal_hold FROM admin_evidence_review_queue ORDER BY review_due_at,kind,id'
  );
  assert.deepEqual(reviews, [
    { title: 'Kitchen agreement', legal_hold: true },
    { title: 'Boiler repair', legal_hold: false },
  ]);

  await query('INSERT INTO support_operator_settings VALUES ($1, true)', [
    id(1),
  ]);
  await query(
    'INSERT INTO auth.users VALUES ($1,NULL,now(),NULL), ($2,NULL,now(),NULL), ($3,NULL,NULL,NULL)',
    [id(2), id(6), id(3)]
  );
  assert.deepEqual(
    await query(
      "SELECT * FROM preview_customer_campaign_recipients($1,'all',null)",
      [id(1)]
    ),
    [{ id: id(2) }, { id: id(6) }]
  );
  assert.deepEqual(
    await query(
      "SELECT * FROM preview_customer_campaign_recipients($1,'all',null)",
      [id(2)]
    ),
    []
  );
  await query(
    `INSERT INTO customer_campaigns VALUES ($1,'Service update','Synthetic only','all',ARRAY[$2,$3]::uuid[],ARRAY['email','push','in_app'],NULL)`,
    [id(13), id(2), id(6)]
  );
  assert.deepEqual(
    await query('SELECT publish_customer_campaign($1,$2) AS count', [
      id(13),
      id(1),
    ]),
    [{ count: 4 }]
  );
  assert.deepEqual(
    await query('SELECT publish_customer_campaign($1,$2) AS count', [
      id(13),
      id(1),
    ]),
    [{ count: 0 }]
  );
  await query('INSERT INTO support_messages VALUES ($1,$2)', [id(14), id(15)]);
  await query(
    `INSERT INTO customer_communication_outbox (event_key,recipient_id,subject,channel,action_url) VALUES
    ($1,$2,'Test reply','in_app','/support'),
    ($3,$2,'Test agreement','email',$4)`,
    [
      'support-inbox:' + id(14),
      id(6),
      'contract-consent:' + id(10),
      '/jobs/' + id(8),
    ]
  );
  assert.deepEqual(
    await query(`SELECT recipient_email, case_reference, job_reference
    FROM admin_communication_delivery_log WHERE subject LIKE 'Test %' ORDER BY subject`),
    [
      {
        recipient_email: 'resident@example.invalid',
        case_reference: null,
        job_reference: id(8),
      },
      {
        recipient_email: 'resident@example.invalid',
        case_reference: id(15),
        job_reference: null,
      },
    ]
  );
  for (const name of [
    'admin_verification_queue',
    'admin_evidence_review_queue',
    'admin_communication_delivery_log',
  ]) {
    const [perm] = await query(
      "SELECT has_table_privilege('authenticated',$1,'SELECT') AS client, has_table_privilege('service_role',$1,'SELECT') AS service",
      [name]
    );
    assert.deepEqual(perm, { client: false, service: true });
  }
  await query(`INSERT INTO profiles (id, role, verification_status, company_name, business_address) VALUES
    ($1, 'contractor', 'pending', 'Existing mobile contractor', 'Synthetic address'),
    ($2, 'contractor', 'pending', 'Needs evidence', NULL),
    ($3, 'contractor', 'pending', 'Fresh Android contractor', 'Synthetic address'),
    ($4, 'contractor', NULL, 'Sole trader', 'Synthetic address')`, [id(20),id(21),id(22),id(23)]);
  await query(`INSERT INTO credential_verifications (user_id,register,registration_number,status) VALUES
    ($1,'gas_safe','TEST-migrated','pending'), ($2,'other','','pending'),
    ($3,'niceic','TEST-fresh','pending')`, [id(20),id(21),id(22)]);
  await query('INSERT INTO admin_verification_tasks (contractor_id,admin_id) VALUES ($1,$3),($2,$3)', [id(20),id(21),id(1)]);
  assert.equal((await query('SELECT queue_status FROM admin_verification_queue WHERE id=$1', [id(20)]))[0].queue_status, 'incomplete');
  assert.deepEqual(await assigned(), [{ count: 1 }]);
  assert.deepEqual(
    await query('SELECT status, admin_id FROM admin_verification_tasks WHERE contractor_id=$1', [id(20)]),
    [{ status: 'open', admin_id: id(1) }]
  );
  await db.exec(readFileSync('supabase/migrations/20261125145152_admin_verification_mobile_compat.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261125145830_admin_verification_assignment_schema_compat.sql', 'utf8'));
  await query(`INSERT INTO contractor_documents (contractor_id,verification_type,review_status) VALUES
    ($1,'identity','pending'),($1,'business_licence','pending')`, [id(23)]);
  assert.deepEqual((await query('SELECT queue_status FROM admin_verification_queue WHERE id=ANY($1::uuid[]) ORDER BY id', [[20,21,22,23].map(id)])).map((row) => row.queue_status),
    ['ready','incomplete','ready','ready']);
  assert.deepEqual(await assigned(), [{ count: 2 }]);
  assert.deepEqual(await assigned(), [{ count: 0 }]);
  assert.deepEqual(await query('SELECT status FROM admin_verification_tasks WHERE contractor_id=ANY($1::uuid[]) ORDER BY contractor_id', [[20,21,22,23].map(id)]),
    [{status:'open'},{status:'open'},{status:'open'},{status:'open'}]);
  await query(`INSERT INTO credential_verifications (user_id,register,registration_number,status,created_at)
    VALUES ($1,'gas_safe','TEST-migrated','rejected',now()+interval '1 second')`, [id(20)]);
  assert.equal((await query('SELECT queue_status FROM admin_verification_queue WHERE id=$1', [id(20)]))[0].queue_status, 'incomplete');
  await assigned();
  assert.equal((await query('SELECT status FROM admin_verification_tasks WHERE contractor_id=$1', [id(20)]))[0].status, 'open');

  console.log(
    'Admin verification states and assignment, evidence deadlines, audience eligibility, delivery references and access grants passed.'
  );
} finally {
  await db.close();
}
