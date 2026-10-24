import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({}) }));
import { MintEditorialPropertyAccess } from '@/app/properties/[id]/components/MintEditorialPropertyAccess';
import { PropertyEntryUnavailableNotice } from '@/components/properties/PropertyEntryUnavailableNotice';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('disables access edits after a failed secret lookup and sends no mutation', async () => {
  mocks.fetch.mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', mocks.fetch);
  render(
    <MintEditorialPropertyAccess
      propertyId='synthetic'
      jobs={[]}
      entrySecretUnavailable
      initialAccess={{
        access_mode: 'key_safe',
        key_safe_code: null,
        access_notes: null,
        stopcock_location: null,
        gas_isolator_location: null,
        consumer_unit_location: null,
      }}
    />
  );
  expect(screen.getByLabelText(/Lock-box code/)).toBeDisabled();
  expect(screen.getByRole('status').textContent).toContain(
    'could not be loaded'
  );
  fireEvent.change(screen.getByLabelText('Notes for the contractor'), {
    target: { value: 'Synthetic notes' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Save/ }));
  expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('offers an explicit retry message only on lookup failure', () => {
  const view = render(<PropertyEntryUnavailableNotice unavailable={false} />);
  expect(screen.queryByRole('status')).toBeNull();
  view.rerender(<PropertyEntryUnavailableNotice unavailable />);
  expect(screen.getByRole('status').textContent).toContain('Refresh this page');
});
