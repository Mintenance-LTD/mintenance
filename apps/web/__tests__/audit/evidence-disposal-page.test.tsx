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
import Page from '@/app/admin/evidence-retention/disposal/page';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [], next: null }),
    })
  );
});
async function fill() {
  render(<Page />);
  await screen.findByText('No disposal decisions.');
  fireEvent.change(screen.getByLabelText('Archived record reference'), {
    target: { value: '11111111-1111-4111-8111-111111111111' },
  });
  fireEvent.change(screen.getByLabelText('Current review revision'), {
    target: { value: '2' },
  });
  fireEvent.change(
    screen.getByLabelText('Earliest disposal (your local time)'),
    { target: { value: '2030-10-22T12:00' } }
  );
  fireEvent.change(
    screen.getByLabelText('Classification and inventory case reference'),
    { target: { value: 'CASE-001' } }
  );
  fireEvent.change(screen.getByLabelText('Reason disposal is permitted'), {
    target: { value: 'Synthetic classified case' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText('Schedule disposal'));
}
it('preserves the decision across MFA and waits for confirmed scheduling', async () => {
  m.save.mockResolvedValueOnce({
    status: 403,
    ok: false,
    json: async () => ({ requiresStepUp: true }),
  });
  m.save.mockResolvedValueOnce({
    status: 200,
    ok: true,
    json: async () => ({ success: true }),
  });
  await fill();
  fireEvent.click(await screen.findByText('Verify synthetic MFA'));
  await screen.findByText(
    'Disposal scheduled. Evidence remains retained until the worker rechecks eligibility.'
  );
  await waitFor(() =>
    expect(screen.getByText('Schedule disposal')).not.toBeDisabled()
  );
  expect(m.save).toHaveBeenCalledTimes(2);
  expect(m.save.mock.calls[0][1].body).toBe(m.save.mock.calls[1][1].body);
});
it('preserves entered classification after connection failure without claiming success', async () => {
  m.save.mockRejectedValue(new Error('Connection interrupted'));
  await fill();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Connection interrupted'
  );
  expect(screen.getByLabelText('Reason disposal is permitted')).toHaveValue(
    'Synthetic classified case'
  );
  expect(screen.queryByText(/Disposal scheduled\./)).toBeNull();
});
