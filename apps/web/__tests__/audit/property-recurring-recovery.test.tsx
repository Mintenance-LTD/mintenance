import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RecurringMaintenance from '@/app/properties/[id]/components/RecurringMaintenance';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'test' }));
const schedule = {
  id: 'schedule',
  property_id: 'property',
  title: 'Boiler service',
  category: 'heating',
  frequency: 'annual',
  next_due_date: '2030-01-01',
  is_active: true,
  updated_at: '2026-11-01T12:00:00Z',
};
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
const list = (row = schedule) => response({ schedules: [row] });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it.each([false, true])(
  'retains a conflicted draft through failed refresh, then requires explicit latest-version editing (plan=%s)',
  async (plan) => {
    const latest = {
      ...schedule,
      title: 'Latest boiler service',
      updated_at: '2026-11-02T12:00:00Z',
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(list())
      .mockResolvedValueOnce(
        response({ error: 'Schedule changed. Reload before editing.' }, 409)
      )
      .mockResolvedValueOnce(response({}, 500))
      .mockResolvedValueOnce(list(latest))
      .mockResolvedValueOnce(
        response({
          schedule: {
            ...latest,
            title: 'Reviewed boiler service',
            updated_at: '2026-11-03T12:00:00Z',
          },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<RecurringMaintenance propertyId='property' plan={plan} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit Boiler service' })
    );
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'My retained draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await screen.findByText(/Your draft is retained/);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(fetch).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh schedules' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry schedules' })
    );
    await screen.findByText('Latest boiler service');
    expect(screen.getByDisplayValue('My retained draft')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Discard draft and edit latest Latest boiler service',
      })
    );
    expect(screen.getByLabelText('Task title')).toHaveValue(
      'Latest boiler service'
    );
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Reviewed boiler service' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Schedule updated')
    );
    expect(JSON.parse(fetch.mock.calls[4][1].body)).toMatchObject({
      expected_updated_at: latest.updated_at,
    });
  }
);

it('guards pause with the displayed revision and does not claim a stale confirmation succeeded', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockResolvedValueOnce(
      response({
        schedule: { ...schedule, is_active: false },
      })
    );
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  await screen.findByText(/Refresh schedules before another action/);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    scheduleId: schedule.id,
    is_active: false,
    expected_updated_at: schedule.updated_at,
  });
  expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Resume' })).toBeNull();
});

it('accepts a confirmed pause and resumes using its new revision', async () => {
  const paused = {
    ...schedule,
    is_active: false,
    updated_at: '2026-11-02T12:00:00Z',
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockResolvedValueOnce(response({ schedule: paused }))
    .mockResolvedValueOnce(
      response({
        schedule: {
          ...paused,
          is_active: true,
          updated_at: '2026-11-03T12:00:00Z',
        },
      })
    );
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Resume' }));
  await screen.findByRole('button', { name: 'Pause' });
  expect(JSON.parse(fetch.mock.calls[2][1].body).expected_updated_at).toBe(
    paused.updated_at
  );
});

it('keeps draft fields unchanged during save and blocks double submission', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockReturnValueOnce(pending.promise);
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit Boiler service' })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saving...' }));
  expect(screen.getByLabelText('Task title')).toBeDisabled();
  expect(screen.getByLabelText('Notification audience')).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Refresh schedules' })
  ).toBeDisabled();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await act(async () =>
    pending.resolve(response({ error: { message: 'Check the due date' } }, 400))
  );
  expect(screen.getByLabelText('Task title')).not.toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Save Changes' })
  ).not.toBeDisabled();
  expect(toast.error).toHaveBeenCalledWith('Check the due date');
});

it('hides stale controls during refresh and preserves an ordinary unsaved draft', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockReturnValueOnce(pending.promise);
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit Boiler service' })
  );
  fireEvent.change(screen.getByLabelText('Task title'), {
    target: { value: 'Unsaved work' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh schedules' }));
  expect(screen.getByRole('status')).toHaveTextContent('Loading schedules');
  expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  await act(async () => pending.resolve(list()));
  expect(screen.getByLabelText('Task title')).toHaveValue('Unsaved work');
});

it('isolates property drafts and ignores an old property save result', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(response({ schedules: [] }));
  vi.stubGlobal('fetch', fetch);
  const view = render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit Boiler service' })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  view.rerender(<RecurringMaintenance propertyId='another' />);
  await screen.findByText(/No recurring tasks yet/);
  await act(async () =>
    pending.resolve(
      response({
        schedule: { ...schedule, updated_at: '2026-11-02T12:00:00Z' },
      })
    )
  );
  expect(screen.queryByLabelText('Task title')).toBeNull();
  expect(screen.queryByText('Boiler service')).toBeNull();
  expect(toast.success).not.toHaveBeenCalled();
});

it('aborts an old property read and ignores a response that arrives after cancellation', async () => {
  const pending = deferred<ReturnType<typeof response>>();
  const fetch = vi
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(response({ schedules: [] }));
  vi.stubGlobal('fetch', fetch);
  const view = render(<RecurringMaintenance propertyId='property' />);
  const signal = fetch.mock.calls[0][1].signal as AbortSignal;
  view.rerender(<RecurringMaintenance propertyId='another' />);
  expect(signal.aborted).toBe(true);
  await screen.findByText(/No recurring tasks yet/);
  await act(async () => pending.resolve(list()));
  expect(screen.queryByText('Boiler service')).toBeNull();
});

it('rejects malformed schedule rows rather than crashing in rendering', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(response({ schedules: [{ id: 'broken' }] }))
  );
  render(<RecurringMaintenance propertyId='property' />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Incomplete schedules'
  );
  expect(screen.queryByText(/No recurring tasks yet/)).toBeNull();
});

it('shows a bounded timeout as retryable failure rather than indefinite loading', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    )
  );
  render(<RecurringMaintenance propertyId='property' />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(screen.getByRole('alert')).toHaveTextContent('Loading took too long');
  expect(screen.getByRole('button', { name: 'Retry schedules' })).toBeTruthy();
});

it('explains unavailable property access without showing editable cached schedules', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockResolvedValueOnce(response({}, 403));
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Refresh schedules' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Access unavailable'
  );
  expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
});

it('keeps today due until the London day ends and distinguishes paused records', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2030-07-01T23:30:00Z')); // Already 2 July in London.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      response({
        schedules: [
          { ...schedule, next_due_date: '2030-07-02' },
          {
            ...schedule,
            id: 'paused',
            title: 'Paused task',
            next_due_date: '2030-07-01',
            is_active: false,
          },
          {
            ...schedule,
            id: 'late',
            title: 'Overdue task',
            next_due_date: '2030-07-01',
          },
        ],
      })
    )
  );
  render(<RecurringMaintenance propertyId='property' />);
  expect(await screen.findByText('Due: 02/07/2030')).toBeTruthy();
  expect(
    screen.getByText('Paused · recorded due date: 01/07/2030')
  ).toBeTruthy();
  expect(screen.getAllByText('Overdue: 01/07/2030')).toHaveLength(1);
});

it('requires reload after an uncertain removal and closes only a confirmed removed editor', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(list())
    .mockResolvedValueOnce(
      response({ error: { message: 'Removal could not be confirmed' } }, 500)
    )
    .mockResolvedValueOnce(list())
    .mockResolvedValueOnce(
      response({ success: true, scheduleId: schedule.id })
    );
  vi.stubGlobal('fetch', fetch);
  render(<RecurringMaintenance propertyId='property' />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Edit Boiler service' })
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove Boiler service' })
  );
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Removal could not be confirmed')
  );
  expect(
    screen.getByRole('button', { name: 'Remove Boiler service' })
  ).toBeDisabled();
  expect(screen.getByLabelText('Task title')).toHaveValue('Boiler service');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh schedules' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Remove Boiler service' })
  );
  await waitFor(() =>
    expect(toast.success).toHaveBeenCalledWith('Schedule removed')
  );
  expect(screen.queryByLabelText('Task title')).toBeNull();
  expect(screen.queryByText('Boiler service')).toBeNull();
});
