const m = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: m.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { setting_value: 'operator@example.test' },
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock('@/lib/email-service', () => ({ EmailService: { sendEmail: m.send } }));
import { OperatorAlertService } from '../OperatorAlertService';
it('sends an actionable coverage alert without claiming emergency dispatch or including tenant details', async () => {
  m.rpc
    .mockResolvedValueOnce({
      data: {
        id: 'alert',
        job_name: 'emergency-reports',
        lease_token: 'lease',
      },
      error: null,
    })
    .mockResolvedValueOnce({ data: true, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  m.send.mockResolvedValue(true);
  expect(await OperatorAlertService.deliverPending()).toEqual({
    sent: 1,
    failed: 0,
  });
  expect(m.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'operator@example.test',
      subject: '[Mintenance operator] emergency-reports needs attention',
      text: expect.stringContaining('arrange property-team coverage'),
    })
  );
  expect(m.send.mock.calls[0][0].text).toContain('not an acknowledgment');
  expect(m.rpc.mock.calls.map(([name]) => name)).not.toContain(
    'acknowledge_emergency_report'
  );
});
