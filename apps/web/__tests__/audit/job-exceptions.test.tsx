import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { readActionResponse } from '@/lib/api/read-action-response';
import { photoBatchError } from '@/lib/photos/upload-limits';
import { contractStartWarning } from '@/lib/scheduling/contract-start-warning';
import { buildNeedsYouFeed } from '@/app/dashboard/lib/needs-you-aggregator';
import { HomeownerPhotoReview } from '@/app/jobs/[id]/components/HomeownerPhotoReview';
import { PaymentReviewMilestones } from '@/app/jobs/[id]/components/PaymentReviewMilestones';
import { explainCoolingOff } from '@/app/payments/explain-cooling-off';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/ui/BeforeAfterSlider', () => ({
  BeforeAfterSlider: () => <div>Before and after comparison</div>,
}));
const response = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;
beforeEach(() =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ escrow: null })))
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('explains nested photo-quality errors without object coercion', async () => {
  await expect(
    readActionResponse(
      response(
        { error: { message: 'Retake the photo in better lighting.' } },
        400
      ),
      'Upload failed'
    )
  ).rejects.toThrow('Retake the photo in better lighting.');
});
it('explains a non-JSON oversized response without parsing it', async () => {
  const json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token <'));
  await expect(
    readActionResponse(
      { status: 413, ok: false, json } as unknown as Response,
      'Upload failed'
    )
  ).rejects.toThrow('Choose fewer photos');
  expect(json).not.toHaveBeenCalled();
});
it('hides raw proxy response errors and rejects null success payloads', async () => {
  await expect(
    readActionResponse(
      {
        status: 502,
        ok: false,
        json: async () => {
          throw Error('private proxy details');
        },
      } as unknown as Response,
      'Upload failed'
    )
  ).rejects.toThrow('unreadable response');
  await expect(
    readActionResponse(response(null), 'Upload failed')
  ).rejects.toThrow('Upload failed');
});
it('checks each individually uploaded file and the selection count', () => {
  expect(
    photoBatchError([{ size: 3_000_000 }, { size: 2_000_000 }])
  ).toBeNull();
  expect(photoBatchError([{ size: 5_000_000 }])).toMatch(/4 MB/);
  expect(
    photoBatchError(Array.from({ length: 11 }, () => ({ size: 1 })))
  ).toMatch(/10 photos/);
  expect(photoBatchError([{ size: 4 * 1024 * 1024 }])).toBeNull();
});
it('catches the reported scheduled start before signing, using UK calendar days', () => {
  expect(
    contractStartWarning('2026-11-16', new Date('2026-11-15T12:00:00Z'))
  ).toEqual({ start: '16 November 2026', end: '29 November 2026' });
  expect(
    contractStartWarning('2026-11-30', new Date('2026-11-15T12:00:00Z'))
  ).toBeNull();
  expect(
    contractStartWarning('2026-04-15', new Date('2026-04-01T23:30:00Z'))?.end
  ).toBe('16 April 2026');
});
it('prioritises unapproved completed work and excludes approved work', () => {
  const items = buildNeedsYouFeed({
    pendingBids: [
      {
        id: 'bid',
        jobId: 'other',
        jobTitle: 'Other',
        contractorName: 'Test',
        amount: 2,
      },
    ],
    allBids: [],
    postedJobs: [],
    properties: [],
    maxItems: 1,
    paymentStatuses: new Map([['refunded', 'refunded']]),
    completedJobs: [
      {
        id: 'refunded',
        status: 'completed',
        created_at: '',
        completion_confirmed_by_homeowner: false,
      },
      {
        id: 'approved',
        status: 'completed',
        created_at: '',
        completion_confirmed_by_homeowner: true,
      },
      {
        id: 'review',
        status: 'completed',
        title: 'Fix tap',
        created_at: '',
        completion_confirmed_by_homeowner: false,
      },
    ],
  });
  expect(items).toEqual([
    {
      kind: 'reviewJob',
      id: 'review-review',
      jobId: 'review',
      jobTitle: 'Fix tap',
    },
  ]);
});
it('keeps refunded completion evidence available while removing review actions', () => {
  render(
    <HomeownerPhotoReview
      jobId='refunded'
      beforePhotos={[]}
      afterPhotos={[{ id: 'a', photo_url: '/after.jpg' }]}
      isConfirmed={false}
      paymentRefunded
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Completion evidence' })
  ).toBeVisible();
  expect(screen.getByText(/payment was refunded/i)).toBeVisible();
  expect(
    screen.getByRole('img', { name: 'Completed work photo' })
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Approve Work' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Request Changes' })).toBeNull();
});
it('makes all three after photos available when there is only one before photo', async () => {
  render(
    <HomeownerPhotoReview
      jobId='test'
      beforePhotos={[{ id: 'b', photo_url: '/before.jpg' }]}
      afterPhotos={[1, 2, 3].map((i) => ({
        id: String(i),
        photo_url: `/after-${i}.jpg`,
      }))}
      isConfirmed={false}
    />
  );
  await screen.findByText('No payment schedule is recorded yet.');
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByText('3 / 3')).toBeInTheDocument();
  expect(
    screen
      .getByRole('img', { name: 'Completed work photo' })
      .getAttribute('src')
  ).toContain('after-3');
  expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
});
it('allows review of supplied after photos even without before photos', async () => {
  render(
    <HomeownerPhotoReview
      jobId='test'
      beforePhotos={[]}
      afterPhotos={[{ id: 'a', photo_url: '/after.jpg' }]}
      isConfirmed={false}
    />
  );
  await screen.findByText('No payment schedule is recorded yet.');
  expect(screen.getByRole('button', { name: 'Request Changes' })).toBeEnabled();
});
it('reloads actual milestones after approval rather than retaining the old review deadline', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      response({
        escrow: {
          status: 'held',
          autoApprovalDate: '2026-11-23T15:02:00Z',
          autoReleaseDate: '2026-11-25T15:02:00Z',
        },
      })
    )
    .mockResolvedValueOnce(
      response({
        escrow: {
          status: 'held',
          autoApprovalDate: '2026-11-23T15:02:00Z',
          autoReleaseDate: '2026-11-18T15:02:00Z',
          coolingOffEndsAt: '2026-11-18T15:02:00Z',
          onHold: true,
        },
      })
    );
  const { rerender } = render(
    <PaymentReviewMilestones jobId='test' approved={false} />
  );
  await screen.findByText(/This is not a payment release date/);
  expect(screen.getByText(/23 November 2026/)).toHaveTextContent('15:02');
  rerender(<PaymentReviewMilestones jobId='test' approved />);
  await screen.findByText(/additional payment hold/);
  expect(screen.queryByText(/23 November 2026/)).toBeNull();
  expect(screen.getAllByText(/18 November 2026/)).toHaveLength(2);
});
it('keeps unavailable schedule distinct from no escrow and supports retry', async () => {
  vi.mocked(fetch)
    .mockRejectedValueOnce(Error('offline'))
    .mockResolvedValueOnce(response({ escrow: null }));
  render(<PaymentReviewMilestones jobId='test' approved={false} />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Retry payment schedule' })
  );
  await screen.findByText('No payment schedule is recorded yet.');
});
it('renders UK hold time even when the browser locale would use another zone', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));
  const confirm = vi.fn().mockResolvedValue(true);
  await explainCoolingOff('2026-11-18T15:02:00Z', confirm);
  expect(confirm.mock.calls[0][0].description).toContain('15:02 GMT (UK time)');
});
