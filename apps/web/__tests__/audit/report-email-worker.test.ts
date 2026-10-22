import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  read: vi.fn(),
  ack: vi.fn(),
  send: vi.fn(),
}));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/email-service', () => ({ EmailService: { sendEmail: m.send } }));
vi.mock('@/lib/reports/followup', () => ({
  REPORT_ORIGIN: 'https://www.mintenance.co.uk',
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: m.read }) }),
      update: () => ({ eq: () => ({ eq: m.ack }) }),
    }),
  },
}));
import { GET } from '@/app/api/cron/tenant-report-email/route';
beforeEach(() => {
  vi.resetAllMocks();
  m.rpc.mockResolvedValue({
    data: [{ report_id: 'report', message_id: 'message', lease_id: 'lease' }],
  });
  m.ack.mockResolvedValue({ error: null });
});
it('does not email an unverified or disabled resident', async () => {
  m.read.mockResolvedValue({
    data: {
      email: 'resident@example.test',
      enabled: false,
      verified_at: '2026-01-01',
    },
  });
  await GET(undefined as never, undefined as never);
  expect(m.send).not.toHaveBeenCalled();
  expect(m.ack).toHaveBeenCalledWith('lease_id', 'lease');
});
it('keeps failed delivery pending for a later claim', async () => {
  m.read.mockResolvedValue({
    data: {
      email: 'resident@example.test',
      enabled: true,
      verified_at: '2026-01-01',
    },
  });
  m.send.mockResolvedValue(false);
  await expect(GET(undefined as never, undefined as never)).rejects.toThrow(
    'deliveries failed'
  );
  expect(m.ack).not.toHaveBeenCalled();
});
it('acknowledges only the claimed lease after successful delivery', async () => {
  m.read.mockResolvedValue({
    data: {
      email: 'resident@example.test',
      enabled: true,
      verified_at: '2026-01-01',
    },
  });
  m.send.mockResolvedValue(true);
  await GET(undefined as never, undefined as never);
  expect(m.ack).toHaveBeenCalledWith('lease_id', 'lease');
  expect(m.send.mock.calls[0][0].text).toContain(
    'https://www.mintenance.co.uk/maintenance/report-access'
  );
});
