import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MeetingScheduler } from '@/app/scheduling/meetings/components/MeetingScheduler';
import { VideoCallScheduler } from '@/app/video-calls/components/VideoCallScheduler';

const mocks = vi.hoisted(() => ({ result: vi.fn(), filter: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const response = mocks.result();
      const query = {
        select() {
          return query;
        },
        in() {
          return query;
        },
        limit() {
          return query;
        },
        eq(...args: string[]) {
          mocks.filter(...args);
          return query;
        },
        or(value: string) {
          mocks.filter(value);
          return query;
        },
        then: response.then.bind(response),
      };
      return query;
    },
  },
}));
const job = (id: string) => ({
  id,
  title: id,
  location: 'Test location',
  homeowner_id: 'homeowner',
  contractor_id: 'contractor',
});
const callbacks = { onScheduled: () => {}, onCancel: () => {} };
function scheduler(
  kind: 'meeting' | 'video',
  user: string,
  visible = true,
  initialJobId = ''
) {
  return kind === 'meeting' ? (
    <MeetingScheduler
      {...callbacks}
      currentUserId={user}
      userRole='homeowner'
      isVisible={visible}
    />
  ) : (
    <VideoCallScheduler
      {...callbacks}
      currentUserId={user}
      isVisible={visible}
      initialJobId={initialJobId}
    />
  );
}
beforeEach(() => {
  mocks.result.mockReset();
  mocks.filter.mockReset();
});
afterEach(cleanup);

it.each(['meeting', 'video'] as const)(
  '%s scheduler ignores an earlier account response',
  async (kind) => {
    let resolveOld!: (value: unknown) => void;
    mocks.result
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce({ data: [job('Current job')], error: null });
    const view = render(scheduler(kind, 'old-user'));
    view.rerender(scheduler(kind, 'new-user'));
    await screen.findByRole('option', { name: 'Current job' });
    if (kind === 'meeting')
      expect(mocks.filter).toHaveBeenCalledWith('homeowner_id', 'new-user');
    else
      expect(mocks.filter).toHaveBeenCalledWith(
        'homeowner_id.eq.new-user,contractor_id.eq.new-user'
      );
    await act(async () => {
      resolveOld({ data: [job('Stale job')], error: null });
    });
    expect(
      screen.queryByRole('option', { name: 'Stale job' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Current job' })
    ).toBeInTheDocument();
  }
);

it.each(['meeting', 'video'] as const)(
  '%s scheduler clears jobs on sign-out',
  async (kind) => {
    mocks.result.mockResolvedValue({ data: [job('Private job')], error: null });
    const view = render(scheduler(kind, 'user'));
    await screen.findByRole('option', { name: 'Private job' });
    view.rerender(scheduler(kind, ''));
    expect(
      screen.queryByRole('option', { name: 'Private job' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'No active jobs found' })
    ).toBeInTheDocument();
    expect(mocks.result).toHaveBeenCalledTimes(1);
  }
);

it('video scheduler follows a changed initial job while already visible', async () => {
  mocks.result.mockResolvedValue({
    data: [job('First'), job('Second')],
    error: null,
  });
  const view = render(scheduler('video', 'user', true, 'First'));
  await screen.findByRole('option', { name: 'First' });
  view.rerender(scheduler('video', 'user', true, 'Second'));
  await waitFor(() =>
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('Second')
  );
});
