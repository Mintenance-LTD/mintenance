import * as Linking from 'expo-linking';
import { linking } from '../deepLinking';
import { logger } from '../../utils/logger';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({ logger: { info: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('forwards the cold-start URL without logging its credentials', async () => {
  const url =
    'mintenance://reset-password?token=synthetic-secret#session=private';
  (Linking.getInitialURL as jest.Mock).mockResolvedValue(url);
  expect(await linking.getInitialURL!()).toBe(url);
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain(
    url
  );
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain(
    'synthetic-secret'
  );
});

it('forwards warm links and unsubscribes without logging link contents', () => {
  const remove = jest.fn();
  (Linking.addEventListener as jest.Mock).mockReturnValue({ remove });
  const listener = jest.fn();
  const unsubscribe = linking.subscribe!(listener);
  const onLink = (Linking.addEventListener as jest.Mock).mock.calls[0][1];
  const url = 'mintenance://register/invitation?token=synthetic-invite';
  onLink({ url });
  expect(listener).toHaveBeenCalledWith(url);
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain(
    'synthetic-invite'
  );
  if (typeof unsubscribe === 'function') unsubscribe();
  expect(remove).toHaveBeenCalled();
});

// The same parser NavigationContainer uses must resolve both report and
// property URLs without breaking the existing property overview link.
it('maps a shared inspection link to the exact native report', () => {
  const paths = linking.config!.screens!.Main as {
    screens: { ProfileTab: { screens: Record<string, string> } };
  };
  expect(paths.screens.ProfileTab.screens.PropertyInspection).toBe(
    'properties/:propertyId/inspections/:reportId'
  );
  expect(paths.screens.ProfileTab.screens.PropertyDetail).toBe(
    'properties/:propertyId'
  );
});
