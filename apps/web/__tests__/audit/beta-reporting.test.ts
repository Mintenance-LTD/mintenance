import {
  collectReportRows,
  contractorReport,
  reportingCsv,
} from '@/lib/contractor/reporting';
const now = new Date('2026-11-14T12:00:00Z');
const data = {
  jobs: [
    {
      id: 'older-job',
      status: 'completed',
      category: 'gardening',
      homeowner_id: 'customer',
      created_at: '2026-09-01T12:00:00Z',
    },
    {
      id: 'new-job',
      status: 'assigned',
      category: 'plumbing',
      homeowner_id: 'customer',
      created_at: '2026-11-13T12:00:00Z',
    },
  ],
  payments: [
    {
      job_id: 'older-job',
      amount: 100,
      contractor_payout: 88,
      platform_fee: 12,
      released_at: '2026-11-13T12:00:00Z',
    },
    {
      job_id: 'older-job',
      amount: 50,
      contractor_payout: 44,
      platform_fee: 6,
      released_at: '2026-11-01T12:00:00Z',
    },
  ],
  bids: [
    { status: 'accepted', created_at: '2026-11-13T12:00:00Z' },
    { status: 'rejected', created_at: '2026-11-13T12:00:00Z' },
    { status: 'accepted', created_at: '2026-11-01T12:00:00Z' },
  ],
  reviews: [{ rating: 5, created_at: '2026-11-13T12:00:00Z' }],
};
it('uses release dates independently of job creation and changes all period cohorts', () => {
  const week = contractorReport(data, '7days', now),
    month = contractorReport(data, '30days', now);
  expect(week.totalRevenue).toBe(88);
  expect(month.totalRevenue).toBe(132);
  expect(week.averageJobValue).toBe(88);
  expect(week.winRate).toBe(50);
  expect(month.totalBids).toBe(3);
  expect(
    week.jobsByCategory.find((row) => row.category === 'gardening')?.revenue
  ).toBe(88);
  expect(week.dailyRevenue).toEqual([
    { date: '2026-11-13', revenue: 88, jobs: 1 },
  ]);
  expect(week.activeClients).toBe(0);
});
it('creates a usable CSV with the selected period and released amount definition', () => {
  const csv = reportingCsv(contractorReport(data, '7days', now), '7days');
  expect(csv).toContain('"Period","7days"');
  expect(csv).toContain('"2026-11-13","88.00","1"');
  expect(csv).toContain('not confirmed bank payouts');
});
it('fetches beyond the first 500 rows and fails closed on page errors', async () => {
  const page = vi
    .fn()
    .mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, id) => ({ id })),
      error: null,
    })
    .mockResolvedValueOnce({ data: [{ id: 500 }], error: null });
  expect(await collectReportRows(page)).toHaveLength(501);
  expect(page).toHaveBeenLastCalledWith(500, 999);
  await expect(
    collectReportRows(() =>
      Promise.resolve({ data: null, error: new Error('offline') })
    )
  ).rejects.toThrow('could not be loaded');
});

it('does not silently count gross receipts as net earnings when fee evidence is missing', () => {
  expect(() =>
    contractorReport(
      {
        ...data,
        payments: [
          { ...data.payments[0], contractor_payout: null, platform_fee: null },
        ],
      },
      '30days',
      now
    )
  ).toThrow(/reconciliation/);
});
