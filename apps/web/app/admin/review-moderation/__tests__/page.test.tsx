import { act, render } from '@testing-library/react';
import AdminReviewModerationPage from '../page';

vi.mock('@/components/ui/confirm-dialog', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({ MfaStepUpDialog: () => null }));

describe('Review moderation countdown', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('updates the remaining publication time without another fetch and stops its clock on unmount', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-13T12:00:00Z'));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviews: [{
        id: 'review-1', rating: 4, comment: 'Good work', response: 'Thank you',
        respondedAt: '2026-11-11T13:30:01Z', publishesAt: '2026-11-13T13:30:01Z',
        reviewerName: 'Homeowner', contractorId: 'contractor-1', contractorName: 'Contractor', jobTitle: 'Repair',
      }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const screen = render(<AdminReviewModerationPage />);
    expect(await screen.findByText('Publishes in ~2h')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Publishes in ~1h')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    screen.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
