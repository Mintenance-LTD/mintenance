/** Real PostgreSQL transactions and signed-in reads. No external notification delivery. */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createAuthenticatedClient,
  createServiceClient,
} from '../../test/integration/supabase-test-client';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';

describe('visit rescheduling concurrency and client confirmation (local database)', () => {
  const db = createServiceClient();
  const ids = [randomUUID(), randomUUID()];
  let contractor: TestUser, client: TestUser, outsider: TestUser;
  const day = '2099-12-01';
  beforeAll(async () => {
    contractor = await createTestUser({ role: 'contractor' });
    client = await createTestUser({ role: 'homeowner' });
    outsider = await createTestUser({ role: 'contractor' });
    const result = await db.from('appointments').insert(
      ids.map((id, i) => ({
        id,
        contractor_id: contractor.id,
        client_id: client.id,
        title: 'itest_synthetic_reschedule',
        appointment_date: day,
        start_time: i ? '13:00' : '09:00',
        end_time: i ? '14:30' : '10:30',
        status: 'confirmed',
        client_response: 'confirmed',
        client_response_at: new Date().toISOString(),
      }))
    );
    if (result.error) throw result.error;
  });
  afterAll(async () => {
    await db.from('appointments').delete().in('id', ids);
    for (const actor of [contractor, client, outsider].filter(Boolean)) {
      await db.from('notification_queue').delete().eq('user_id', actor.id);
      await actor.cleanup();
    }
  });
  it('admits exactly one competing slot, resets confirmation and queues only the winner', async () => {
    const old = ids.map((_, i) => ({
      date: day,
      start: i ? '13:00' : '09:00',
      end: i ? '14:30' : '10:30',
    }));
    const changes = old.map((expected) => ({
      appointmentDate: day,
      startTime: '11:00',
      endTime: '12:30',
      status: 'rescheduled',
      expected,
    }));
    // Concurrent REST RPCs use independent real database transactions.
    const attempts = await Promise.all(
      ids.map((id, i) =>
        db.rpc('update_contractor_appointment', {
          p_actor: contractor.id,
          p_id: id,
          p_changes: changes[i],
        })
      )
    );
    expect(attempts.filter((r) => !r.error)).toHaveLength(1);
    expect(attempts.filter((r) => r.error).map((r) => r.error!.code)).toEqual([
      '23P01',
    ]);
    const winner = attempts.findIndex((r) => !r.error);
    const saved = await db
      .from('appointments')
      .select('*')
      .eq('id', ids[winner])
      .single();
    expect(saved.error).toBeNull();
    expect(saved.data).toMatchObject({
      status: 'rescheduled',
      duration_minutes: 90,
      client_response: 'pending',
      client_response_at: null,
    });
    const queue = await db
      .from('notification_queue')
      .select('metadata,action_url')
      .eq('user_id', client.id)
      .eq('notification_type', 'appointment_update');
    expect(queue.error).toBeNull();
    expect(queue.data).toHaveLength(1);
    expect(queue.data![0]).toMatchObject({
      action_url: '/appointments/' + ids[winner],
      metadata: { appointmentId: ids[winner] },
    });
    const homeowner = await createAuthenticatedClient(
      client.email,
      client.password
    );
    const visible = await homeowner
      .from('appointments')
      .select('id,start_time,end_time,client_response')
      .eq('id', ids[winner]);
    expect(visible.error).toBeNull();
    expect(visible.data).toHaveLength(1);
    expect(visible.data![0]).toMatchObject({
      start_time: '11:00:00',
      end_time: '12:30:00',
      client_response: 'pending',
    });
    // The public client cannot invoke the service-only actor-parameter RPC.
    const forbidden = await homeowner.rpc('update_contractor_appointment', {
      p_actor: contractor.id,
      p_id: ids[winner],
      p_changes: changes[winner],
    });
    expect(forbidden.error).not.toBeNull();
    const wrongActor = await db.rpc('update_contractor_appointment', {
      p_actor: outsider.id,
      p_id: ids[winner],
      p_changes: changes[winner],
    });
    expect(wrongActor.error?.code).toBe('42501');
    const stale = await db.rpc('respond_to_visit', {
      p_actor: client.id,
      p_id: ids[winner],
      p_date: day,
      p_start: old[winner].start,
      p_end: old[winner].end,
      p_response: 'confirmed',
    });
    expect(stale.error?.code).toBe('40001');
    const confirmed = await db.rpc('respond_to_visit', {
      p_actor: client.id,
      p_id: ids[winner],
      p_date: day,
      p_start: '11:00',
      p_end: '12:30',
      p_response: 'confirmed',
    });
    expect(confirmed.error).toBeNull();
    const reply = await db
      .from('notification_queue')
      .select('action_url')
      .eq('user_id', contractor.id)
      .eq('notification_type', 'appointment_update');
    expect(reply.error).toBeNull();
    expect(reply.data).toEqual([
      { action_url: '/contractor/appointments/' + ids[winner] },
    ]);
  });
});
