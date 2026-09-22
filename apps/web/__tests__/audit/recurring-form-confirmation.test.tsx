import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MintEditorialRecurringTasks } from '@/app/landlord/recurring/MintEditorialRecurringTasks';
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({}) }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('preserves input and rejects false success on an incomplete server confirmation', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetch);
  render(
    <MintEditorialRecurringTasks
      properties={[
        { id: 'property', property_name: 'Synthetic property', address: '' },
      ]}
      schedules={[]}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'New task', exact: true })
  );
  fireEvent.change(screen.getByLabelText('Property', { exact: true }), {
    target: { value: 'property' },
  });
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: 'Synthetic boiler inspection' },
  });
  fireEvent.change(screen.getByLabelText('First due date'), {
    target: { value: '2027-12-15' },
  });
  const form = screen.getByRole('form', { name: 'New recurring task' });
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('could not be confirmed')
    )
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('Synthetic boiler inspection')).toBeTruthy();
  expect(screen.getByDisplayValue('2027-12-15')).toBeTruthy();
});
