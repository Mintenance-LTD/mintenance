import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: state.fetch }));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div>
      <button onClick={onSuccess}>Verify MFA</button>
      <button onClick={onCancel}>Cancel verification</button>
    </div>
  ),
}));
import { CloseDisputeCase } from '@/app/admin/disputes/components/CloseDisputeCase';
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function fill() {
  fireEvent.click(
    screen.getByRole('button', { name: 'Review nonfinancial closure' })
  );
  fireEvent.change(screen.getByLabelText('Reason for closing this case'), {
    target: { value: 'Withdrawn test complaint' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}
it('requires deliberate confirmation, preserves exact request through MFA and confirms the matching case', async () => {
  state.fetch
    .mockResolvedValueOnce(response({ requiresStepUp: true }, 403))
    .mockResolvedValueOnce(
      response({
        success: true,
        escrowId: 'payment',
        disputeId: 'case',
        closureId: 'closed',
      })
    );
  const closed = vi.fn();
  render(
    <CloseDisputeCase escrowId='payment' disputeId='case' onClosed={closed} />
  );
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close case; keep payment held' })
  );
  await screen.findByRole('button', { name: 'Verify MFA' });
  expect(closed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Verify MFA' }));
  await waitFor(() => expect(closed).toHaveBeenCalledOnce());
  expect(state.fetch.mock.calls[0]).toEqual(state.fetch.mock.calls[1]);
  expect(JSON.parse(state.fetch.mock.calls[0][1].body)).toEqual({
    escrowId: 'payment',
    disputeId: 'case',
    reason: 'Withdrawn test complaint',
    keepAdminHold: true,
  });
  expect(state.fetch.mock.calls[0][0]).toBe('/api/admin/disputes/close');
});
it('resets confirmation after changing the reason and fails closed on the wrong case', async () => {
  state.fetch.mockResolvedValue(
    response({
      success: true,
      escrowId: 'payment',
      disputeId: 'other',
      closureId: 'closed',
    })
  );
  const closed = vi.fn();
  render(
    <CloseDisputeCase escrowId='payment' disputeId='case' onClosed={closed} />
  );
  fill();
  fireEvent.change(screen.getByLabelText('Reason for closing this case'), {
    target: { value: 'Corrected closure reason' },
  });
  expect(
    (
      screen.getByRole('button', {
        name: 'Close case; keep payment held',
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(
    screen.getByRole('button', { name: 'Close case; keep payment held' })
  );
  await screen.findByRole('alert');
  expect(closed).not.toHaveBeenCalled();
  expect(
    (
      screen.getByLabelText(
        'Reason for closing this case'
      ) as HTMLTextAreaElement
    ).value
  ).toBe('Corrected closure reason');
});
