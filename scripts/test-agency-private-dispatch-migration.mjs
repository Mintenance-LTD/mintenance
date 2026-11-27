import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(
  process.env.PGLITE_MODULE || '@electric-sql/pglite'
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [
  org,
  otherOrg,
  property,
  otherProperty,
  ticket,
  otherTicket,
  owner,
  coordinator,
  landlord,
  alternateOwner,
  contractor,
  anotherContractor,
  otherManager,
] = Array.from({ length: 13 }, (_, i) => id(i + 1));
const people = [
  [owner, 'owner', 'homeowner'],
  [coordinator, 'staff', 'homeowner'],
  [landlord, 'landlord', 'homeowner'],
  [alternateOwner, 'partner', 'homeowner'],
  [contractor, 'trade', 'contractor'],
  [anotherContractor, 'othertrade', 'contractor'],
  [otherManager, 'manager', 'homeowner'],
];
let checks = 0;
const equal = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const denied = async (p, code) => {
  await assert.rejects(p, (e) => e.code === code);
  checks++;
};
const value = async (q, args = []) => (await db.query(q, args)).rows[0]?.value;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, banned_until timestamptz);
    CREATE TABLE organizations(id uuid PRIMARY KEY, organization_type text);
    CREATE TABLE profiles(id uuid PRIMARY KEY, first_name text, last_name text, deleted_at timestamptz, role text);
    CREATE TABLE properties(id uuid PRIMARY KEY,org_id uuid,property_name text,address text);
    CREATE TABLE organization_memberships(org_id uuid,user_id uuid,status text,org_role text);
    CREATE TABLE maintenance_tickets(id uuid PRIMARY KEY,org_id uuid,property_id uuid,reported_by uuid,status text,title text);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    INSERT INTO organizations VALUES ('${org}','agency'),('${otherOrg}','agency');
    INSERT INTO properties VALUES ('${property}','${org}','TEST ONLY House',null),('${otherProperty}','${otherOrg}','TEST ONLY Other',null);
    INSERT INTO organization_memberships VALUES ('${org}','${owner}','active','owner'),('${org}','${coordinator}','active','maintenance_coordinator'),('${otherOrg}','${otherManager}','active','manager');
    INSERT INTO maintenance_tickets VALUES ('${ticket}','${org}','${property}','${owner}','open','TEST ONLY internal case title'),('${otherTicket}','${otherOrg}','${otherProperty}','${otherManager}','open','Other ticket');
  `);
  for (const [user, label, role] of people) {
    await db.query('INSERT INTO profiles VALUES($1,$2,null,null,$3)', [
      user,
      label,
      role,
    ]);
    await db.query('INSERT INTO auth.users VALUES($1,$2,now(),null)', [
      user,
      `${label}@test.invalid`,
    ]);
  }
  for (const migration of [
    '20261126232847_agency_repair_work_orders.sql',
    '20261126233143_agency_landlord_records.sql',
    '20261127002937_agency_private_dispatch.sql',
  ]) {
    await db.exec(
      readFileSync(
        new URL('../supabase/migrations/' + migration, import.meta.url),
        'utf8'
      )
    );
  }
  const dispatch = (actor, command = null, ticketId = ticket) =>
    value('SELECT public.agency_private_dispatch($1,$2,$3) AS value', [
      ticketId,
      actor,
      command ? JSON.stringify(command) : null,
    ]);
  const inbox = (actor) =>
    value('SELECT public.agency_private_work_inbox($1) AS value', [actor]);
  const crmInput = {
    displayName: 'TEST landlord',
    approvalLimitPence: 15000,
    primaryManagerId: owner,
    backupManagerId: coordinator,
    propertyIds: [property],
  };
  const crm = (changes, landlordId = null) =>
    value('SELECT public.agency_landlord_directory($1,$2,$3,$4) AS value', [
      org,
      owner,
      landlordId,
      JSON.stringify(changes),
    ]);
  const link = (landlordId, email, actor = owner) =>
    value('SELECT public.set_agency_landlord_identity($1,$2,$3,$4) AS value', [
      org,
      landlordId,
      actor,
      email,
    ]);
  const cmd = (action, draft, extra = {}) => ({
    action,
    revision: draft.revision,
    ...(action === 'quote' ? {} : { quoteVersion: draft.quoteVersion }),
    ...extra,
  });

  await db.exec('SET ROLE service_role');
  const { landlord: record } = await crm(crmInput);
  const initial = await dispatch(owner);
  equal(
    [initial.revision, initial.quoteVersion, initial.authorization],
    [0, null, 'no_quote']
  );
  await denied(
    dispatch(
      coordinator,
      cmd('quote', initial, { quotePence: 24000, quoteScope: 'Repair tap' })
    ),
    '55000'
  );
  await denied(link(record.id, 'landlord@test.invalid', coordinator), 'P0002');
  await denied(link(record.id, 'owner@test.invalid'), '22023');
  await denied(link(record.id, 'unknown@test.invalid'), '22023');
  await denied(link(record.id, 'trade@test.invalid'), '22023');
  equal(await link(record.id, 'Landlord@test.invalid'), { linked: true });
  equal(
    await value(
      'SELECT public.get_agency_landlord_identity($1,$2,$3) AS value',
      [org, record.id, owner]
    ),
    { linked: true }
  );
  await denied(dispatch(landlord), 'P0002');
  await denied(dispatch(owner, null, otherTicket), 'P0002');

  await value('SELECT public.agency_repair_work_order($1,$2,$3) AS value', [
    ticket,
    owner,
    JSON.stringify({
      revision: 0,
      arrangement: 'agency_contractor',
      contractorName: 'TEST Plumber',
      quotedPence: 24000,
      approvedPence: 24000,
      approvalReference: 'Legacy staff-entered only',
    }),
  ]);
  const create240 = cmd('quote', initial, {
    quotePence: 24000,
    quoteScope: 'Replace leaking tap',
  });
  const draft = await dispatch(coordinator, create240);
  equal(
    [draft.quoteVersion, draft.quotePence, draft.decision, draft.authorization],
    [1, 24000, null, 'approval_required']
  );
  equal((await dispatch(coordinator, create240)).revision, 1);
  equal(
    (await inbox(landlord)).map((v) => v.ticketId),
    [ticket]
  );
  equal(await inbox(contractor), []);
  await denied(dispatch(contractor), 'P0002');
  const toTrade = { contractorEmail: 'trade@test.invalid' };
  await denied(dispatch(coordinator, cmd('dispatch', draft, toTrade)), '55000');
  await denied(dispatch(coordinator, cmd('approve', draft)), '42501');
  await denied(dispatch(alternateOwner, cmd('approve', draft)), 'P0002');
  equal((await dispatch(landlord)).title, 'Private work order');
  const decide240 = cmd('approve', draft);
  const approved240 = await dispatch(landlord, decide240);
  equal(approved240.authorization, 'landlord_approved');
  equal((await dispatch(landlord, decide240)).revision, approved240.revision);
  const revised = await dispatch(
    coordinator,
    cmd('quote', approved240, {
      quotePence: 27500,
      quoteScope: 'Replace leaking tap and isolation valve',
    })
  );
  equal(
    [
      revised.quoteVersion,
      revised.quotePence,
      revised.decision,
      revised.authorization,
    ],
    [2, 27500, null, 'approval_required']
  );
  await denied(dispatch(landlord, cmd('approve', draft)), '40001');
  await denied(
    dispatch(coordinator, cmd('dispatch', revised, toTrade)),
    '55000'
  );
  const approved275 = await dispatch(landlord, cmd('approve', revised));
  equal(approved275.authorization, 'landlord_approved');
  equal(await link(record.id, null), { linked: false });
  equal(await inbox(landlord), []);
  equal((await dispatch(owner)).authorization, 'no_landlord');
  await denied(
    dispatch(coordinator, cmd('dispatch', approved275, toTrade)),
    '55000'
  );
  equal(await link(record.id, 'landlord@test.invalid'), { linked: true });
  equal((await dispatch(landlord)).decision, null);
  const approvedAgain = await dispatch(landlord, cmd('approve', approved275));
  const send = cmd('dispatch', approvedAgain, toTrade);
  const sent = await dispatch(coordinator, send);
  equal(sent.contractorId, contractor);
  equal((await dispatch(coordinator, send)).revision, sent.revision);
  equal(
    (await inbox(contractor)).map((v) => [
      v.ticketId,
      v.quotePence,
      v.quoteScope,
      v.approvalLimitPence,
      v.decision,
      v.authorization,
    ]),
    [
      [
        ticket,
        27500,
        'Replace leaking tap and isolation valve',
        null,
        null,
        null,
      ],
    ]
  );
  equal(await inbox(anotherContractor), []);
  equal((await dispatch(landlord)).contractorId, null);
  await denied(
    dispatch(
      coordinator,
      cmd('quote', sent, { quotePence: 28000, quoteScope: 'Update' })
    ),
    '55000'
  );
  const accept = cmd('accept', sent);
  const accepted = await dispatch(contractor, accept);
  equal(typeof accepted.acceptedAt, 'string');
  equal((await dispatch(contractor, accept)).revision, accepted.revision);
  const revoked = await dispatch(coordinator, cmd('revoke', accepted));
  equal([revoked.dispatchedAt, revoked.contractorId], [null, null]);
  equal(await inbox(contractor), []);
  await denied(dispatch(contractor), 'P0002');
  const below = await dispatch(
    coordinator,
    cmd('quote', revoked, {
      quotePence: 14900,
      quoteScope: 'Replacement washer',
    })
  );
  equal(below.authorization, 'within_limit');
  const rejected = await dispatch(landlord, cmd('reject', below));
  equal(
    [rejected.decision, rejected.authorization],
    ['rejected', 'approval_required']
  );
  await denied(
    dispatch(coordinator, cmd('dispatch', rejected, toTrade)),
    '55000'
  );
  const fresh = await dispatch(
    coordinator,
    cmd('quote', rejected, {
      quotePence: 15000,
      quoteScope: 'Replacement washer and retest',
    })
  );
  equal(fresh.authorization, 'within_limit');
  const final = await dispatch(coordinator, cmd('dispatch', fresh, toTrade));
  equal(final.contractorId, contractor);
  equal(
    await value(
      'SELECT count(*)::integer AS value FROM public.agency_dispatch_quotes'
    ),
    4
  );
  equal(
    await value(
      'SELECT count(*)::integer AS value FROM public.agency_dispatch_assignments WHERE revoked_at IS NOT NULL'
    ),
    1
  );
  equal(
    await value(
      'SELECT count(*)::integer AS value FROM public.agency_dispatch_decisions'
    ),
    4
  );
  equal(
    await value(
      'SELECT count(*)::integer AS value FROM public.agency_dispatch_events WHERE command ? $1',
      ['contractorEmail']
    ),
    0
  );
  console.log(`${checks} private dispatch database checks passed`);
} finally {
  await db.close();
}
