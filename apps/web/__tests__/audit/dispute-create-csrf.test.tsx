import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const navigation = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
import { MintEditorialDisputeCreate } from '@/app/disputes/create/MintEditorialDisputeCreate';

afterEach(() => vi.unstubAllGlobals());

it('fetches a CSRF token before submission and preserves the statement after a rejected request', async () => {
  const fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url === '/api/csrf'
            ? { token: 'synthetic-csrf' }
            : { error: 'Payment already settling' }
        ),
        { status: url === '/api/csrf' ? 200 : 409 }
      )
  );
  vi.stubGlobal('fetch', fetchMock);
  render(<MintEditorialDisputeCreate escrowId='synthetic-escrow' />);
  fireEvent.click(screen.getByText('Quality of work'));
  const statement = screen.getByRole('textbox');
  fireEvent.change(statement, {
    target: { value: 'The repair is still leaking.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open dispute' }));
  await screen.findByText('Payment already settling');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/csrf');
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
