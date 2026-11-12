import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { quotesCsv } from '@/app/contractor/(dashboard)/quotes/components/QuoteExport';
import { MintEditorialJobsList } from '@/app/jobs/components/MintEditorialJobsList';

afterEach(cleanup);
it('exports exact pence, escapes CSV text, and neutralizes spreadsheet formulas', () => {
  const csv = quotesCsv([
    {
      id: 'a',
      jobTitle: '=HYPERLINK("bad")',
      customerName: 'Test, customer',
      status: 'sent',
      amount: 1.5,
      createdDate: '2026-11-12',
      expiryDate: null,
    },
  ]);
  expect(csv).toContain('"1.50"');
  expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  expect(csv).toContain('"Test, customer"');
});
it('combines category and status filters and resets empty results', () => {
  render(
    <MintEditorialJobsList
      jobs={[
        {
          id: 'a',
          title: 'Tap repair',
          category: 'plumbing',
          status: 'posted',
          budget: 150,
          created_at: '2026-11-12',
        },
        {
          id: 'b',
          title: 'Paint walls',
          category: 'painting',
          status: 'completed',
          budget: 150,
          created_at: '2026-11-12',
        },
      ]}
    />
  );
  fireEvent.change(screen.getByLabelText('Filter jobs by category'), {
    target: { value: 'plumbing' },
  });
  expect(screen.getByText('Tap repair')).toBeVisible();
  expect(screen.queryByText('Paint walls')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Done/ }));
  expect(screen.getByText('No jobs match this filter.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'See all jobs' }));
  expect(screen.getByText('Paint walls')).toBeVisible();
});
