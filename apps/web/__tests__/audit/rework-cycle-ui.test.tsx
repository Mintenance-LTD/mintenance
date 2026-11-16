import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const state = vi.hoisted(() => ({
  requests: [
    {
      id: 'cycle-2',
      created_at: '2026-11-16T10:00:00Z',
      comments: 'Please repair the edge',
      completion_version: '2026-11-15T11:00:00Z',
    },
  ],
  request: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/hooks/useJobRework', () => ({
  useJobRework: () => ({
    requests: state.requests,
    latest: state.requests[0],
    loading: false,
    error: null,
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: state.request }));
vi.mock('@/components/ui/BeforeAfterSlider', () => ({
  BeforeAfterSlider: ({ afterUrl }: { afterUrl: string }) => (
    <div data-testid='comparison'>{afterUrl}</div>
  ),
}));
import { HomeownerPhotoReview } from '@/app/jobs/[id]/components/HomeownerPhotoReview';
import { JobPhotoUpload } from '@/app/contractor/(dashboard)/jobs/[id]/components/JobPhotoUpload';
const reply = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ escrow: null })));
  vi.spyOn(URL, 'createObjectURL').mockImplementation(
    () => 'blob:' + crypto.randomUUID()
  );
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  Object.defineProperty(navigator, 'geolocation', {
    value: undefined,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const photos = [1, 2, 3].map((i) => ({
  id: 'old' + i,
  photo_url: '/old' + i,
  created_at: '2026-11-15T10:00:00Z',
}));
it('defaults to current rework evidence and labels historical photos separately', async () => {
  render(
    <HomeownerPhotoReview
      jobId='job'
      completedAt='2026-11-16T12:00:00Z'
      isConfirmed={false}
      beforePhotos={[{ id: 'before', photo_url: '/before' }]}
      afterPhotos={[
        ...photos,
        {
          id: 'fresh',
          photo_url: '/fresh',
          created_at: '2026-11-16T11:00:00Z',
        },
      ]}
    />
  );
  expect(screen.getByTestId('comparison')).toHaveTextContent('/fresh');
  expect(screen.getByText('Please repair the edge')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Browse all photos including previous cycles',
    })
  );
  expect(screen.getByTestId('comparison')).toHaveTextContent('/old1');
  expect(screen.getByText('Previous cycle / date unavailable')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Show current rework only' })
  );
  expect(screen.getByTestId('comparison')).toHaveTextContent('/fresh');
});
it('cannot approve when only previous-cycle evidence exists', () => {
  render(
    <HomeownerPhotoReview
      jobId='job'
      completedAt='2026-11-16T12:00:00Z'
      isConfirmed={false}
      beforePhotos={[]}
      afterPhotos={photos}
    />
  );
  expect(screen.getByRole('button', { name: 'Approve Work' })).toBeDisabled();
  expect(screen.getByText(/No fresh after photos/)).toBeVisible();
});
it('requires explicit rework submission and sends the current cycle identity', async () => {
  state.request.mockResolvedValue(reply({ success: true }));
  render(<JobPhotoUpload jobId='job' jobStatus='in_progress' />);
  expect(state.request).not.toHaveBeenCalled();
  expect(screen.getByText('Please repair the edge')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'Submit rework for review' })
  );
  await waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
  expect(state.request.mock.calls[0][0]).toBe('/api/jobs/job/complete');
  expect(JSON.parse(state.request.mock.calls[0][1].body)).toEqual({
    reworkRequestId: 'cycle-2',
  });
});
it('shows rejected fresh-evidence submission without claiming completion', async () => {
  state.request.mockResolvedValue(
    reply({ error: { message: 'Three fresh photos required' } }, false)
  );
  render(<JobPhotoUpload jobId='job' jobStatus='in_progress' />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Submit rework for review' })
  );
  expect(await screen.findByText('Three fresh photos required')).toBeVisible();
  expect(state.refresh).not.toHaveBeenCalled();
});
it('keeps only failed/unattempted files for retry after a partial upload', async () => {
  state.request
    .mockResolvedValueOnce(
      reply({
        count: 1,
        photos: [{ url: '/accepted', qualityScore: 1 }],
        jobCompleted: false,
      })
    )
    .mockResolvedValueOnce(
      reply({ error: { message: 'Photo too dark' } }, false)
    );
  render(<JobPhotoUpload jobId='job' jobStatus='in_progress' />);
  const files = ['one.png', 'two.png'].map(
    (name) => new File(['image'], name, { type: 'image/png' })
  );
  fireEvent.change(screen.getByLabelText(/Tap to take a photo/), {
    target: { files },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Upload 2 Photos' }));
  expect(await screen.findByText('Photo too dark')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Upload 1 Photo' })).toBeVisible();
  state.request.mockResolvedValueOnce(
    reply({ count: 1, photos: [], jobCompleted: false })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Upload 1 Photo' }));
  await waitFor(() => expect(state.request).toHaveBeenCalledTimes(3));
  expect(
    (state.request.mock.calls[2][1].body as FormData).get('photos')
  ).toEqual(files[1]);
  expect(state.refresh).not.toHaveBeenCalled();
});
