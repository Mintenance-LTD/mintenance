import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createAnonClient,
  createAuthenticatedClient,
  createServiceClient,
} from '../../test/integration/supabase-test-client';
import {
  createTestUser,
  createTestEscrow,
  createTestPayment,
  type TestUser,
} from '../../test/integration/fixtures';

const db = createServiceClient();
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const users: TestUser[] = [];
const jobIds: string[] = [];
const eventIds = Array.from({ length: 4 }, () => randomUUID());
const loginIds = [randomUUID(), randomUUID()];
const tokenIds = [randomUUID(), randomUUID()];
let heldEscrow: Awaited<ReturnType<typeof createTestEscrow>>;
let settledPayment: Awaited<ReturnType<typeof createTestPayment>>;
let disputeId: string;
let messageId: string;

async function requireSuccess(result: { error: unknown }) {
  expect(result.error).toBeNull();
}
describe('bounded maintenance preserves financial and dispute evidence', () => {
  beforeAll(async () => {
    for (const role of [
      'homeowner',
      'homeowner',
      'homeowner',
      'homeowner',
      'contractor',
    ] as const) {
      users.push(await createTestUser({ role }));
    }
    for (const [index, days] of [
      [0, 100],
      [1, 30],
      [2, 100],
    ]) {
      await requireSuccess(
        await db
          .from('profiles')
          .update({
            deleted_at: ago(days),
            phone: '+447700900123',
            address: 'Synthetic private address',
          })
          .eq('id', users[index].id)
      );
    }
    // Two eligible old jobs; held escrow, open dispute, active and recent jobs.
    const definitions = [
      { status: 'completed', days: 400, owner: 3 },
      { status: 'cancelled', days: 400, owner: 3 },
      { status: 'completed', days: 400, owner: 2 },
      { status: 'completed', days: 400, owner: 3 },
      { status: 'assigned', days: 400, owner: 3 },
      { status: 'completed', days: 20, owner: 3 },
    ];
    for (const definition of definitions) {
      const id = randomUUID();
      await requireSuccess(
        await db.from('jobs').insert({
          id,
          title: 'itest_retention_job',
          description: 'Original evidence',
          location: 'Synthetic location',
          homeowner_id: users[definition.owner].id,
          contractor_id: users[4].id,
          status: definition.status,
          category: 'plumbing',
          urgency: 'medium',
          budget_min: 100,
          budget_max: 500,
          created_at: ago(definition.days),
          updated_at: ago(definition.days),
          completed_at:
            definition.status === 'completed' ? ago(definition.days) : null,
        })
      );
      jobIds.push(id);
    }
    heldEscrow = await createTestEscrow({
      job_id: jobIds[2],
      payer_id: users[2].id,
      payee_id: users[4].id,
      status: 'held',
    });
    settledPayment = await createTestPayment({
      job_id: jobIds[0],
      payer_id: users[3].id,
      payee_id: users[4].id,
      status: 'completed',
      amount: 250,
    });
    disputeId = randomUUID();
    await requireSuccess(
      await db
        .from('disputes')
        .insert({
          id: disputeId,
          job_id: jobIds[3],
          raised_by: users[3].id,
          against: users[4].id,
          reason: 'quality',
          description: 'Original dispute evidence',
          status: 'open',
        })
    );
    messageId = randomUUID();
    await requireSuccess(
      await db
        .from('messages')
        .insert({
          id: messageId,
          job_id: jobIds[0],
          sender_id: users[3].id,
          receiver_id: users[4].id,
          content: 'Original message evidence',
          message_type: 'text',
        })
    );
    await requireSuccess(
      await db.from('webhook_events').insert(
        eventIds.map((id, index) => ({
          id,
          idempotency_key: id,
          event_id: `evt_${id}`,
          event_type: 'payment_intent.succeeded',
          source: 'stripe',
          payload: {
            syntheticPrivateField: 'retain only until processed payload expiry',
          },
          status: ['processed', 'failed', 'pending', 'processed'][index],
          created_at: ago(20),
          processed_at: index === 0 ? ago(10) : index === 3 ? ago(1) : null,
        }))
      )
    );
    await requireSuccess(
      await db
        .from('login_attempts')
        .insert(
          loginIds.map((id, index) => ({
            id,
            email: 'itest_retention@test.local',
            created_at: ago(index === 0 ? 100 : 1),
          }))
        )
    );
    await requireSuccess(
      await db
        .from('password_reset_tokens')
        .insert(
          tokenIds.map((id, index) => ({
            id,
            user_id: users[3].id,
            token: randomUUID(),
            expires_at: ago(index === 0 ? 10 : -1),
          }))
        )
    );
  });

  afterAll(async () => {
    await requireSuccess(
      await db.from('webhook_events').delete().in('id', eventIds)
    );
    await requireSuccess(
      await db.from('login_attempts').delete().in('id', loginIds)
    );
    await requireSuccess(
      await db.from('password_reset_tokens').delete().in('id', tokenIds)
    );
    if (disputeId)
      await requireSuccess(
        await db.from('disputes').delete().eq('id', disputeId)
      );
    await heldEscrow?.cleanup();
    await settledPayment?.cleanup();
    if (jobIds.length)
      await requireSuccess(await db.from('jobs').delete().in('id', jobIds));
    for (const user of users.reverse()) await user.cleanup();
  });

  it('cleans expired data, defers held accounts and preserves recovery windows', async () => {
    const result = await db.rpc('run_retention_cleanup');
    expect(result.error).toBeNull();
    expect(result.data.profile_contacts_anonymized).toBe(1);
    expect(result.data.profiles_deferred_for_review).toBeGreaterThanOrEqual(1);
    const read = await db
      .from('profiles')
      .select('id, email, phone, address, contact_anonymized_at')
      .in(
        'id',
        users.slice(0, 3).map((user) => user.id)
      );
    expect(read.error).toBeNull();
    expect(read.data?.find((row) => row.id === users[0].id)).toMatchObject({
      email: `deleted_${users[0].id}@deleted.invalid`,
      phone: null,
      address: null,
    });
    for (const index of [1, 2])
      expect(
        read.data?.find((row) => row.id === users[index].id)
      ).toMatchObject({ phone: '+447700900123', contact_anonymized_at: null });
    const logins = await db
      .from('login_attempts')
      .select('id')
      .in('id', loginIds);
    expect(logins.data).toEqual([{ id: loginIds[1] }]);
    const tokens = await db
      .from('password_reset_tokens')
      .select('id')
      .in('id', tokenIds);
    expect(tokens.data).toEqual([{ id: tokenIds[1] }]);
  });
  it('preserves webhook deduplication and failed or recently processed payloads', async () => {
    const read = await db
      .from('webhook_events')
      .select('id, payload, status')
      .in('id', eventIds);
    expect(read.error).toBeNull();
    expect(read.data).toHaveLength(4);
    expect(read.data?.find((row) => row.id === eventIds[0])).toMatchObject({
      payload: {},
      status: 'processed',
    });
    for (const id of eventIds.slice(1))
      expect(read.data?.find((row) => row.id === id)?.payload).toHaveProperty(
        'syntheticPrivateField'
      );
    const replay = await db.rpc('check_webhook_idempotency', {
      p_idempotency_key: eventIds[0],
      p_event_type: 'payment_intent.succeeded',
      p_event_id: `evt_${eventIds[0]}`,
      p_source: 'stripe',
      p_payload: {},
    });
    expect(replay.error).toBeNull();
    expect(replay.data?.[0]?.is_duplicate).toBe(true);
    const retry = await db.rpc('run_retention_cleanup');
    expect(retry.error).toBeNull();
    expect(retry.data.processed).toBe(0);
  });
  it('archives bounded concurrent batches without deleting linked records', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        db.rpc('archive_old_records', { months_threshold: 12, batch_size: 1 })
      )
    );
    for (const result of results) {
      expect(result.error).toBeNull();
      expect(result.data.archived).toBeGreaterThanOrEqual(0);
      expect(result.data.archived).toBeLessThanOrEqual(1);
    }
    // SKIP LOCKED may defer a row; a subsequent run must pick up any remaining
    // work, with exactly two distinct jobs archived across all three calls.
    const drain = await db.rpc('archive_old_records', {
      months_threshold: 12,
      batch_size: 500,
    });
    expect(drain.error).toBeNull();
    expect(
      results.reduce((sum, result) => sum + result.data.archived, 0) +
        drain.data.archived
    ).toBe(2);
    const jobs = await db
      .from('jobs')
      .select('id, archived_at, description')
      .in('id', jobIds);
    expect(jobs.error).toBeNull();
    expect(jobs.data).toHaveLength(6);
    for (const id of jobIds.slice(0, 2))
      expect(jobs.data?.find((row) => row.id === id)?.archived_at).toBeTruthy();
    for (const id of jobIds.slice(2))
      expect(jobs.data?.find((row) => row.id === id)?.archived_at).toBeNull();
    const payment = await db
      .from('payments')
      .select('amount, status')
      .eq('id', settledPayment.id)
      .single();
    expect(payment.data).toMatchObject({ amount: 250, status: 'completed' });
    const message = await db
      .from('messages')
      .select('content')
      .eq('id', messageId)
      .single();
    expect(message.data?.content).toBe('Original message evidence');
    const dispute = await db
      .from('disputes')
      .select('description, status')
      .eq('id', disputeId)
      .single();
    expect(dispute.data).toMatchObject({
      description: 'Original dispute evidence',
      status: 'open',
    });
    const retry = await db.rpc('archive_old_records', {
      months_threshold: 12,
      batch_size: 500,
    });
    expect(retry.error).toBeNull();
    expect(retry.data.archived).toBe(0);
  });
  it('rejects unsafe batch/age parameters and app-user execution', async () => {
    for (const args of [
      { months_threshold: 1, batch_size: 500 },
      { months_threshold: 12, batch_size: 501 },
      { months_threshold: 12, batch_size: 0 },
    ]) {
      expect((await db.rpc('archive_old_records', args)).error).not.toBeNull();
    }
    const client = await createAuthenticatedClient(
      users[3].email,
      users[3].password
    );
    for (const role of [createAnonClient(), client]) {
      expect((await role.rpc('run_retention_cleanup')).error).not.toBeNull();
      expect(
        (
          await role.rpc('archive_old_records', {
            months_threshold: 12,
            batch_size: 1,
          })
        ).error
      ).not.toBeNull();
    }
  });
});
