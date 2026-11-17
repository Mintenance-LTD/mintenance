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
await db.exec('SET ROLE authenticated');
await rejects(update(), /permission denied/);
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
eq(
  (await db.query('SELECT count(*)::int AS n FROM notification_queue')).rows[0]
    .n,
  1
);
eq(
  (await db.query('SELECT action_url FROM notification_queue')).rows[0]
    .action_url,
  '/appointments/response'
);
await update();
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
await update({ status: 'completed' });
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
await db.close();
console.log(
  `${n} PostgreSQL visit assertions passed: scope, stale edits, overlaps, duration, response reset, terminal states and single durable notification.`
);
