import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RenewalButton } from '@/app/properties/compliance/components/RenewalButton';

const mocks = vi.hoisted(() => ({ push: vi.fn(), success: vi.fn(), error: vi.fn(), toast: vi.fn(), fetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(mocks.toast, { success: mocks.success, error: mocks.error }) }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({ 'x-csrf-token': 'test-only' }) }));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());
const response = (body: object, ok = true) => ({ ok, json: async () => body });

it('opens the returned renewal job through the router with an encoded identifier', async () => {
  mocks.fetch.mockResolvedValue(response({ jobId: 'job/with?reserved', alreadyExists: false }));
  render(<RenewalButton certId='cert-1' />);
  fireEvent.click(screen.getByRole('button', { name: 'Renew Now' }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/jobs/job%2Fwith%3Freserved'));
  expect(mocks.fetch).toHaveBeenCalledWith('/api/compliance/cert-1/renew', expect.objectContaining({ method: 'POST', headers: { 'x-csrf-token': 'test-only' } }));
});

it('does not navigate or report success when the server omits the job ID', async () => {
  mocks.fetch.mockResolvedValue(response({ alreadyExists: true }));
  render(<RenewalButton certId='cert-1' />);
  fireEvent.click(screen.getByRole('button', { name: 'Renew Now' }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Renew Now' })).not.toBeDisabled();
});

it('prevents duplicate requests and allows retry after failure', async () => {
  let reject!: (error: Error) => void;
  mocks.fetch.mockReturnValueOnce(new Promise((_resolve, rej) => { reject = rej; }));
  render(<RenewalButton certId='cert-1' />);
  const button = screen.getByRole('button', { name: 'Renew Now' });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  await act(async () => reject(new Error('Offline')));
  expect(mocks.error).toHaveBeenCalledWith('Failed to create renewal job');
  mocks.fetch.mockResolvedValue(response({ jobId: 'existing-job', alreadyExists: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Renew Now' }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/jobs/existing-job'));
  expect(mocks.toast).toHaveBeenCalledWith('A renewal job already exists', { icon: 'ℹ️' });
});

it('keeps the user on the page when the API rejects the renewal', async () => {
  mocks.fetch.mockResolvedValue(response({ error: 'Access denied' }, false));
  render(<RenewalButton certId='cert-1' />);
  fireEvent.click(screen.getByRole('button', { name: 'Renew Now' }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Access denied'));
  expect(mocks.push).not.toHaveBeenCalled();
});
