import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
import { assertJobTravelAllowed } from '@/lib/contractor/job-travel';
import { BidAcceptanceAgent } from '@/lib/services/agents/BidAcceptanceAgent';
import {
  appointmentTime,
  appointmentDuration,
  appointmentAddress,
} from '@/lib/scheduling/appointment-display';
let rows: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  rows = {
    jobs: { contractor_id: 'c', status: 'assigned' },
    escrow_transactions: { id: 'e' },
    contracts: {
      id: 'agreement',
      status: 'accepted',
      cancellation_deadline: '2099-01-01',
    },
    contract_consents: { early_start_requested: false },
  };
  m.from.mockImplementation((table: string) => {
    const query: Record<string, unknown> = {};
    for (const name of ['select', 'eq', 'limit']) query[name] = () => query;
    query.single = query.maybeSingle = async () => ({
      data: rows[table],
      error: null,
    });
    return query;
  });
});
it('blocks travel during the cancellation wait without explicit early-start consent', async () => {
  await expect(assertJobTravelAllowed('job', 'c')).rejects.toThrow(
    'Wait until the cancellation deadline'
  );
});
it('allows a funded signed job with explicit early-start consent', async () => {
  rows.contract_consents = { early_start_requested: true };
  await expect(assertJobTravelAllowed('job', 'c')).resolves.toBeUndefined();
});
it('blocks cancellation requests even when early start was requested', async () => {
  rows.contract_consents = { early_start_requested: true };
  rows.contracts = {
    id: 'agreement',
    status: 'accepted',
    cancellation_deadline: '2020-01-01',
    cancellation_requested_at: '2026-11-01',
  };
  await expect(assertJobTravelAllowed('job', 'c')).rejects.toThrow(
    'support review'
  );
});
it('checks assignment before reading financial or agreement data', async () => {
  await expect(assertJobTravelAllowed('job', 'another')).rejects.toThrow(
    'Not assigned'
  );
  expect(m.from).toHaveBeenCalledTimes(1);
});
it('does not let automatic acceptance mutate bids or bypass the checked homeowner workflow', async () => {
  await expect(
    BidAcceptanceAgent.evaluateAutoAccept('bid', 'job', 'owner')
  ).resolves.toBeNull();
  expect(m.from).not.toHaveBeenCalled();
});
it('formats an eight-hour visit clearly and removes duplicate address segments', () => {
  expect(appointmentTime('09:00:00', '17:00:00')).toBe('09:00–17:00');
  expect(appointmentDuration('480m')).toBe('8h');
  expect(appointmentDuration('90m')).toBe('1h 30m');
  expect(
    appointmentAddress('1 Test Street, London, 1 Test Street, London')
  ).toBe('1 Test Street, London');
});
