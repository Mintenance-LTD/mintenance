import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const mocks = vi.hoisted(() => ({ confirm: vi.fn(async () => true) }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));
import AdminReviewModerationPage from '@/app/admin/review-moderation/page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('resumes the confirmed moderation action after shared MFA with valid CSRF headers', async () => {
  const requests: { url: string; body: unknown; token: string | null }[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/csrf')
        return json({ token: 'synthetic-moderation-csrf' });
      if (!init?.method)
        return json({
          reviews: [
            {
              id: 'synthetic-review',
              rating: 4,
              comment: 'Synthetic review',
              response: 'Synthetic response',
              respondedAt: '2026-09-22T10:00:00Z',
              publishesAt: '2026-09-24T10:00:00Z',
              reviewerName: 'Synthetic Owner',
              contractorId: 'synthetic-contractor',
              contractorName: 'Synthetic Contractor',
              jobTitle: 'Synthetic repair',
            },
          ],
        });
      requests.push({
        url,
        body: JSON.parse(String(init.body)),
        token: new Headers(init.headers).get('X-CSRF-Token'),
      });
      if (url === '/api/auth/mfa/step-up') return json({ success: true });
      return requests.length === 1
        ? json({ requiresStepUp: true }, 403)
        : json({ success: true });
    })
  );
  render(<AdminReviewModerationPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve now' }));
  await screen.findByRole('dialog', { name: 'Confirm your identity' });
  fireEvent.change(screen.getByLabelText('Verification code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
  await waitFor(() => expect(requests).toHaveLength(3));
  expect(requests[0].body).toEqual({
    reviewId: 'synthetic-review',
    action: 'approve',
  });
  expect(requests[2].body).toEqual(requests[0].body);
  expect(requests.every((r) => r.token === 'synthetic-moderation-csrf')).toBe(
    true
  );
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
});
