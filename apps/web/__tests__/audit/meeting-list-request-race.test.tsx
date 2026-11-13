import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MeetingList } from '@/app/scheduling/meetings/components/MeetingList';

const mocks = vi.hoisted(() => ({
  order: vi.fn(),
  eq: vi.fn(),
  subscriptions: [] as Array<{ unsubscribe: ReturnType<typeof vi.fn> }>,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (column: string, id: string) => {
          mocks.eq(column, id);
          return { order: mocks.order };
        },
      }),
    }),
    channel: () => ({
      on() {
        return this;
      },
      subscribe: () => {
        const subscription = { unsubscribe: vi.fn() };
        mocks.subscriptions.push(subscription);
        return subscription;
      },
    }),
  },
}));
const meeting = (title: string) => ({
  id: title,
  scheduled_datetime: '2099-01-01T12:00:00Z',
  status: 'scheduled',
  meeting_type: 'site_visit',
  duration: 60,
  job: { id: title, title },
});
beforeEach(() => {
  mocks.order.mockReset();
  mocks.eq.mockReset();
  mocks.subscriptions.length = 0;
});
afterEach(cleanup);

it('refreshes role-scoped meetings and ignores the previous role response', async () => {
  let resolveOld!: (value: unknown) => void;
  mocks.order
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValueOnce({ data: [meeting('Contractor job')], error: null });
  const view = render(
    <MeetingList userId='user' userRole='homeowner' onScheduleNew={() => {}} />
  );
  await waitFor(() =>
    expect(mocks.eq).toHaveBeenCalledWith('homeowner_id', 'user')
  );
  view.rerender(
    <MeetingList userId='user' userRole='contractor' onScheduleNew={() => {}} />
  );
  await screen.findByText('Contractor job');
  expect(mocks.eq).toHaveBeenCalledWith('contractor_id', 'user');
  expect(mocks.subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
  await act(async () => {
    resolveOld({ data: [meeting('Stale homeowner job')], error: null });
  });
  expect(screen.queryByText('Stale homeowner job')).not.toBeInTheDocument();
  expect(screen.getByText('Contractor job')).toBeInTheDocument();
});

it('clears meetings and unsubscribes when the user signs out', async () => {
  mocks.order.mockResolvedValue({
    data: [meeting('Private meeting')],
    error: null,
  });
  const view = render(
    <MeetingList userId='user' userRole='homeowner' onScheduleNew={() => {}} />
  );
  await screen.findByText('Private meeting');
  view.rerender(
    <MeetingList userId='' userRole='homeowner' onScheduleNew={() => {}} />
  );
  expect(screen.queryByText('Private meeting')).not.toBeInTheDocument();
  expect(
    screen.getByText('No upcoming meetings scheduled.')
  ).toBeInTheDocument();
  expect(mocks.subscriptions[0].unsubscribe).toHaveBeenCalledOnce();
});
