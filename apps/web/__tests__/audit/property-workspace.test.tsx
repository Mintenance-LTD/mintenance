import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PropertyFileHub } from '@/app/properties/[id]/components/PropertyFileHub';
import PropertyAssessments from '@/app/properties/[id]/components/PropertyAssessments';
import { MintEditorialPropertyAccess } from '@/app/properties/[id]/components/MintEditorialPropertyAccess';
import { MintEditorialPropertyTimeline } from '@/app/properties/[id]/components/MintEditorialPropertyTimeline';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'X-CSRF-Token': 'test' }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const ok = (data: unknown) => ({ ok: true, json: async () => data });
it('filters document rows and keeps the details panel aligned with visible files', async () => {
  mocks.fetch.mockResolvedValue(
    ok({
      documents: [
        {
          id: 'lease',
          name: 'Lease.pdf',
          kind: 'lease',
          created_at: '2026-10-12',
        },
        {
          id: 'invoice',
          name: 'Repair.pdf',
          kind: 'invoice',
          created_at: '2026-10-13',
        },
      ],
      hasMore: false,
    })
  );
  render(<PropertyFileHub propertyId='property' certificateCount={0} />);
  await screen.findByRole('button', { name: 'Details for Lease.pdf' });
  fireEvent.change(screen.getByLabelText('Filter file type'), {
    target: { value: 'invoice' },
  });
  expect(
    screen.queryByRole('button', { name: 'Details for Lease.pdf' })
  ).toBeNull();
  expect(
    within(screen.getByRole('complementary')).getByText('Repair.pdf')
  ).toBeDefined();
  fireEvent.change(screen.getByLabelText('Search files on this page'), {
    target: { value: 'missing' },
  });
  expect(screen.getByText('No matching files')).toBeDefined();
  expect(
    screen.queryByRole('button', { name: 'Download document' })
  ).toBeNull();
});
it('rejects oversized documents before upload and retains valid file selection after a failed save', async () => {
  mocks.fetch.mockResolvedValue(ok({ documents: [], hasMore: false }));
  render(<PropertyFileHub propertyId='property' />);
  await screen.findByText('No property files yet');
  const big = new File(['x'], 'large.pdf', { type: 'application/pdf' });
  Object.defineProperty(big, 'size', { value: 3145729 });
  fireEvent.change(screen.getByLabelText('Choose file'), {
    target: { files: [big] },
  });
  expect(screen.getByRole('alert').textContent).toContain('up to 3 MB');
  expect(
    screen.queryByRole('button', { name: 'Upload selected file' })
  ).toBeNull();
  const file = new File(['%PDF-1.7'], 'lease.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('Choose file'), {
    target: { files: [file] },
  });
  mocks.fetch.mockResolvedValueOnce({ ok: false });
  fireEvent.click(screen.getByRole('button', { name: 'Upload selected file' }));
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Upload failed')
  );
  expect(screen.getByText('lease.pdf')).toBeDefined();
  expect(
    screen.getByRole('button', { name: 'Upload selected file' })
  ).toBeEnabled();
  expect(mocks.fetch.mock.calls[1][1].headers['X-CSRF-Token']).toBe('test');
});
it('shows the highest priority assessment and updates the next action when filtering', async () => {
  mocks.fetch.mockResolvedValue(
    ok({
      assessments: [
        {
          id: 'routine',
          damageType: 'Paint wear',
          urgency: 'monitor',
          validationStatus: 'completed',
          createdAt: '2026-10-12',
          ricsConditionRating: 1,
          needsOnsiteInspection: false,
        },
        {
          id: 'urgent',
          damageType: 'Electrical hazard',
          urgency: 'urgent',
          validationStatus: 'pending',
          createdAt: '2026-09-12',
          ricsConditionRating: 3,
          needsOnsiteInspection: true,
          confidence: 70,
        },
      ],
    })
  );
  render(<PropertyAssessments propertyId='property' />);
  const panel = await screen.findByRole('complementary', {
    name: 'Assessment details',
  });
  expect(
    within(panel)
      .getByRole('link', { name: 'View full assessment' })
      .getAttribute('href')
  ).toBe('/building-assessments/urgent');
  fireEvent.change(screen.getByLabelText('Search assessments'), {
    target: { value: 'Paint' },
  });
  expect(
    within(panel)
      .getByRole('link', { name: 'View full assessment' })
      .getAttribute('href')
  ).toBe('/building-assessments/routine');
  expect(
    within(panel).queryByRole('link', { name: 'Arrange inspection' })
  ).toBeNull();
});
it('normalises empty access values, cancels edits, and sends only changed fields', async () => {
  mocks.fetch.mockResolvedValue(ok({ success: true }));
  render(
    <MintEditorialPropertyAccess
      propertyId='property'
      jobs={[]}
      initialAccess={{
        access_mode: 'in_person',
        access_notes: ' ',
        key_safe_code: null,
        stopcock_location: null,
        gas_isolator_location: null,
        consumer_unit_location: null,
      }}
    />
  );
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Access instructions'), {
    target: { value: 'Park by the gate' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Access instructions')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Water stopcock'), {
    target: { value: ' Under the sink ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({
    stopcock_location: 'Under the sink',
  });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  );
});
it('filters timeline creation events without implying completion timestamps', () => {
  render(
    <MintEditorialPropertyTimeline
      jobs={[
        {
          id: 'old',
          title: 'Completed repair',
          status: 'completed',
          category: 'plumbing',
          amount: 100,
          date: '2025-01-01',
          contractor: null,
        },
        {
          id: 'new',
          title: 'Open repair',
          status: 'assigned',
          category: 'electrical',
          amount: 0,
          date: '2026-01-01',
          contractor: null,
        },
      ]}
    />
  );
  fireEvent.change(screen.getByLabelText('Activity year'), {
    target: { value: '2025' },
  });
  expect(screen.queryByText('Open repair')).toBeNull();
  expect(screen.getByText('Completed repair')).toBeDefined();
  expect(screen.getByText('Plumbing job created')).toBeDefined();
  expect(screen.queryByText(/job completed/i)).toBeNull();
});
