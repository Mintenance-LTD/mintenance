import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const m = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({
  fetchWithCsrf: (...args: unknown[]) => m.save(...args),
}));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Verify synthetic MFA</button>
  ),
}));
import Page from '@/app/admin/evidence-retention/page';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            kind: 'dispute',
            id: 'example',
            revision: 0,
            legal_hold: false,
            reason: '',
            review_due_at: '2026-10-22',
          },
        ],
      }),
    })
  );
});
async function fill() {
  render(<Page />);
  const reason = await screen.findByLabelText('Reason for retention or hold');
  fireEvent.change(reason, {
    target: { value: 'Synthetic case reference 123' },
  });
  fireEvent.change(screen.getByLabelText('Next review date'), {
    target: { value: '2026-10-22' },
  });
  fireEvent.click(screen.getByLabelText('Preserve under a hold'));
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  return reason;
}
it('keeps the exact review decision across MFA and reports success only after confirmation', async () => {
  m.save.mockResolvedValueOnce({
    status: 403,
    ok: false,
    json: async () => ({ requiresStepUp: true }),
  });
  m.save.mockResolvedValueOnce({
    status: 200,
    ok: true,
    json: async () => ({ success: true, revision: 1 }),
  });
  await fill();
  fireEvent.click(await screen.findByText('Verify synthetic MFA'));
  await screen.findByText('Review saved. Evidence remains retained.');
  expect(m.save).toHaveBeenCalledTimes(2);
  expect(m.save.mock.calls[0][1].body).toBe(m.save.mock.calls[1][1].body);
});
it('preserves entered reasons after failure and does not show a success message', async () => {
  m.save.mockRejectedValue(new Error('Connection interrupted'));
  const reason = await fill();
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain(
      'Connection interrupted'
    )
  );
  expect((reason as HTMLTextAreaElement).value).toBe(
    'Synthetic case reference 123'
  );
  expect(
    screen.queryByText('Review saved. Evidence remains retained.')
  ).toBeNull();
});
