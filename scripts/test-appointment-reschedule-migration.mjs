import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE TABLE appointments(id uuid PRIMARY KEY,contractor_id uuid,client_id uuid,job_id uuid,title text,appointment_date date,start_time time,end_time time,notes text,status text,client_response text DEFAULT 'pending',client_response_at timestamptz,cancellation_reason text,cancelled_at timestamptz,completed_at timestamptz,duration_minutes integer,reminder_sent boolean,reminder_sent_at timestamptz,updated_at timestamptz,CONSTRAINT appointments_status_check CHECK(status IN('scheduled','confirmed','completed','cancelled','no_show','rescheduled')),CHECK(start_time<end_time));
CREATE TABLE notification_queue(user_id uuid,notification_type text,priority text,title text,message text,action_url text,metadata jsonb,scheduled_for timestamptz);
CREATE TABLE notifications(type text,title text,message text,metadata jsonb,read boolean);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261117012806_appointment_reschedule_safety.sql',
      import.meta.url
    ),
    'utf8'
  )
);
await db.query(
  `INSERT INTO appointments(id,contractor_id,client_id,title,appointment_date,start_time,end_time,status,client_response,client_response_at,notes) VALUES($1,$2,$3,'Test visit','2099-01-01','09:00','10:30','confirmed','confirmed',now(),'Original access instructions')`,
  [id(1), id(2), id(3)]
);
await db.query(
  `INSERT INTO appointments(id,contractor_id,title,appointment_date,start_time,end_time,status) VALUES($1,$2,'Other visit','2099-01-01','12:00','13:00','rescheduled')`,
  [id(4), id(2)]
);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261123231656_appointment_visit_history.sql',
      import.meta.url
    ),
    'utf8'
  )
);
const change = {
  appointmentDate: '2099-01-01',
  startTime: '10:00',
  endTime: '11:30',
  rescheduleReason: 'Client requested',
  expected: { date: '2099-01-01', start: '09:00', end: '10:30' },
};
const update = (changes = change, actor = id(2)) =>
  db.query('SELECT * FROM update_contractor_appointment($1,$2,$3)', [
    actor,
    id(1),
    JSON.stringify(changes),
  ]);
let n = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  n++;
};
const rejects = async (p, re) => {
  await assert.rejects(p, re);
  n++;
};
const oldCopy = 'Test visit was moved. Please confirm the new visit time.';
const neutralCopy =
  'Test visit was moved. View visit for the latest time and status.';
const visitMetadata = JSON.stringify({ appointmentId: id(1) });
await db.query(
  `INSERT INTO notifications VALUES ('appointment_update','Visit rescheduled',$1,$2,true),
    ('appointment_update','Visit response received',$1,$2,false)`,
  [oldCopy, visitMetadata]
);
await db.query(
  `INSERT INTO notification_queue (notification_type,title,message,metadata)
    VALUES ('appointment_update','Visit rescheduled',$1,$2)`,
  [oldCopy, visitMetadata]
);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261124171707_neutral_visit_reschedule_alerts.sql',
      import.meta.url
    ),
    'utf8'
  )
);
eq(
  (await db.query('SELECT message,read FROM notifications ORDER BY read DESC'))
    .rows,
  [
    { message: neutralCopy, read: true },
    { message: oldCopy, read: false },
  ]
);
eq((await db.query('DELETE FROM notification_queue RETURNING message')).rows, [
  { message: neutralCopy },
]);
await db.exec('SET ROLE authenticated');
await rejects(update(), /permission denied/);
await rejects(
  db.query('SELECT * FROM appointment_visit_history'),
  /permission denied/
);
await db.exec('RESET ROLE;SET ROLE service_role');
await rejects(update(change, id(8)), /unavailable/);
await rejects(update({ ...change, endTime: '09:30' }), /End time/);
await rejects(
  update({ ...change, startTime: '12:30', endTime: '13:30' }),
  /overlaps/
);
await rejects(
  update({ ...change, expected: { ...change.expected, start: '08:00' } }),
  /Visit changed/
);
await rejects(
  update({ ...change, contractor_id: id(8) }),
  /Invalid appointment/
);
const row = (await update()).rows[0];
eq(row.duration_minutes, 90);
eq(row.status, 'rescheduled');
eq(row.client_response, 'pending');
eq(row.client_response_at, null);
eq(row.notes, 'Original access instructions\n\nRescheduled: Client requested');
const readHistory = async () =>
  (
    await db.query(
      'SELECT kind, previous_slot, slot FROM appointment_visit_history WHERE appointment_id=$1 ORDER BY id',
      [id(1)]
    )
  ).rows;
const [rescheduled] = await readHistory();
eq(rescheduled.kind, 'rescheduled');
eq(rescheduled.previous_slot.start, '09:00:00');
eq(rescheduled.previous_slot.end, '10:30:00');
eq(rescheduled.previous_slot.respondedBy, id(3));
eq(rescheduled.slot.start, '10:00:00');
eq(rescheduled.slot.end, '11:30:00');
eq(rescheduled.slot.response, 'pending');
eq(rescheduled.slot.respondedBy, null);
const respond = (actor, start, end) =>
  db.query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
    actor,
    id(1),
    '2099-01-01',
    start,
    end,
    'confirmed',
  ]);
await rejects(respond(id(3), '09:00', '10:30'), /Visit changed/);
await rejects(respond(id(8), '10:00', '11:30'), /Visit unavailable/);
eq(
  (await db.query('SELECT count(*)::int AS n FROM notification_queue')).rows[0]
    .n,
  1
);
eq(
  (await db.query('SELECT action_url FROM notification_queue')).rows[0]
    .action_url,
  '/appointments/' + id(1)
);
eq(
  (await db.query('SELECT message FROM notification_queue')).rows[0].message,
  'Test visit is now scheduled for 01 Jan 2099 at 10:00 UK time. View visit for the latest time and status.'
);
await update();
eq((await readHistory()).length, 1);
eq(
  (await db.query('SELECT count(*)::int AS n FROM notification_queue')).rows[0]
    .n,
  1
);
await rejects(
  db.query(
    `INSERT INTO appointments(id,contractor_id,title,appointment_date,start_time,end_time,status) VALUES($1,$2,'Racing insert','2099-01-01','11:00','12:00','scheduled')`,
    [id(9), id(2)]
  ),
  /overlaps/
);
await db.query(
  `INSERT INTO appointments(id,contractor_id,title,appointment_date,start_time,end_time,status) VALUES($1,$2,'Adjacent visit','2099-01-01','13:00','14:00','scheduled')`,
  [id(9), id(2)]
);
eq(
  (await db.query('SELECT count(*)::int AS n FROM appointments')).rows[0].n,
  3
);
await respond(id(3), '10:00', '11:30');
await respond(id(3), '10:00', '11:30');
eq(
  (
    await db.query(
      'SELECT action_url FROM notification_queue WHERE user_id=$1',
      [id(2)]
    )
  ).rows,
  [{ action_url: '/contractor/appointments/' + id(1) }]
);
const [, confirmed] = await readHistory();
eq((await readHistory()).length, 2);
eq(confirmed.kind, 'response');
eq(confirmed.slot.response, 'confirmed');
eq(confirmed.slot.start, '10:00:00');
eq(confirmed.slot.respondedBy, id(3));
await update({ status: 'completed' });
eq((await readHistory()).at(-1).slot.status, 'completed');
await rejects(
  update({ ...change, startTime: '08:00', endTime: '09:00' }),
  /visit has ended/
);
await rejects(update({ status: 'scheduled' }), /visit has ended/);
await db
  .query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
    id(3),
    id(1),
    '2099-01-01',
    '10:00',
    '11:30',
    'confirmed',
  ])
  .then(
    () => assert.fail('Completed visit must not confirm'),
    () => {
      n++;
    }
  );
await db.query(
  `INSERT INTO appointments(id,contractor_id,client_id,title,appointment_date,start_time,end_time,status) VALUES($1,$2,$3,'Earlier visit','2020-11-17','09:00','17:00','scheduled')`,
  [id(10), id(2), id(3)]
);
await rejects(
  db.query('SELECT * FROM update_contractor_appointment($1,$2,$3)', [
    id(2),
    id(10),
    JSON.stringify({
      ...change,
      appointmentDate: '2099-02-01',
      expected: { date: '2020-11-17', start: '09:00', end: '17:00' },
    }),
  ]),
  /create a new visit/
);
await rejects(
  db.query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
    id(3),
    id(10),
    '2020-11-17',
    '09:00',
    '17:00',
    'confirmed',
  ]),
  /visit has ended/
);
eq(
  (
    await db.query('SELECT client_response FROM appointments WHERE id=$1', [
      id(10),
    ])
  ).rows[0].client_response,
  'pending'
);
eq(
  (
    await db.query(
      'SELECT count(*)::int AS n FROM appointment_visit_history WHERE appointment_id=$1',
      [id(10)]
    )
  ).rows[0].n,
  1
);
await rejects(
  db.query(
    `UPDATE appointment_visit_history SET kind='status' WHERE appointment_id=$1`,
    [id(10)]
  ),
  /permission denied/
);
await db.exec(`
  RESET ROLE;
  CREATE TABLE public.jobs (
    id uuid PRIMARY KEY, property_id uuid, homeowner_id uuid,
    is_rental_property boolean, status text, started_at timestamptz
  );
  CREATE TABLE public.anonymous_reports (
    id uuid PRIMARY KEY, property_id uuid, job_id uuid, status text,
    conversation_key_hash text
  );
  CREATE TABLE public.report_messages (
    id uuid PRIMARY KEY, report_id uuid, author_role text, body text
  );
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY, name text, public boolean,
    file_size_limit integer, allowed_mime_types text[]
  );
`);
for (const filename of [
  '20261022195038_tenant_report_followup.sql',
  '20261124172408_resident_repair_case_updates.sql',
]) {
  await db.exec(
    readFileSync(
      new URL(`../supabase/migrations/${filename}`, import.meta.url),
      'utf8'
    )
  );
}
await db.query("INSERT INTO jobs VALUES ($1,$2,$3,true,'assigned',NULL)", [
  id(20),
  id(21),
  id(3),
]);
await db.query(
  `INSERT INTO anonymous_reports VALUES
    ($1,$2,$3,'converted',NULL), ($4,$2,$3,'converted',NULL),
    ($5,$6,$3,'converted',NULL)`,
  [id(22), id(21), id(20), id(23), id(24), id(25)]
);
await db.query(
  `INSERT INTO report_email_access (report_id,email,verified_at,enabled)
    VALUES ($1,'verified@example.invalid',now(),true),
           ($2,'unverified@example.invalid',NULL,true)`,
  [id(22), id(23)]
);
await db.query(
  `INSERT INTO appointments(id,contractor_id,client_id,job_id,title,appointment_date,start_time,end_time,status)
    VALUES($1,$2,$3,$4,'Case visit','2099-02-01','09:00','10:00','scheduled')`,
  [id(26), id(2), id(3), id(20)]
);
await db.exec('SET ROLE service_role');
await db.query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
  id(3),
  id(26),
  '2099-02-01',
  '09:00',
  '10:00',
  'change_requested',
]);
eq(
  (await db.query('SELECT count(*)::int AS n FROM report_email_outbox')).rows[0]
    .n,
  0
);
for (let retry = 0; retry < 2; retry++) {
  await db.query('SELECT respond_to_visit($1,$2,$3,$4,$5,$6)', [
    id(3),
    id(26),
    '2099-02-01',
    '09:00',
    '10:00',
    'confirmed',
  ]);
}
await db.exec('RESET ROLE');
await db.query(
  `UPDATE jobs SET status='in_progress',started_at=now() WHERE id=$1`,
  [id(20)]
);
await db.query(`UPDATE jobs SET status='completed' WHERE id=$1`, [id(20)]);
eq(
  (
    await db.query(
      `SELECT report_email_outbox.report_id,body FROM report_email_outbox JOIN report_messages ON message_id=id ORDER BY body`
    )
  ).rows,
  [
    { report_id: id(22), body: 'The contractor has started work.' },
    {
      report_id: id(22),
      body: 'Visit confirmed for 01 Feb 2099, 09:00–10:00 UK time.',
    },
    { report_id: id(22), body: 'Work completed.' },
  ]
);
eq(
  (
    await db.query(
      'SELECT count(*)::int AS n FROM report_messages WHERE report_id=$1',
      [id(24)]
    )
  ).rows[0].n,
  0
);
await db.close();
console.log(
  `${n} PostgreSQL visit assertions passed: scope, concurrent-edit guards, response reset, slot history, confirmation attribution and idempotency.`
);
