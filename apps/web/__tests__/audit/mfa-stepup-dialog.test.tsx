import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.fetch }));
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('does not resume the parked action when verification completes after navigation away', async () => {
  let finish!: (response: Response) => void;
  mocks.fetch.mockReturnValue(
    new Promise<Response>((resolve) => {
      finish = resolve;
    })
  );
  const onSuccess = vi.fn();
  const { unmount } = render(
    <MfaStepUpDialog onCancel={vi.fn()} onSuccess={onSuccess} />
  );
  fireEvent.change(screen.getByLabelText('Verification code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
  unmount();
  await act(async () => {
    finish(new Response(JSON.stringify({ success: true })));
  });
  expect(onSuccess).not.toHaveBeenCalled();
});
it('prevents duplicate verification requests while a backup code is being consumed', async () => {
  let finish!: (response: Response) => void;
  mocks.fetch.mockReturnValue(
    new Promise<Response>((resolve) => {
      finish = resolve;
    })
  );
  const onSuccess = vi.fn();
  render(<MfaStepUpDialog onCancel={vi.fn()} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Backup code' }));
  fireEvent.change(screen.getByLabelText('Verification code'), {
    target: { value: 'TESTCODE1234' },
  });
  const form = screen.getByLabelText('Verification code').closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(new Response(JSON.stringify({ success: true })));
  });
  expect(onSuccess).toHaveBeenCalledTimes(1);
});
it.each([200, 202])(
  'does not resume an action after unconfirmed MFA response %s',
  async (status) => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify(status === 202 ? { success: true } : {}), {
        status,
      })
    );
    const onSuccess = vi.fn();
    render(<MfaStepUpDialog onCancel={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Verify and continue' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Verification was not confirmed'
    );
    expect(onSuccess).not.toHaveBeenCalled();
  }
);
