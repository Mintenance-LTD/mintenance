// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminVerificationProvider, useAdminFetch } from '@/components/admin/AdminVerificationProvider';
vi.mock('@/components/auth/MfaStepUpDialog', () => ({ MfaStepUpDialog: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => <div><button onClick={onSuccess}>Verify test identity</button><button onClick={onCancel}>Cancel identity</button></div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const result = vi.fn();
function Action() { const request = useAdminFetch(); return <button onClick={() => void request('/api/admin/users/bulk-verify', { method: 'POST', body: 'original' }).then(result).catch(result)}>Approve test</button>; }
function response(status: number, body: object) { return { status, clone: () => ({ json: async () => body }) }; }
it('verifies a step-up rejection then retries the unchanged request once', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(response(403, { requiresStepUp: true })).mockResolvedValue(response(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  render(<AdminVerificationProvider><Action /></AdminVerificationProvider>);
  fireEvent.click(screen.getByText('Approve test'));
  fireEvent.click(await screen.findByText('Verify test identity'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[0]);
});
it('does not retry when the administrator cancels verification', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response(403, { requiresStepUp: true }));
  vi.stubGlobal('fetch', fetchMock);
  render(<AdminVerificationProvider><Action /></AdminVerificationProvider>);
  fireEvent.click(screen.getByText('Approve test'));
  fireEvent.click(await screen.findByText('Cancel identity'));
  await waitFor(() => expect(screen.queryByText('Cancel identity')).toBeNull());
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('never retries an unrelated authorization failure', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response(403, { error: 'Forbidden' }));
  vi.stubGlobal('fetch', fetchMock);
  render(<AdminVerificationProvider><Action /></AdminVerificationProvider>);
  fireEvent.click(screen.getByText('Approve test'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Verify test identity')).toBeNull();
});

it('gives the retried request a fresh timeout after waiting for MFA', async () => {
  function TimedAction() {
    const request = useAdminFetch();
    return <button onClick={() => void request('/api/admin/users/test/detail', {}, 20).catch(result)}>Load profile</button>;
  }
  const fetchMock = vi.fn().mockResolvedValueOnce(response(403, { requiresStepUp: true })).mockResolvedValue(response(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  render(<AdminVerificationProvider><TimedAction /></AdminVerificationProvider>);
  fireEvent.click(screen.getByText('Load profile'));
  await screen.findByText('Verify test identity');
  await new Promise(resolve => setTimeout(resolve, 40));
  fireEvent.click(screen.getByText('Verify test identity'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(false);
  expect(fetchMock.mock.calls[1][1].signal).not.toBe(fetchMock.mock.calls[0][1].signal);
});
