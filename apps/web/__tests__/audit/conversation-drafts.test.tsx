import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HomeownerMessages from '@/app/messages/page';
import { MessagesClient } from '@/app/contractor/(dashboard)/messages/components/MessagesClient';

vi.unmock('@tanstack/react-query');

const fixture = vi.hoisted(() => ({
  role: 'homeowner',
  router: { push: vi.fn(), replace: vi.fn() },
  params: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => fixture.router,
  useSearchParams: () => fixture.params,
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'viewer', role: fixture.role },
    loading: false,
  }),
}));
vi.mock('@/lib/auth-client', () => ({
  fetchCurrentUser: async () => ({ id: 'viewer', role: fixture.role }),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'test-csrf' }),
}));
vi.mock('@/lib/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({
    isOtherTyping: false,
    broadcastTyping: vi.fn(),
  }),
}));
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: React.PropsWithChildren) => children,
}));
vi.mock(
  '@/app/contractor/(dashboard)/messages/components/CreateContractDialog',
  () => ({ CreateContractDialog: () => null })
);
vi.mock(
  '@/app/contractor/(dashboard)/messages/components/ShareDocumentDialog',
  () => ({ ShareDocumentDialog: () => null })
);

beforeEach(() => {
  document.documentElement.dataset.theme = 'mint-editorial';
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

it.each(['homeowner', 'contractor'])(
  'keeps drafts separate for a %s switching conversations during a send',
  async (role) => {
    fixture.role = role;
    const threads = [
      {
        jobId: 'job-a',
        jobTitle: 'First repair',
        participants: [{ id: 'alice', name: 'Alice' }],
      },
      {
        jobId: 'job-b',
        jobTitle: 'Second repair',
        participants: [{ id: 'bob', name: 'Bob' }],
      },
    ];
    let finishSend: ((result: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/csrf') return Response.json({ token: 'test-csrf' });
        if (
          url.startsWith('/api/messages/threads') &&
          !url.split('?')[0].includes('/job-')
        )
          return Response.json({ threads });
        if (url.endsWith('/messages') && init?.method === 'POST') {
          expect(url).toContain('/job-a/');
          expect(JSON.parse(String(init.body)).content).toBe('First draft');
          return new Promise<Response>((resolve) => {
            finishSend = resolve;
          });
        }
        if (url.startsWith('/api/jobs/'))
          return Response.json({
            job: { id: url.split('/').at(-1), title: 'Repair' },
          });
        return Response.json({ messages: [] });
      })
    );

    const query = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={query}>
        {role === 'homeowner' ? <HomeownerMessages /> : <MessagesClient />}
      </QueryClientProvider>
    );
    const selectAlice = await screen.findByRole('button', {
      name: /Alice.*First repair/i,
    });
    const selectBob = screen.getByRole('button', {
      name: /Bob.*Second repair/i,
    });
    await act(async () => {
      fireEvent.click(selectAlice);
    });
    const alice = () => screen.getByPlaceholderText('Reply to Alice…');
    const bob = () => screen.getByPlaceholderText('Reply to Bob…');
    fireEvent.change(alice(), { target: { value: 'First draft' } });
    await act(async () => {
      fireEvent.click(selectBob);
    });
    expect(bob()).toHaveValue('');
    fireEvent.change(bob(), { target: { value: 'Second draft' } });
    await act(async () => {
      fireEvent.click(selectAlice);
    });
    expect(alice()).toHaveValue('First draft');
    fireEvent.click(screen.getByRole('button', { name: 'Send', exact: true }));
    await waitFor(() => expect(finishSend).toBeDefined());
    await act(async () => {
      fireEvent.click(selectBob);
    });
    await act(async () =>
      finishSend?.(Response.json({ message: { id: 'sent-a' } }))
    );
    expect(bob()).toHaveValue('Second draft');
    await act(async () => {
      fireEvent.click(selectAlice);
    });
    expect(alice()).toHaveValue('');
  }
);
