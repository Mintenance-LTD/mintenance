import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { TrackedQueryClient as QueryClient } from '../../../__tests__/setup/TrackedQueryClient';
import { AgencyCrmScreen } from '../AgencyCrmScreen';

const mockGet = jest.fn();
const mockGoBack = jest.fn();
const mockUser: { current: { id: string; role: string } | null } = {
  current: { id: 'tester', role: 'homeowner' },
};
const workspaceId = '11111111-1111-4111-8111-111111111111';
const secondWorkspaceId = '22222222-2222-4222-8222-222222222222';
const route = (id: string) => '/api/organizations/' + id + '/agency-landlords';
const startingEnvironment = process.env.EXPO_PUBLIC_ENVIRONMENT;
const startingWebUrl = process.env.EXPO_PUBLIC_WEB_URL;

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));
jest.mock('../../../navigation/hooks', () => ({
  goBackSafe: (...args: unknown[]) => mockGoBack(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

function openCrm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const props = {
    navigation: {},
    route: { key: 'test', name: 'AgencyCrm' },
  } as React.ComponentProps<typeof AgencyCrmScreen>;
  return render(
    <QueryClientProvider client={client}>
      <AgencyCrmScreen {...props} />
    </QueryClientProvider>
  );
}

function respond(role = 'manager', allowed = true) {
  mockGet.mockImplementation(async (url: string) => {
    if (url === '/api/portfolio/access') return { allowed };
    if (url === '/api/portfolio/workspace')
      return {
        workspaces: [
          { id: workspaceId, name: 'Test Agency', role },
          { id: secondWorkspaceId, name: 'Another Agency', role },
        ],
      };
    if (url === route(workspaceId))
      return {
        landlords: [
          {
            id: 'l1',
            displayName: 'Asha Property Ltd',
            approvalLimitPence: 15000,
            primaryManagerId: 'manager',
            backupManagerId: null,
            propertyIds: ['p1'],
          },
        ],
        staff: [{ id: 'manager', name: 'Morgan Manager' }],
        properties: [{ id: 'p1', name: 'Test Cottage', landlordId: 'l1' }],
        canEdit: role === 'manager' || role === 'owner',
      };
    if (url === route(secondWorkspaceId))
      return { landlords: [], staff: [], properties: [], canEdit: false };
    throw new Error('Unexpected request: ' + url);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.current = { id: 'tester', role: 'homeowner' };
  process.env.EXPO_PUBLIC_ENVIRONMENT = 'staging';
  process.env.EXPO_PUBLIC_WEB_URL = 'https://qa.example.test';
});
afterEach(() => {
  if (startingEnvironment === undefined)
    delete process.env.EXPO_PUBLIC_ENVIRONMENT;
  else process.env.EXPO_PUBLIC_ENVIRONMENT = startingEnvironment;
  if (startingWebUrl === undefined) delete process.env.EXPO_PUBLIC_WEB_URL;
  else process.env.EXPO_PUBLIC_WEB_URL = startingWebUrl;
  jest.restoreAllMocks();
});

it('opens a native read-only directory and links eligible managers to the exact web workspace', async () => {
  respond();
  const web = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const ui = openCrm();
  expect(await ui.findByText('Asha Property Ltd')).toBeTruthy();
  expect(ui.getByText('Primary manager: Morgan Manager')).toBeTruthy();
  expect(ui.getByText('Backup manager: Unassigned')).toBeTruthy();
  expect(ui.getByText('Works authorisation limit: £150.00')).toBeTruthy();
  expect(ui.getByText('Properties: Test Cottage')).toBeTruthy();
  expect(ui.getByText(/Staff only · Read-only on mobile/)).toBeTruthy();
  fireEvent.changeText(
    ui.getByLabelText('Search by landlord or property'),
    'not a match'
  );
  expect(ui.queryByText('Asha Property Ltd')).toBeNull();
  fireEvent.changeText(
    ui.getByLabelText('Search by landlord or property'),
    'cottage'
  );
  expect(ui.getByText('Asha Property Ltd')).toBeTruthy();
  fireEvent.press(ui.getByText('Edit directory on the web'));
  expect(web).toHaveBeenCalledWith(
    'https://qa.example.test/portfolio?orgId=' + workspaceId + '&view=crm'
  );
  fireEvent.press(ui.getByText('Another Agency'));
  expect(ui.queryByText('Asha Property Ltd')).toBeNull();
  expect(
    await ui.findByText(
      'No landlords have been recorded for this workspace yet.'
    )
  ).toBeTruthy();
});

it('does not fetch a directory for staff outside the authorised CRM roles', async () => {
  respond('viewer');
  const ui = openCrm();
  expect(await ui.findByText(/only available to agency owners/)).toBeTruthy();
  expect(mockGet.mock.calls.map(([url]) => url)).toEqual([
    '/api/portfolio/access',
    '/api/portfolio/workspace',
  ]);
});

it('does not fetch a directory or workspace if Portfolio access is denied', async () => {
  respond('manager', false);
  const ui = openCrm();
  expect(
    await ui.findByText(/Agency workspace access is required/)
  ).toBeTruthy();
  expect(mockGet.mock.calls.map(([url]) => url)).toEqual([
    '/api/portfolio/access',
  ]);
});

it('does not fetch CRM information for a signed-in contractor', () => {
  mockUser.current = { id: 'other', role: 'contractor' };
  const ui = openCrm();
  expect(ui.getByText(/Sign in with your agency staff account/)).toBeTruthy();
  expect(mockGet).not.toHaveBeenCalled();
});

it('lets coordinators read the directory without presenting web edits', async () => {
  respond('maintenance_coordinator');
  const ui = openCrm();
  expect(await ui.findByText('Asha Property Ltd')).toBeTruthy();
  expect(ui.queryByText('Edit directory on the web')).toBeNull();
});

it('never opens the live website from an isolated staging app', async () => {
  process.env.EXPO_PUBLIC_WEB_URL = 'https://www.mintenance.co.uk';
  respond('owner');
  const ui = openCrm();
  expect(await ui.findByText('Asha Property Ltd')).toBeTruthy();
  expect(ui.queryByText('Edit directory on the web')).toBeNull();
});
