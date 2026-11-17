import { expect, it } from 'vitest';
import { disputePageCsv } from '@/app/admin/disputes/components/export-disputes';
import type { Dispute } from '@/app/admin/disputes/components/DisputesTable';
it('exports pence accurately and neutralizes spreadsheet formula injection', () => {
  const csv = disputePageCsv([
    {
      id: 'payment',
      jobTitle: ' =HYPERLINK("bad")',
      homeownerName: 'QA, Payer',
      contractorName: 'QA\nContractor',
      amount: 1.2,
      updatedAt: '2026-07-17T14:02:00Z',
    } as Dispute,
  ]);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"1.20"');
  expect(csv).toContain('"\' =HYPERLINK(""bad"")"');
  expect(csv).toContain('"QA, Payer"');
  expect(csv).toContain('15:02');
});
