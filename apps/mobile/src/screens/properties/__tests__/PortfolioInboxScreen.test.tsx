import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioInboxScreen } from '../PortfolioInboxScreen';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockNavigate = jest.fn();
const mockBack = jest.fn();
const user = 'synthetic-user';
const org = '11111111-1111-4111-8111-111111111111';
const otherOrg = '22222222-2222-4222-8222-222222222222';
const property = {
  id: '33333333-3333-4333-8333-333333333333',
  property_name: 'Synthetic property',
  address: null,
};
const ticket = {
  id: '44444444-4444-4444-8444-444444444444',
  org_id: org,
  property_id: property.id,
  title: 'Synthetic repair',
  description: 'No visit or work required.',
  priority: 'medium',
  category: 'general',
  status: 'open',
};
const assessmentId = '55555555-5555-4555-8555-555555555555';
const workspace = { id: org, name: 'Synthetic workspace', role: 'manager' };

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: user } }),
}));
jest.mock('../../../navigation/hooks', () => ({
  goBackSafe: (...args: unknown[]) => mockBack(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

let client: QueryClient;

beforeEach(() => {
  jest.resetAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

function show(params?: { ticketId?: string; orgId?: string }) {
  const props = {
    route: { name: 'PortfolioInbox', key: 'portfolio', params },
    navigation: { navigate: mockNavigate },
  } as unknown as React.ComponentProps<typeof PortfolioInboxScreen>;
  return render(
    <QueryClientProvider client={client}>
      <PortfolioInboxScreen {...props} />
    </QueryClientProvider>
  );
}

const workOrderPath = '/api/portfolio/tickets/' + ticket.id + '/work-order';

function respond({
  role = 'manager',
  allow = true,
  withTicket = true,
  readWorkOrder = () => null as unknown,
} = {}) {
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/api/portfolio/access') return { allowed: allow };
    if (url === '/api/portfolio/workspace') {
      return {
        workspaces: [{ ...workspace, role }],
        unlinkedProperties: [],
        canSetUp: false,
      };
    }
    if (url.startsWith('/api/portfolio/tickets?'))
      return { tickets: withTicket ? [ticket] : [] };
    if (url === workOrderPath) return { workOrder: readWorkOrder() };
    if (url === '/api/portfolio/tickets/' + ticket.id)
      return { ticket, updates: [] };
    if (url.startsWith('/api/portfolio/properties?')) {
      return {
        properties: [property],
        pagination: { hasMore: false, totalPages: 1 },
      };
    }
    throw new Error('Unexpected request: ' + url);
  });
}

it('loads and opens a real ticket, then updates status and a private note', async () => {
  respond();
  mockPatch.mockResolvedValue({ ticket: { ...ticket, status: 'in_progress' } });
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  expect(await view.findByText(ticket.description)).toBeTruthy();
  fireEvent.press(view.getByText('In progress'));
  fireEvent.changeText(
    view.getByLabelText('Internal note (optional)'),
    'Test handover'
  );
  fireEvent.press(view.getByText('Save ticket changes'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith(
      '/api/portfolio/tickets/' + ticket.id,
      {
        status: 'in_progress',
        resolutionNote: 'Test handover',
      }
    )
  );
  expect(await view.findByText('Ticket updated.')).toBeTruthy();
  expect(
    mockGet.mock.calls.some(([url]) => url.startsWith('/api/portfolio/queue'))
  ).toBe(false);
});

it('creates a scoped internal ticket using an actual workspace property', async () => {
  respond({ withTicket: false });
  mockPost.mockResolvedValueOnce({ ticket });
  const view = show();
  fireEvent.press(await view.findByText('New internal ticket'));
  fireEvent.press(await view.findByText(property.property_name));
  fireEvent.changeText(view.getByLabelText('Ticket title'), '  Test repair  ');
  fireEvent.changeText(
    view.getByLabelText('Description (at least 10 characters)'),
    '  No real visit required. '
  );
  fireEvent.press(view.getByText('Create internal ticket'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/portfolio/tickets', {
      orgId: org,
      propertyId: property.id,
      title: 'Test repair',
      description: 'No real visit required.',
      category: 'general',
      priority: 'medium',
    })
  );
  expect(await view.findByText(ticket.title)).toBeTruthy();
});

it('blocks privileged calls when Portfolio access is unavailable', async () => {
  respond({ allow: false });
  const view = show();
  expect(await view.findByText('Portfolio access needed')).toBeTruthy();
  expect(mockGet.mock.calls.map(([url]) => url)).toEqual([
    '/api/portfolio/access',
  ]);
  expect(mockPost).not.toHaveBeenCalled();
});

it('gives a non-manager staff member read-only access', async () => {
  respond({ role: 'accountant' });
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  expect(await view.findByText(ticket.description)).toBeTruthy();
  expect(view.queryByText('Save ticket changes')).toBeNull();
  expect(view.queryByText('Open private work order')).toBeNull();
  expect(mockGet.mock.calls.some(([url]) => url.endsWith('/work-order'))).toBe(
    false
  );
  fireEvent.press(view.getByText('Back to tickets'));
  expect(view.queryByText('New internal ticket')).toBeNull();
});

it('filters out a tenant membership and shows invitation guidance', async () => {
  respond({ role: 'tenant' });
  const view = show();
  expect(await view.findByText('No staff workspace yet')).toBeTruthy();
  expect(
    mockGet.mock.calls.some(([url]) => url.startsWith('/api/portfolio/tickets'))
  ).toBe(false);
});

it('sets up an eligible workspace and lands on its returned inbox', async () => {
  let created = false;
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/api/portfolio/access') return { allowed: true };
    if (url === '/api/portfolio/workspace') {
      return {
        canSetUp: true,
        unlinkedProperties: created ? [] : [property],
        workspaces: created
          ? [{ ...workspace, role: 'owner', name: 'My team' }]
          : [],
      };
    }
    if (url.startsWith('/api/portfolio/tickets?')) return { tickets: [] };
    throw new Error('Unexpected request: ' + url);
  });
  mockPost.mockImplementation(async () => {
    created = true;
    return { orgId: org };
  });
  const view = show();
  fireEvent.changeText(
    await view.findByLabelText('Workspace name'),
    '  My team  '
  );
  fireEvent.press(view.getByText(property.property_name));
  fireEvent.press(view.getByText('Create workspace and add property'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/portfolio/workspace', {
      propertyId: property.id,
      workspace: { action: 'create', name: 'My team' },
    })
  );
  expect(
    await view.findByText('No internal tickets in this workspace yet.')
  ).toBeTruthy();
  expect(view.getByText('My team')).toBeTruthy();
});

it('selects the linked workspace and opens a permitted source in native navigation', async () => {
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/api/portfolio/access') return { allowed: true };
    if (url === '/api/portfolio/workspace')
      return {
        canSetUp: false,
        workspaces: [
          { id: otherOrg, name: 'Other workspace', role: 'manager' },
          workspace,
        ],
        unlinkedProperties: [],
      };
    if (url === '/api/portfolio/tickets/' + ticket.id)
      return {
        ticket,
        updates: [],
        assessmentSource: { id: assessmentId, href: '/not-used' },
      };
    throw new Error('Unexpected request: ' + url);
  });
  const view = show({ ticketId: ticket.id, orgId: org });
  fireEvent.press(await view.findByText('Open source assessment'));
  expect(mockNavigate).toHaveBeenCalledWith('AssessmentDetail', {
    assessmentId,
    propertyId: property.id,
  });
});

it('does not fetch an exact ticket for an unavailable workspace', async () => {
  respond();
  const view = show({ ticketId: ticket.id, orgId: otherOrg });
  expect(
    await view.findByText(
      "This ticket's workspace is not available to this account."
    )
  ).toBeTruthy();
  expect(
    mockGet.mock.calls.some(
      ([url]) => url === '/api/portfolio/tickets/' + ticket.id
    )
  ).toBe(false);
});

it('fails closed when the detail response belongs to another workspace', async () => {
  respond();
  const implementation = mockGet.getMockImplementation()!;
  mockGet.mockImplementation(async (url: string) =>
    url === '/api/portfolio/tickets/' + ticket.id
      ? { ticket: { ...ticket, org_id: otherOrg }, updates: [] }
      : implementation(url)
  );
  const view = show({ ticketId: ticket.id, orgId: org });
  expect(
    await view.findByText(
      'You do not have permission for this workspace or ticket.'
    )
  ).toBeTruthy();
  expect(view.queryByText(ticket.description)).toBeNull();
});

it('links an unlinked owned property to an existing owned workspace', async () => {
  let linked = false;
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/api/portfolio/access') return { allowed: true };
    if (url === '/api/portfolio/workspace')
      return {
        workspaces: [{ ...workspace, role: 'owner' }],
        canSetUp: true,
        unlinkedProperties: linked ? [] : [property],
      };
    if (url.startsWith('/api/portfolio/tickets?')) return { tickets: [] };
    throw new Error('Unexpected request: ' + url);
  });
  mockPost.mockImplementation(async () => {
    linked = true;
    return { orgId: org };
  });
  const view = show();
  fireEvent.press(await view.findByText('Add a property'));
  fireEvent.press(view.getByText(property.property_name));
  fireEvent.press(view.getByText('Add to this workspace'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/api/portfolio/workspace', {
      propertyId: property.id,
      workspace: { action: 'link', orgId: org },
    })
  );
  expect(
    await view.findByText('No internal tickets in this workspace yet.')
  ).toBeTruthy();
});

it('distinguishes access-check failure from denial and lets the user retry', async () => {
  respond();
  mockGet.mockRejectedValueOnce(new Error('offline'));
  const view = show();
  expect(
    await view.findByText('Could not check Portfolio access.')
  ).toBeTruthy();
  expect(view.queryByText('Portfolio access needed')).toBeNull();
  fireEvent.press(view.getByText('Try again'));
  expect(await view.findByText(ticket.title)).toBeTruthy();
});

it('keeps internal ticket inputs after an unsuccessful create and avoids duplicate taps', async () => {
  respond();
  let rejectWrite: (error: Error) => void = () => undefined;
  mockPost.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectWrite = reject;
      })
  );
  const view = show();
  fireEvent.press(await view.findByText('New internal ticket'));
  fireEvent.press(await view.findByText(property.property_name));
  fireEvent.changeText(view.getByLabelText('Ticket title'), 'Test repair');
  fireEvent.changeText(
    view.getByLabelText('Description (at least 10 characters)'),
    'No real visit required.'
  );
  fireEvent.press(view.getByText('Create internal ticket'));
  fireEvent.press(view.getByText('Creating ticket…'));
  expect(mockPost).toHaveBeenCalledTimes(1);
  rejectWrite(new Error('connection dropped'));
  expect(
    await view.findByText(
      'Could not confirm ticket creation. Check the inbox before trying again.'
    )
  ).toBeTruthy();
  expect(view.getByLabelText('Ticket title').props.value).toBe('Test repair');
});

const fixtureWorkOrder = {
  ticketId: ticket.id,
  revision: 1,
  arrangement: 'agency_contractor',
  contractorName: 'Synthetic plumber',
  quotedPence: 24050,
  approvedPence: 24050,
  approvalReference: 'Approved by synthetic owner',
  invoicedPence: 20000,
  invoiceReference: 'TEST-001',
  paidPence: null,
  paymentReference: null,
  completionNote: null,
  updatedAt: '2026-11-26T12:00:00Z',
};

it('records private work and distinguishes approved, invoiced and paid on the same ticket', async () => {
  respond();
  mockPut.mockResolvedValue({ workOrder: fixtureWorkOrder });
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  fireEvent.press(await view.findByText('Open private work order'));
  fireEvent.press(await view.findByText('Record private work order'));
  fireEvent.changeText(
    view.getByLabelText('Contractor or company name'),
    'Synthetic plumber'
  );
  fireEvent.changeText(view.getByLabelText('Quoted cost (£)'), '240.50');
  fireEvent.changeText(view.getByLabelText('Approved cost (£)'), '240.50');
  fireEvent.changeText(
    view.getByLabelText('Approval reference'),
    'Approved by synthetic owner'
  );
  fireEvent.changeText(view.getByLabelText('Invoiced cost (£)'), '200');
  fireEvent.changeText(view.getByLabelText('Invoice reference'), 'TEST-001');
  fireEvent.press(view.getByText('Save private work order'));

  await waitFor(() =>
    expect(mockPut).toHaveBeenCalledWith(workOrderPath, {
      revision: 0,
      arrangement: 'agency_contractor',
      contractorName: 'Synthetic plumber',
      quotedPence: 24050,
      approvedPence: 24050,
      approvalReference: 'Approved by synthetic owner',
      invoicedPence: 20000,
      invoiceReference: 'TEST-001',
      paidPence: null,
      paymentReference: null,
      completionNote: null,
    })
  );
  expect(await view.findByText('Private work order saved.')).toBeTruthy();
  expect(view.getByText('Approved cost: £240.50')).toBeTruthy();
  expect(view.getByText('Invoiced cost: £200.00')).toBeTruthy();
  expect(view.getByText('Recorded as paid: Not recorded')).toBeTruthy();
  expect(mockPost).not.toHaveBeenCalled();
});

it('blocks a stale private work order edit until staff explicitly discard and reload', async () => {
  let order = fixtureWorkOrder;
  respond({ readWorkOrder: () => order });
  mockPut.mockImplementationOnce(async () => {
    order = {
      ...fixtureWorkOrder,
      revision: 2,
      contractorName: 'Replacement plumber',
    };
    throw Object.assign(new Error('Conflict'), { statusCode: 409 });
  });
  mockPut.mockImplementationOnce(async () => ({
    workOrder: { ...order, revision: 3 },
  }));
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  fireEvent.press(await view.findByText('Open private work order'));
  fireEvent.press(await view.findByText('Edit private work order'));
  fireEvent.changeText(
    view.getByLabelText('Contractor or company name'),
    'My unsaved edit'
  );
  fireEvent.press(view.getByText('Save private work order'));
  expect(
    await view.findByText(
      'This work order changed. Reload the latest version before saving.'
    )
  ).toBeTruthy();
  expect(view.getByLabelText('Contractor or company name').props.value).toBe(
    'My unsaved edit'
  );
  fireEvent.press(view.getByText('Save private work order'));
  expect(mockPut).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText('Discard changes and reload'));
  expect(await view.findByText('Latest version loaded.')).toBeTruthy();
  expect(view.getByLabelText('Contractor or company name').props.value).toBe(
    'Replacement plumber'
  );
  fireEvent.press(view.getByText('Save private work order'));
  await waitFor(() =>
    expect(mockPut).toHaveBeenLastCalledWith(
      workOrderPath,
      expect.objectContaining({ revision: 2 })
    )
  );
});

it('rejects a work order returned for a different ticket', async () => {
  respond({
    readWorkOrder: () => ({
      ...fixtureWorkOrder,
      ticketId: 'different-ticket',
    }),
  });
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  fireEvent.press(await view.findByText('Open private work order'));
  expect(
    await view.findByText(
      'You do not have permission for this workspace or ticket.'
    )
  ).toBeTruthy();
  expect(view.queryByText('Synthetic plumber')).toBeNull();
});

it('requires evidence and a sufficient invoice before recording an external payment', async () => {
  respond();
  const view = show();
  fireEvent.press(await view.findByText(ticket.title));
  fireEvent.press(await view.findByText('Open private work order'));
  fireEvent.press(await view.findByText('Record private work order'));
  fireEvent.press(view.getByText('Already arranged outside Mintenance'));
  fireEvent.changeText(
    view.getByLabelText('Contractor or company name'),
    'Synthetic plumber'
  );
  fireEvent.changeText(view.getByLabelText('Invoiced cost (£)'), '200');
  fireEvent.changeText(view.getByLabelText('Invoice reference'), 'TEST-002');
  fireEvent.changeText(view.getByLabelText('Recorded as paid (£)'), '201');
  fireEvent.changeText(
    view.getByLabelText('Payment reference'),
    'Synthetic remittance'
  );
  fireEvent.press(view.getByText('Save private work order'));
  expect(
    await view.findByText(
      'Record a payment reference and an amount no higher than the invoice.'
    )
  ).toBeTruthy();
  expect(mockPut).not.toHaveBeenCalled();
});
