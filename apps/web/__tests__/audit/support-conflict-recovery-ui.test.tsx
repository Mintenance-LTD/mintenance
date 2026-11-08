import React from 'react';
import { randomUUID } from 'node:crypto';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AdminSupportInbox } from '@/components/support/AdminSupportInbox';

vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: 'test-csrf' }),
}));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: () => null,
}));
vi.mock('@/components/support/CommunicationComposer', () => ({
  CommunicationComposer: () => null,
}));
vi.mock('@/components/support/SupportTeam', () => ({
  SupportTeam: () => null,
}));

const id = '00000000-0000-4000-8000-000000000001';
const initial = {
  id,
  subject: 'Controlled support case',
  message: 'Synthetic fixture',
  status: 'open',
  priority: 'low',
  category: 'general',
  guest_email: null,
  assigned_to: null,
  response_due_at: '2026-11-15T12:00:00Z',
  revision: 1,
};
let serverTicket = { ...initial };
let failRead = false;
let patches: Array<Record<string, unknown>>;
let listReads = 0;
const response = (status: number, body: unknown) => ({
  ok: status < 400,
  json: async () => body,
});

beforeEach(() => {
  serverTicket = { ...initial };
  failRead = false;
  patches = [];
  listReads = 0;
  vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: RequestInit) => {
      if (url.startsWith('/api/admin/support?')) {
        listReads++;
        return response(200, {
          tickets: [{ ...serverTicket }],
          operators: [],
          deliveries: [],
          currentAdminId: id,
        });
      }
      if (url === `/api/admin/support/${id}` && options?.method === 'PATCH') {
        const payload = JSON.parse(options.body as string);
        patches.push(payload);
        if (payload.revision !== serverTicket.revision)
          return response(409, {
            error: { message: 'Case changed. Refresh before updating.' },
          });
        serverTicket = {
          ...serverTicket,
          status: payload.status,
          revision: serverTicket.revision + 1,
        };
        return response(200, { ticket: { ...serverTicket } });
      }
      if (url === `/api/admin/support/${id}`)
        return failRead
          ? response(500, { error: 'Could not refresh case' })
          : response(200, { ticket: { ...serverTicket }, messages: [] });
      throw new Error(`Unexpected request: ${url}`);
    })
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openCase() {
  render(<AdminSupportInbox />);
  fireEvent.click(
    await screen.findByRole('button', { name: /Controlled support case/ })
  );
  await screen.findByLabelText('Reason / handover notes');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Refresh inbox' })
    ).not.toBeDisabled()
  );
}

it('refreshes the selected revision after a conflict and preserves unsent drafts', async () => {
  await openCase();
  fireEvent.change(screen.getByLabelText('Reply or note'), {
    target: { value: 'Unsent reply draft' },
  });
  fireEvent.change(screen.getByLabelText('Reason / handover notes'), {
    target: { value: 'Reviewed latest case' },
  });
  serverTicket = { ...serverTicket, status: 'in_progress', revision: 2 };
  fireEvent.click(screen.getByRole('button', { name: 'Save case changes' }));
  await screen.findByText('Case changed. Refresh before updating.');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Case status')).toHaveValue('in_progress')
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save case changes' })
    ).not.toBeDisabled()
  );
  expect(screen.getByLabelText('Reply or note')).toHaveValue(
    'Unsent reply draft'
  );
  expect(screen.getByLabelText('Reason / handover notes')).toHaveValue(
    'Reviewed latest case'
  );
  expect(
    screen.queryByText('Case changed. Refresh before updating.')
  ).not.toBeInTheDocument();
  expect(patches).toHaveLength(1); // Refresh never resubmits a mutation.
  fireEvent.click(screen.getByRole('button', { name: 'Save case changes' }));
  await screen.findByText('Case updated.');
  expect(patches.map((p) => p.revision)).toEqual([1, 2]);
  expect(patches[1].status).toBe('in_progress');
});

it('replaces a previous success with a refresh failure without losing the draft', async () => {
  await openCase();
  fireEvent.change(screen.getByLabelText('Reason / handover notes'), {
    target: { value: 'First update' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save case changes' }));
  await screen.findByText('Case updated.');
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Refresh inbox' })
    ).not.toBeDisabled()
  );
  fireEvent.change(screen.getByLabelText('Reply or note'), {
    target: { value: 'Keep this draft' },
  });
  failRead = true;
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
  await screen.findByText('Could not refresh case');
  expect(screen.queryByText('Case updated.')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Reply or note')).toHaveValue('Keep this draft');
  expect(patches).toHaveLength(1);
});

it('refreshes the inbox when no case is selected', async () => {
  render(<AdminSupportInbox />);
  await screen.findByRole('button', { name: /Controlled support case/ });
  const before = listReads;
  fireEvent.click(screen.getByRole('button', { name: 'Refresh inbox' }));
  await waitFor(() => expect(listReads).toBe(before + 1));
  expect(
    screen.getByText('Select a case to read and reply.')
  ).toBeInTheDocument();
  expect(patches).toHaveLength(0);
});
