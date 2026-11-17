import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const navigation = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
import { MintEditorialDisputeCreate } from '@/app/disputes/create/MintEditorialDisputeCreate';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('fetches a CSRF token before submission and preserves the statement after a rejected request', async () => {
  const fetchMock = vi.fn(
    async (url: string, _options?: RequestInit) =>
      new Response(
        JSON.stringify(
          url.startsWith('/api/disputes/context')
            ? {
                id: 'synthetic-escrow',
                jobId: 'synthetic-job',
                jobTitle: 'Leaking tap',
                amount: 1.2,
                status: 'held',
              }
            : url === '/api/csrf'
              ? { token: 'synthetic-csrf' }
              : { error: 'Payment already settling' }
        ),
        {
          status:
            url === '/api/csrf' || url.startsWith('/api/disputes/context')
              ? 200
              : 409,
        }
      )
  );
  vi.stubGlobal('fetch', fetchMock);
  render(<MintEditorialDisputeCreate escrowId='synthetic-escrow' />);
  await screen.findByText('Quality of work');
  expect(
    screen.getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)
  ).toBe(true);
  expect(
    screen
      .getByRole('link', { name: 'Back to Leaking tap' })
      .getAttribute('href')
  ).toBe('/jobs/synthetic-job');
  fireEvent.click(screen.getByText('Quality of work'));
  fireEvent.click(screen.getByText('Other — explain in my statement'));
  const statement = screen.getByRole('textbox');
  fireEvent.change(statement, {
    target: { value: 'The repair is still leaking.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open dispute' }));
  await screen.findByText('Payment already settling');
  expect(
    fetchMock.mock.calls.findIndex(([url]) => url === '/api/csrf')
  ).toBeLessThan(
    fetchMock.mock.calls.findIndex(([url]) => url === '/api/disputes/create')
  );
  const submission = fetchMock.mock.calls.find(
    ([url]) => url === '/api/disputes/create'
  );
  expect(submission).toBeDefined();
  const options = (submission as unknown as [string, RequestInit])[1];
  expect(new Headers(options.headers).get('X-CSRF-Token')).toBe(
    'synthetic-csrf'
  );
  expect(options.credentials).toBe('same-origin');
  expect((statement as HTMLTextAreaElement).value).toBe(
    'The repair is still leaking.'
  );
  expect(navigation.push).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Open dispute',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false)
  );
});
