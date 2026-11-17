// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  owner: 'actor',
  error: null as null | { code: string },
  options: {} as Record<string, unknown>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: Record<string, unknown>, fn: Function) => {
    m.options = options;
    return (request: NextRequest) =>
      fn(request, { user: { id: 'actor' }, params: { id: 'visit' } });
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc },
}));
import { PATCH } from '@/app/api/contractor/appointments/[id]/route';
const old = { date: '2099-12-01', start: '09:00:00', end: '10:30:00' };
const input = {
  appointmentDate: '2099-12-02',
  startTime: '10:00',
  endTime: '11:30',
  expected: old,
  rescheduleReason: 'Client requested another day',
};
const call = (body: unknown = input) =>
  PATCH(
    new NextRequest('https://example.test/api/contractor/appointments/visit', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.owner = 'actor';
  m.error = null;
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({
      data: {
        id: 'visit',
        contractor_id: m.owner,
        appointment_date: old.date,
        start_time: old.start,
        end_time: old.end,
      },
      error: null,
    }),
    single: async () => ({
      data: { id: 'visit', status: 'rescheduled' },
      error: null,
    }),
  };
  m.from.mockReturnValue(q);
  m.rpc.mockImplementation(async () => ({ data: 'visit', error: m.error }));
});
it('requires contractor authorization and default CSRF', () => {
  expect(m.options.roles).toEqual(['contractor']);
  expect(m.options.csrf).not.toBe(false);
});
it('rejects another contractor before atomic mutation', async () => {
  m.owner = 'someone-else';
  await expect(call()).rejects.toMatchObject({ statusCode: 403 });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('requires the original slot instead of silently overwriting a concurrent edit', async () => {
  await expect(call({ ...input, expected: undefined })).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
it('preserves the exact expected slot and explicit 90-minute interval', async () => {
  expect((await call()).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith('update_contractor_appointment', {
    p_actor: 'actor',
    p_id: 'visit',
    p_changes: input,
  });
});
it.each(['40001', '23P01'])(
  'returns a readable conflict for %s',
  async (code) => {
    m.error = { code };
    await expect(call()).rejects.toMatchObject({ statusCode: 409 });
  }
);
it('rejects a nonexistent UK DST time before writing', async () => {
  await expect(
    call({
      ...input,
      appointmentDate: '2027-03-28',
      startTime: '01:30',
      endTime: '03:00',
    })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(m.rpc).not.toHaveBeenCalled();
});
