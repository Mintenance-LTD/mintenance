import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const m = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({
  fetchWithCsrf: (...args: unknown[]) => m.send(...args),
}));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Verify MFA</button>
  ),
}));
import Page from '@/app/admin/evidence-retention/export/page';
beforeEach(() => {
  vi.clearAllMocks();
});
function fill() {
  render(<Page />);
  fireEvent.change(screen.getByLabelText('Archived record ID'), {
    target: { value: '11111111-1111-4111-8111-111111111111' },
  });
  fireEvent.change(screen.getByLabelText('Original account ID'), {
    target: { value: '22222222-2222-4222-8222-222222222222' },
  });
  fireEvent.change(screen.getByLabelText('Verified request case reference'), {
    target: { value: 'CASE-TEST' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText('Download staff review packet'));
}
it('preserves the exact request through MFA and an export failure', async () => {
  m.send.mockResolvedValueOnce({
    ok: false,
    status: 403,
    json: async () => ({ requiresStepUp: true }),
  });
  m.send.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({ error: { message: 'Evidence unavailable' } }),
  });
  fill();
  fireEvent.click(await screen.findByText('Verify MFA'));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Evidence unavailable'
  );
  expect(m.send.mock.calls[0][1].body).toBe(m.send.mock.calls[1][1].body);
  expect(screen.getByLabelText('Verified request case reference')).toHaveValue(
    'CASE-TEST'
  );
  expect(screen.queryByRole('status')).toBeNull();
});
it('does not start overlapping exports', async () => {
  m.send.mockImplementation(() => new Promise(() => {}));
  fill();
  await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Preparing…')).toBeDisabled();
});
