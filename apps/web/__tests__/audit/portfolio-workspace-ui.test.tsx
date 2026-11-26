import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PortfolioWorkspace } from '@/app/portfolio/portfolio-workspace';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: vi.fn(async () => ({ 'X-CSRF-Token': 'test-csrf' })),
}));

vi.mock('@/app/portfolio/portfolio-inbox-client', () => ({
  PortfolioInboxClient: ({
    workspaceId,
    workspaceRole,
  }: {
    workspaceId: string;
    workspaceRole: string;
  }) => (
    <p>
      Inbox for {workspaceId} as {workspaceRole}
    </p>
  ),
}));

const user = {
  id: 'test-actor',
  name: 'Test agency user',
  email: 'actor@example.test',
};
const reply = (body: unknown) => Promise.resolve(Response.json(body));

afterEach(() => vi.unstubAllGlobals());

it('shows a separate access requirement without displaying an empty ticket workspace', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      reply({ workspaces: [], unlinkedProperties: [], canSetUp: false })
    )
  );
  render(<PortfolioWorkspace user={user} />);
  expect(await screen.findByText(/ask the agency owner/i)).toBeTruthy();
  expect(screen.queryByText(/Inbox for/)).toBeNull();
});

it('allows an owner to add a coordinator explicitly, defaulting to no permission change', async () => {
  const fetchMock = vi
    .fn(() =>
      reply({
        workspaces: [{ id: 'agency-id', name: 'Test agency', role: 'owner' }],
        unlinkedProperties: [],
        canSetUp: true,
      })
    )
    .mockImplementationOnce(() =>
      reply({
        workspaces: [{ id: 'agency-id', name: 'Test agency', role: 'owner' }],
        unlinkedProperties: [],
        canSetUp: true,
      })
    )
    .mockImplementationOnce(() => reply({ added: true }));
  vi.stubGlobal('fetch', fetchMock);
  render(<PortfolioWorkspace user={user} />);
  const email = await screen.findByLabelText('Teammate email');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.change(email, { target: { value: 'teammate@example.test' } });
  fireEvent.click(
    screen.getByRole('button', { name: 'Add maintenance coordinator' })
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/agency-id/invite',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'teammate@example.test',
          role: 'maintenance_coordinator',
        }),
      })
    )
  );
  expect(await screen.findByText(/teammate added/i)).toBeTruthy();
});

it('selects the coordinator’s workspace without showing the owner invite form', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      reply({
        workspaces: [
          {
            id: 'agency-id',
            name: 'Test agency',
            role: 'maintenance_coordinator',
          },
        ],
        unlinkedProperties: [],
        canSetUp: false,
      })
    )
  );
  render(<PortfolioWorkspace user={user} />);
  expect(
    await screen.findByText('Inbox for agency-id as maintenance_coordinator')
  ).toBeTruthy();
  expect(screen.queryByLabelText('Teammate email')).toBeNull();
});

it('switches between explicit memberships rather than mixing workspaces', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      reply({
        workspaces: [
          {
            id: 'first',
            name: 'First workspace',
            role: 'maintenance_coordinator',
          },
          {
            id: 'second',
            name: 'Second workspace',
            role: 'maintenance_coordinator',
          },
        ],
        unlinkedProperties: [],
        canSetUp: false,
      })
    )
  );
  render(<PortfolioWorkspace user={user} />);
  expect(
    await screen.findByText('Inbox for first as maintenance_coordinator')
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Workspace'), {
    target: { value: 'second' },
  });
  expect(
    await screen.findByText('Inbox for second as maintenance_coordinator')
  ).toBeTruthy();
  expect(
    screen.queryByText('Inbox for first as maintenance_coordinator')
  ).toBeNull();
});

it('guides an owner through creating a workspace without confusing them with invite-only access', async () => {
  const fetcher = vi
    .fn()
    .mockImplementationOnce(() =>
      reply({
        workspaces: [],
        unlinkedProperties: [
          { id: 'p1', property_name: 'Oak House', address: null },
        ],
        canSetUp: true,
      })
    )
    .mockImplementationOnce(() => reply({ orgId: 'new-agency' }))
    .mockImplementationOnce(() =>
      reply({
        workspaces: [{ id: 'new-agency', name: 'Oak Lettings', role: 'owner' }],
        unlinkedProperties: [],
        canSetUp: true,
      })
    );
  vi.stubGlobal('fetch', fetcher);
  render(<PortfolioWorkspace user={user} />);
  const button = await screen.findByRole('button', {
    name: 'Create workspace',
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText('New workspace name'), {
    target: { value: '  Oak Lettings  ' },
  });
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Property to add'), {
    target: { value: 'p1' },
  });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await screen.findByText('Inbox for new-agency as owner');
  expect(fetcher.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    headers: expect.objectContaining({ 'X-CSRF-Token': 'test-csrf' }),
    body: JSON.stringify({
      propertyId: 'p1',
      workspace: { action: 'create', name: 'Oak Lettings' },
    }),
  });
});

it('shows a next step when an eligible owner has no property to link', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      reply({
        workspaces: [],
        unlinkedProperties: [],
        canSetUp: true,
      })
    )
  );
  render(<PortfolioWorkspace user={user} />);
  expect(
    await screen.findByRole('link', { name: 'Add a property' })
  ).toHaveAttribute('href', '/properties/add');
  expect(screen.queryByRole('button', { name: 'Create workspace' })).toBeNull();
});

it('offers a retry for a transient access error without asking the user to upgrade', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: 'Temporarily unavailable' }, { status: 503 })
    )
    .mockImplementationOnce(() =>
      reply({ workspaces: [], unlinkedProperties: [], canSetUp: false })
    );
  vi.stubGlobal('fetch', fetcher);
  render(<PortfolioWorkspace user={user} />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Temporarily unavailable'
  );
  expect(screen.queryByRole('link', { name: 'View plans' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText(/ask the agency owner/i)).toBeTruthy();
});
