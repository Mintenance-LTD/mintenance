import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MintEditorialRecurringTasks } from '@/app/landlord/recurring/MintEditorialRecurringTasks';
import { RecurringTasksClient } from '@/app/landlord/recurring/RecurringTasksClient';
import PropertyRecurringMaintenance from '@/app/properties/[id]/components/RecurringMaintenance';
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({}),
  getCsrfToken: async () => 'test-token',
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('renders structured API errors as text and preserves the unsaved task', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schedules: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'BAD_REQUEST', message: 'The due date is invalid' },
        }),
      })
  );
  render(<PropertyRecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Add recurring schedule' })
  );
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: 'Synthetic maintenance' },
  });
  fireEvent.change(screen.getByLabelText('First due date'), {
    target: { value: '2030-05-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add Schedule' }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('The due date is invalid')
  );
  expect(screen.getByDisplayValue('Synthetic maintenance')).toBeTruthy();
  expect(toast.success).not.toHaveBeenCalled();
});
it.each([MintEditorialRecurringTasks, RecurringTasksClient])(
  'preserves input and rejects false success on an incomplete server confirmation (%#)',
  async (Component) => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetch);
    render(
      <Component
        properties={[
          { id: 'property', property_name: 'Synthetic property', address: '' },
        ]}
        schedules={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^New task$/i }));
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
    expect(
      screen.getByDisplayValue('Synthetic boiler inspection')
    ).toBeTruthy();
    expect(screen.getByDisplayValue('2027-12-15')).toBeTruthy();
  }
);

it('shows a property schedule read failure with retry rather than an empty list', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ schedules: [] }) });
  vi.stubGlobal('fetch', fetch);
  render(<PropertyRecurringMaintenance propertyId='property' />);
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.queryByText(/No recurring schedules yet/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry schedules' }));
  await waitFor(() =>
    expect(screen.getByText(/No recurring schedules yet/)).toBeTruthy()
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Add recurring schedule' })
  );
  expect(screen.queryByRole('option', { name: 'Weekly' })).toBeNull();
  expect(screen.getByRole('option', { name: 'Every 6 months' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Annually' })).toBeTruthy();
});

it('preserves the property form after an unconfirmed save and prevents double taps', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ schedules: [] }) })
    .mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetch);
  render(<PropertyRecurringMaintenance propertyId='property' />);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Add recurring schedule' })
    ).toBeTruthy()
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Add recurring schedule' })
  );
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: 'Synthetic maintenance' },
  });
  fireEvent.change(screen.getByLabelText('First due date'), {
    target: { value: '2027-12-15' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add Schedule' }));
  fireEvent.click(screen.getByRole('button', { name: /Add Schedule|Saving/ }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('could not be confirmed')
    )
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('Synthetic maintenance')).toBeTruthy();
});

it('sends the original schedule version and preserves edits when another manager changed it', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      schedules: [
        {
          id: 'schedule',
          title: 'Boiler service',
          frequency: 'annual',
          next_due_date: '2027-01-01',
          is_active: true,
          updated_at: '2026-09-22T12:00:00Z',
        },
      ],
    }),
  });
  vi.stubGlobal('fetch', fetch);
  render(<PropertyRecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit Boiler service' })
  );
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: 'Updated boiler service' },
  });
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Schedule changed. Reload before editing.' }),
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      'Schedule changed. Reload before editing.'
    )
  );
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
    scheduleId: 'schedule',
    expected_updated_at: '2026-09-22T12:00:00Z',
    title: 'Updated boiler service',
  });
  expect(fetch.mock.calls[1][1].method).toBe('PATCH');
  expect(screen.getByDisplayValue('Updated boiler service')).toBeTruthy();
  expect(toast.success).not.toHaveBeenCalled();
});

it('keeps a schedule visible and reports a failed delete', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      schedules: [
        {
          id: 'schedule',
          title: 'Boiler service',
          frequency: 'annual',
          next_due_date: '2027-01-01',
          is_active: true,
        },
      ],
    }),
  });
  vi.stubGlobal('fetch', fetch);
  render(<PropertyRecurringMaintenance propertyId='property' />);
  const remove = await screen.findByRole('button', {
    name: 'Remove Boiler service',
  });
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Removal failed. Retry.' }),
  });
  fireEvent.click(remove);
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Removal failed. Retry.')
  );
  expect(screen.getByText('Boiler service')).toBeTruthy();
  expect(toast.success).not.toHaveBeenCalled();
});
