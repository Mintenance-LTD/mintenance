import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FollowupForm } from '@/app/properties/work-queue/FollowupForm';
import {
  propertyFollowupDate,
  propertyFollowupDeadline,
} from '@mintenance/shared';
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
const fetcher = vi.fn();
const data = (revision = 3, due_at: string | null = null) => ({
  followup: { revision, assigned_to: null, due_at, waiting_for: 'manager' },
  people: [{ id: 'manager', first_name: 'Property', last_name: 'Manager' }],
  updates: [],
});
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockResolvedValue(response(data()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = {
  propertyId: 'home',
  kind: 'job',
  sourceId: 'repair',
  onSaved: vi.fn(),
};

it.each([
  ['2026-01-15', '2026-01-15T23:59:59.000Z'],
  ['2026-07-15', '2026-07-15T22:59:59.000Z'],
  ['2026-03-29', '2026-03-29T22:59:59.000Z'],
  ['2026-10-25', '2026-10-25T23:59:59.000Z'],
  ['2028-02-29', '2028-02-29T23:59:59.000Z'],
])('stores the end of London day %s', (date, deadline) => {
  expect(propertyFollowupDeadline(date)).toBe(deadline);
  expect(propertyFollowupDate(deadline)).toBe(date);
});
it.each([
  '2026-02-29',
  '2026-02-30',
  '2026-04-31',
  '2026-13-01',
  '2026-7-1',
  'invalid',
])('rejects impossible or incomplete date %s', (date) =>
  expect(propertyFollowupDeadline(date)).toBeNull()
);
it('renders a UK calendar day even when the UTC date differs', () => {
  expect(propertyFollowupDate('2026-07-15T23:30:00Z')).toBe('2026-07-16');
  expect(propertyFollowupDate('invalid')).toBe('');
});
it('saves a summer deadline with the loaded revision and CSRF', async () => {
  render(<FollowupForm {...props} />);
  fireEvent.change(await screen.findByLabelText('Follow up by (UK date)'), {
    target: { value: '2026-07-15' },
  });
  fetcher.mockResolvedValue(response({ followup: { revision: 4 } }));
  fireEvent.click(screen.getByText('Save follow-up'));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledOnce());
  const options = fetcher.mock.calls.find(
    ([, opts]) => opts.method === 'PATCH'
  )![1];
  expect(JSON.parse(options.body)).toMatchObject({
    revision: 3,
    dueAt: '2026-07-15T22:59:59.000Z',
  });
  expect(options.headers['x-csrf-token']).toBe('test');
});
it('keeps the exact existing timestamp when only the note changes', async () => {
  fetcher.mockResolvedValue(response(data(3, '2026-07-15T23:30:00Z')));
  render(<FollowupForm {...props} />);
  fireEvent.change(await screen.findByLabelText('Update'), {
    target: { value: 'Call tenant tomorrow' },
  });
  expect(screen.getByLabelText('Follow up by (UK date)')).toHaveValue(
    '2026-07-16'
  );
  fetcher.mockResolvedValue(response({ followup: { revision: 4 } }));
  fireEvent.click(screen.getByText('Save follow-up'));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledOnce());
  expect(
    JSON.parse(
      fetcher.mock.calls.find(([, opts]) => opts.method === 'PATCH')![1].body
    ).dueAt
  ).toBe('2026-07-15T23:30:00Z');
});
it.each([409, 403, 500])(
  'preserves the note and blocks repeated saves after %s until reload',
  async (status) => {
    render(<FollowupForm {...props} />);
    fireEvent.change(await screen.findByLabelText('Update'), {
      target: { value: 'Keep my note' },
    });
    fetcher.mockResolvedValue(response({}, status));
    fireEvent.click(screen.getByText('Save follow-up'));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Update')).toHaveValue('Keep my note');
    expect(screen.getByText('Save follow-up')).toBeDisabled();
    expect(props.onSaved).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(response(data(4)));
    fireEvent.click(screen.getByText('Reload'));
    await waitFor(() =>
      expect(screen.getByText('Save follow-up')).toBeEnabled()
    );
    expect(screen.getByLabelText('Update')).toHaveValue('Keep my note');
    fetcher.mockResolvedValue(response({ followup: { revision: 5 } }));
    fireEvent.click(screen.getByText('Save follow-up'));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledOnce());
    const calls = fetcher.mock.calls.filter(
      ([, opts]) => opts.method === 'PATCH'
    );
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[1][1].body).revision).toBe(4);
  }
);
it('does not confirm malformed success or discard the note', async () => {
  render(<FollowupForm {...props} />);
  fireEvent.change(await screen.findByLabelText('Update'), {
    target: { value: 'Keep my note' },
  });
  fetcher.mockResolvedValue(response({}));
  fireEvent.click(screen.getByText('Save follow-up'));
  await screen.findByRole('alert');
  expect(screen.getByText('Save follow-up')).toBeDisabled();
  expect(screen.getByLabelText('Update')).toHaveValue('Keep my note');
  expect(props.onSaved).not.toHaveBeenCalled();
});
it('ignores a late response from the previous property', async () => {
  let resolve!: (value: unknown) => void;
  fetcher.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  const view = render(<FollowupForm {...props} />);
  view.rerender(<FollowupForm {...props} propertyId='other' />);
  fireEvent.change(await screen.findByLabelText('Update'), {
    target: { value: 'Other property note' },
  });
  resolve(response(data(99, '2026-12-20T00:00:00Z')));
  await waitFor(() =>
    expect(screen.getByLabelText('Update')).toHaveValue('Other property note')
  );
  expect(screen.getByLabelText('Follow up by (UK date)')).toHaveValue('');
});
it('shows recovery rather than crashing on malformed load data', async () => {
  fetcher.mockResolvedValue(response({ followup: { revision: 3 } }));
  render(<FollowupForm {...props} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'details could not be confirmed'
  );
  expect(screen.queryByText('Save follow-up')).toBeNull();
  fetcher.mockResolvedValue(response(data()));
  fireEvent.click(screen.getByText('Reload'));
  expect(await screen.findByLabelText('Update')).toBeInTheDocument();
});
