import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { TrackedQueryClient as QueryClient } from '../../../__tests__/setup/TrackedQueryClient';
import { AgencyPrivateWorkScreen } from '../AgencyPrivateWorkScreen';
import { StaffAgencyDispatchPanel } from '../components/StaffAgencyDispatchPanel';
import { AgencyPrivateWorkShortcut } from '../../home/components/AgencyPrivateWorkShortcut';
import type { PrivateDispatch } from '../components/agencyPrivateDispatchModel';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockUser = { role: 'homeowner', id: 'test-user' };
const ticket = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherTicket = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const endpoint = '/api/portfolio/tickets/' + ticket + '/private-dispatch';
const quote: PrivateDispatch = {
  ticketId: ticket,
  title: 'Synthetic leak quote',
  ticketStatus: 'open',
  viewer: 'landlord',
  revision: 4,
  quoteVersion: 2,
  quotePence: 24000,
  quoteScope: 'Replace the leaking isolation valve.',
  approvalLimitPence: 15000,
  decision: null,
  authorization: 'approval_required',
  contractorId: null,
  dispatchedAt: null,
  acceptedAt: null,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('../../../navigation/hooks', () => ({
  goBackSafe: (...args: unknown[]) => mockGoBack(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

function inbox(viewer: 'landlord' | 'contractor' = 'landlord') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const props = {
    route: {
      key: 'test-private-work',
      name: 'AgencyPrivateWork',
      params: { viewer },
    },
    navigation: {},
  } as React.ComponentProps<typeof AgencyPrivateWorkScreen>;
  return render(
    <QueryClientProvider client={client}>
      <AgencyPrivateWorkScreen {...props} />
    </QueryClientProvider>
  );
}

function respond(current: () => PrivateDispatch | null, initial = quote) {
  mockGet.mockImplementation(async (path: string) => {
    if (path === '/api/agency-work') return { items: [initial] };
    if (path === endpoint) return { dispatch: current() };
    throw new Error('Unexpected request: ' + path);
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockUser.role = 'homeowner';
});

it('routes each independently labelled dashboard entry to its signed-in experience', () => {
  const ui = render(
    <>
      <AgencyPrivateWorkShortcut viewer='landlord' />
      <AgencyPrivateWorkShortcut viewer='contractor' />
    </>
  );
  fireEvent.press(ui.getByText('Open agency quote approvals'));
  expect(mockNavigate).toHaveBeenLastCalledWith('ProfileTab', {
    screen: 'AgencyPrivateWork',
    params: { viewer: 'landlord' },
  });
  fireEvent.press(ui.getByText('Open direct agency work'));
  expect(mockNavigate).toHaveBeenLastCalledWith('ProfileTab', {
    screen: 'AgencyPrivateWork',
    params: { viewer: 'contractor' },
  });
});

it('approves only the visible quote version from a homeowner session, without a Portfolio plan lookup', async () => {
  respond(() => quote);
  mockPost.mockResolvedValue({
    dispatch: {
      ...quote,
      revision: 5,
      authorization: 'landlord_approved',
      decision: 'approved',
    },
  });
  const ui = inbox();
  fireEvent.press(await ui.findByText('Open quote: Synthetic leak quote'));
  expect(await ui.findByText('Quote version 2 · £240.00')).toBeTruthy();
  expect(ui.getByText(quote.quoteScope!)).toBeTruthy();
  expect(ui.getByText('Works authorisation limit: £150.00')).toBeTruthy();
  fireEvent.press(ui.getByText('Approve quote'));
  expect(mockPost).not.toHaveBeenCalled();
  expect(
    ui.getByText('Confirm approve quote for quote version 2 (£240.00).')
  ).toBeTruthy();
  fireEvent.press(ui.getByText('Confirm approve quote'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(endpoint, {
      action: 'approve',
      quoteVersion: 2,
      revision: 4,
    })
  );
  expect(
    await ui.findByText('Quote approved. No payment was taken.')
  ).toBeTruthy();
  expect(ui.queryByText('Approve quote')).toBeNull();
  expect(
    mockGet.mock.calls.every(
      ([path]) => path === '/api/agency-work' || path === endpoint
    )
  ).toBe(true);
});

it('requires explicit review before rejecting an updated quote after a conflict', async () => {
  let current = quote;
  respond(() => current);
  mockPost
    .mockImplementationOnce(async () => {
      current = { ...quote, revision: 5, quoteVersion: 3, quotePence: 27000 };
      throw Object.assign(new Error('Conflict'), { statusCode: 409 });
    })
    .mockImplementationOnce(async () => ({
      dispatch: { ...current, revision: 6, decision: 'rejected' },
    }));
  const ui = inbox();
  fireEvent.press(await ui.findByText('Open quote: Synthetic leak quote'));
  fireEvent.press(await ui.findByText('Reject quote'));
  fireEvent.press(ui.getByText('Confirm reject quote'));
  fireEvent.press(await ui.findByText('Reload latest version'));
  expect(await ui.findByText('Quote version 3 · £270.00')).toBeTruthy();
  expect(ui.queryByText('Confirm reject quote')).toBeNull();
  expect(mockPost).toHaveBeenCalledTimes(1);
  fireEvent.press(ui.getByText('Reject quote'));
  fireEvent.press(ui.getByText('Confirm reject quote'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenLastCalledWith(endpoint, {
      action: 'reject',
      quoteVersion: 3,
      revision: 5,
    })
  );
  expect(await ui.findByText('Quote rejected.')).toBeTruthy();
});

it('lets the assigned contractor accept privately without seeing landlord controls or limit', async () => {
  mockUser.role = 'contractor';
  const assigned: PrivateDispatch = {
    ...quote,
    viewer: 'contractor',
    authorization: null,
    dispatchedAt: '2026-11-27T09:00:00Z',
  };
  respond(() => assigned, assigned);
  mockPost.mockResolvedValue({
    dispatch: { ...assigned, revision: 5, acceptedAt: '2026-11-27T09:30:00Z' },
  });
  const ui = inbox('contractor');
  fireEvent.press(await ui.findByText('Open assignment: Synthetic leak quote'));
  fireEvent.press(await ui.findByText('Accept assignment'));
  expect(ui.queryByText('Works authorisation limit: £150.00')).toBeNull();
  expect(ui.queryByText('Approve quote')).toBeNull();
  fireEvent.press(ui.getByText('Confirm accept assignment'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(endpoint, {
      action: 'accept',
      quoteVersion: 2,
      revision: 4,
    })
  );
  expect(
    await ui.findByText('Assignment accepted. No payment was taken.')
  ).toBeTruthy();
});

it('shows no decision for an already-dispatched quote', async () => {
  respond(() => ({ ...quote, dispatchedAt: '2026-11-27T09:00:00Z' }));
  const ui = inbox();
  fireEvent.press(await ui.findByText('Open quote: Synthetic leak quote'));
  await ui.findByText('Quote version 2 · £240.00');
  expect(ui.queryByText('Approve quote')).toBeNull();
  expect(ui.queryByText('Reject quote')).toBeNull();
});

it('shows no details if a response belongs to another ticket', async () => {
  respond(() => ({
    ...quote,
    ticketId: otherTicket,
    quoteScope: 'Other ticket details',
  }));
  const ui = inbox();
  fireEvent.press(await ui.findByText('Open quote: Synthetic leak quote'));
  expect(
    await ui.findByText(
      'You do not have permission for this workspace or ticket.'
    )
  ).toBeTruthy();
  expect(ui.queryByText('Other ticket details')).toBeNull();
  expect(mockPost).not.toHaveBeenCalled();
});

it('does not issue a recipient query if the signed-in role differs from the screen', () => {
  const ui = inbox('contractor');
  expect(
    ui.getByText('Sign in with the account the agency shared this work with.')
  ).toBeTruthy();
  expect(mockGet).not.toHaveBeenCalled();
});

function staffPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StaffAgencyDispatchPanel
        userId='owner'
        workspaceId='workspace'
        ticketId={ticket}
        arrangement='agency_contractor'
      />
    </QueryClientProvider>
  );
}

it('lets staff prepare a versioned quote, then assigns only the exact approved version', async () => {
  let current: PrivateDispatch = {
    ...quote,
    viewer: 'staff',
    revision: 0,
    quoteVersion: null,
    authorization: 'no_quote',
    quotePence: null,
    quoteScope: null,
  };
  respond(() => current);
  mockPost.mockImplementationOnce(async () => {
    current = { ...quote, viewer: 'staff', revision: 1, quoteVersion: 1 };
    return { dispatch: current };
  });
  const ui = staffPanel();
  fireEvent.press(ui.getByText('Open private dispatch'));
  fireEvent.press(await ui.findByText('Prepare versioned quote'));
  fireEvent.changeText(ui.getByLabelText('Quote amount (£)'), '240');
  fireEvent.changeText(
    ui.getByLabelText('Quote scope of work'),
    quote.quoteScope!
  );
  fireEvent.press(ui.getByText('Save versioned quote'));
  expect(await ui.findByText('Versioned quote saved.')).toBeTruthy();
  expect(mockPost).toHaveBeenLastCalledWith(endpoint, {
    action: 'quote',
    revision: 0,
    quotePence: 24000,
    quoteScope: quote.quoteScope,
  });
  expect(ui.queryByText('Assign to verified contractor')).toBeNull();
  ui.unmount();

  current = {
    ...current,
    revision: 2,
    authorization: 'landlord_approved',
    decision: 'approved',
  };
  mockPost.mockResolvedValueOnce({
    dispatch: { ...current, revision: 3, dispatchedAt: '2026-11-27T10:30:00Z' },
  });
  const refreshed = staffPanel();
  fireEvent.press(refreshed.getByText('Open private dispatch'));
  fireEvent.press(await refreshed.findByText('Assign to verified contractor'));
  fireEvent.changeText(
    refreshed.getByLabelText('Verified contractor email'),
    '  Synthetic-Trade@Example.invalid '
  );
  fireEvent.press(refreshed.getByText('Confirm private assignment'));
  expect(
    await refreshed.findByText('Assigned privately. No payment was taken.')
  ).toBeTruthy();
  expect(mockPost).toHaveBeenLastCalledWith(endpoint, {
    action: 'dispatch',
    revision: 2,
    quoteVersion: 1,
    contractorEmail: 'synthetic-trade@example.invalid',
  });
});

it('permits a staff revoke on a closed ticket without allowing quote edits', async () => {
  const current: PrivateDispatch = {
    ...quote,
    viewer: 'staff',
    ticketStatus: 'closed',
    dispatchedAt: '2026-11-27T09:00:00Z',
    acceptedAt: '2026-11-27T09:10:00Z',
  };
  respond(() => current);
  mockPost.mockResolvedValue({
    dispatch: { ...current, revision: 5, dispatchedAt: null, acceptedAt: null },
  });
  const ui = staffPanel();
  fireEvent.press(ui.getByText('Open private dispatch'));
  fireEvent.press(await ui.findByText('Revoke private assignment'));
  expect(ui.queryByText('Revise versioned quote')).toBeNull();
  fireEvent.press(ui.getByText('Confirm revoke'));
  expect(
    await ui.findByText('The private assignment was revoked.')
  ).toBeTruthy();
  expect(mockPost).toHaveBeenCalledWith(endpoint, {
    action: 'revoke',
    revision: 4,
    quoteVersion: 2,
  });
});
