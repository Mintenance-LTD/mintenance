import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MintEditorialPropertyDetail } from '@/app/properties/[id]/components/MintEditorialPropertyDetail';
import PropertyDocumentPage from '@/app/properties/[id]/documents/[documentId]/page';
import InspectionPage from '@/app/properties/[id]/inspections/[reportId]/page';
import ReceiptPage from '@/app/payments/[transactionId]/page';

const navigation = vi.hoisted(() => ({
  search: 'tab=timeline',
  transactionId: 'receipt',
  push: vi.fn(),
  user: { id: 'owner' },
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  useParams: () => ({ transactionId: navigation.transactionId }),
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: navigation.user, loading: false }),
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: React.PropsWithChildren) => children,
}));
vi.mock('@/app/properties/[id]/components/MintEditorialPropertyManage', () => ({
  MintEditorialPropertyManage: () => <div>Management tools</div>,
}));

const property = {
  id: 'property',
  name: 'Test home',
  address: 'Test street',
  type: 'house',
  bedrooms: 1,
  bathrooms: 1,
  squareFeet: 0,
  yearBuilt: 0,
  images: [],
};
const date = '2026-11-23T12:00:00Z';
const documentPage = () =>
  PropertyDocumentPage({
    params: Promise.resolve({ id: 'property', documentId: 'exact-file' }),
  });
const inspectionPage = () =>
  InspectionPage({
    params: Promise.resolve({ id: 'property', reportId: 'exact-report' }),
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  navigation.push.mockClear();
  navigation.search = 'tab=timeline';
  navigation.transactionId = 'receipt';
});

it('renders exact event links and follows tab changes on the same mounted property', async () => {
  const events = [
    {
      id: 'document-exact-file',
      title: 'Document added: Test.pdf',
      date,
      kind: 'document',
      href: '/properties/property/documents/exact-file',
    },
    {
      id: 'inspection-exact-report',
      title: 'Inspection recorded: Test inspection',
      date,
      kind: 'inspection',
      href: '/properties/property/inspections/exact-report',
    },
    {
      id: 'released-receipt',
      title: 'Payment released',
      date,
      kind: 'payment',
      href: '/payments/receipt',
    },
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ events }))
  );
  const workspace = () => (
    <MintEditorialPropertyDetail
      property={property}
      jobs={[]}
      stats={{ activeJobs: 0, completedJobs: 0, totalSpent: 0 }}
    />
  );
  const { rerender } = render(workspace());
  for (const event of events) {
    expect(
      await screen.findByRole('link', { name: new RegExp(event.title) })
    ).toHaveAttribute('href', event.href);
  }
  navigation.search = 'tab=manage&manage=records';
  rerender(workspace());
  expect(screen.getByRole('tab', { name: 'Manage' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getByText('Management tools')).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Property timeline' })
  ).toBeNull();
});

it('loads the exact PDF on a direct visit and a fresh mount, and opens a fresh file URL', async () => {
  const signedUrl = 'https://storage.example.invalid/exact-file.pdf';
  const fetch = vi.fn(async (_url: string) =>
    Response.json({
      document: { id: 'exact-file', name: 'Exact PDF.pdf' },
      url: signedUrl,
    })
  );
  vi.stubGlobal('fetch', fetch);
  const assign = vi
    .spyOn(window.location, 'assign')
    .mockImplementation(() => {});
  const view = render(await documentPage());
  await screen.findByRole('heading', { name: 'Exact PDF.pdf' });
  view.unmount();
  render(await documentPage());
  await screen.findByRole('heading', { name: 'Exact PDF.pdf' });
  fireEvent.click(screen.getByRole('button', { name: 'Open file' }));
  await waitFor(() => expect(assign).toHaveBeenCalledWith(signedUrl));
  expect(fetch.mock.calls).toHaveLength(3);
  for (const [url] of fetch.mock.calls) {
    expect(url).toBe(
      '/api/properties/property/documents?documentId=exact-file&inline=1'
    );
  }
});

it.each([403, 404])(
  'shows an unavailable file on the exact route (%d)',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status }))
    );
    render(await documentPage());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This file is unavailable'
    );
    expect(screen.queryByRole('button', { name: 'Open file' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Property timeline' })
    ).toHaveAttribute('href', '/properties/property?tab=timeline');
  }
);

it('loads the exact inspection again after refresh and handles an unavailable record', async () => {
  const data = {
    folder: { label: 'Test tenancy' },
    report: {
      id: 'exact-report',
      title: 'Exact inspection',
      kind: 'check_in',
      inspected_on: '2026-11-23',
      notes: 'Inspection notes',
    },
    photos: [],
  };
  const fetch = vi
    .fn()
    .mockImplementationOnce(async () => Response.json(data))
    .mockImplementationOnce(async () => Response.json(data))
    .mockImplementationOnce(async () => new Response(null, { status: 404 }));
  vi.stubGlobal('fetch', fetch);
  for (let visit = 0; visit < 2; visit++) {
    const { unmount } = render(await inspectionPage());
    await screen.findByRole('heading', { name: 'Exact inspection' });
    unmount();
  }
  render(await inspectionPage());
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'records are unavailable'
  );
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/properties/property/inspections/exact-report',
    expect.objectContaining({ cache: 'no-store' })
  );
});

it('keeps a missing receipt at its own URL and retries by the exact payment ID', async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(async () =>
      Response.json({ payments: [{ id: 'other-receipt' }] })
    )
    .mockImplementationOnce(async () =>
      Response.json({
        payments: [
          {
            id: 'receipt',
            payerId: 'owner',
            status: 'released',
            amount: 1.2,
            remainingAmount: 1.2,
            createdAt: date,
            job: { title: 'Exact paid job' },
          },
        ],
      })
    );
  vi.stubGlobal('fetch', fetch);
  render(<ReceiptPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This receipt is unavailable'
  );
  expect(navigation.push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Payment for Exact paid job')).toBeVisible();
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/payments/history?transactionId=receipt',
    expect.objectContaining({ cache: 'no-store' })
  );
});
