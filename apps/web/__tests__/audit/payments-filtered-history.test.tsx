import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import PaymentsPage from '@/app/payments/page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'homeowner', role: 'homeowner' } }),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({ useCSRF: () => ({}) }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => vi.fn(),
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: React.PropsWithChildren) => children,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete document.documentElement.dataset.theme;
});

it('includes a second-page refund in the filtered table, totals and CSV', async () => {
  document.documentElement.dataset.theme = 'mint-editorial';
  const today = new Date().toISOString();
  const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
  const payments = Array.from({ length: 25 }, (_, i) => ({
    id: `payment-${i + 1}`,
    job: { title: `Repair ${i + 1}` },
    amount: 10,
    remainingAmount: i === 24 ? 9.25 : 10,
    status: 'released',
    createdAt: i < 24 ? today : old,
    updatedAt: today,
  }));
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        payments: payments.slice(0, 20),
        nextCursor: today,
        nextCursorId: 'payment-20',
      })
    )
    .mockResolvedValueOnce(Response.json({ payments: payments.slice(20) }));
  vi.stubGlobal('fetch', fetcher);
  const csv = vi.fn();
  vi.stubGlobal('Blob', csv);
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: vi.fn(() => 'blob:payments'),
      revokeObjectURL: vi.fn(),
    })
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  render(<PaymentsPage />);
  const exportButton = screen.getByRole('button', { name: 'Export CSV' });
  expect(exportButton).toBeDisabled();
  const next = await screen.findByRole('button', { name: 'Next' });
  expect(screen.getByText('Showing 1–20 of 25 payments')).toBeInTheDocument();
  expect(screen.queryByText('Repair 25')).not.toBeInTheDocument();
  expect(fetcher.mock.calls[1][0]).toContain('cursorId=payment-20');
  fireEvent.click(next);
  expect(screen.getByText('Repair 25')).toBeInTheDocument();
  const refundTile = () =>
    within(screen.getByText('Refunded', { selector: '.label' }).parentElement!);
  expect(refundTile().getByText('£0.75')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Refunded', exact: true })
  );
  expect(screen.getByText('Repair 25')).toBeInTheDocument();
  expect(screen.queryByText('Repair 21')).not.toBeInTheDocument();
  fireEvent.click(exportButton);
  const [body] = csv.mock.calls[0][0] as string[];
  expect(body).toContain('"Repair 25","10.00","0.75","9.25","Released"');
  expect(body).not.toContain('Repair 21');

  fireEvent.change(screen.getByRole('combobox'), { target: { value: '7d' } });
  expect(screen.queryByText('Repair 25')).not.toBeInTheDocument();
  expect(refundTile().getByText('£0.00')).toBeInTheDocument();
  expect(exportButton).toBeDisabled();
});
