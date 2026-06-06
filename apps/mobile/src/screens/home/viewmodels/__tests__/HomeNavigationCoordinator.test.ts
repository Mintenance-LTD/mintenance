/**
 * HomeNavigationCoordinator — maps dashboard actions to navigation calls with
 * haptic feedback. Tested directly (the class is the exported surface); no
 * render needed. haptics + navigation are injected, so we pass mocks.
 */

jest.mock('../../../../utils/haptics', () => ({
  __esModule: true,
  useHaptics: () => ({ light: jest.fn(), selection: jest.fn() }),
}));

import { HomeNavigationCoordinator } from '../HomeNavigationCoordinator';

function setup(parent?: { navigate: jest.Mock }) {
  const navigate = jest.fn();
  const getParent = jest.fn(() => parent);
  const haptics = { light: jest.fn(), selection: jest.fn() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coordinator = new HomeNavigationCoordinator(
    { navigate, getParent } as any,
    haptics as any
  );
  return { coordinator, navigate, getParent, haptics };
}

describe('HomeNavigationCoordinator', () => {
  it('openServiceRequest navigates via the parent modal stack with haptics', () => {
    const parentNavigate = jest.fn();
    const { coordinator, getParent, haptics } = setup({
      navigate: parentNavigate,
    });
    coordinator.openServiceRequest({ jobId: 'j1' });
    expect(haptics.light).toHaveBeenCalled();
    expect(getParent).toHaveBeenCalled();
    expect(parentNavigate).toHaveBeenCalledWith('Modal', {
      screen: 'ServiceRequest',
      params: { jobId: 'j1' },
    });
  });

  it('openServiceRequest does not throw when there is no parent', () => {
    const { coordinator } = setup(undefined);
    expect(() => coordinator.openServiceRequest()).not.toThrow();
  });

  it.each([
    [
      'openJobsList',
      (c: HomeNavigationCoordinator) => c.openJobsList(),
      'JobsTab',
      { screen: 'JobsList' },
    ],
    [
      'openInbox',
      (c: HomeNavigationCoordinator) => c.openInbox(),
      'MessagingTab',
      { screen: 'MessagesList' },
    ],
    [
      'openMeetingSchedule',
      (c: HomeNavigationCoordinator) => c.openMeetingSchedule(),
      'ProfileTab',
      { screen: 'BookingStatus' },
    ],
    [
      'openProfileScreen',
      (c: HomeNavigationCoordinator) => c.openProfileScreen(),
      'ProfileTab',
      { screen: 'ProfileMain' },
    ],
    [
      'openSettingsScreen',
      (c: HomeNavigationCoordinator) => c.openSettingsScreen(),
      'ProfileTab',
      { screen: 'NotificationPreferences' },
    ],
    [
      'openNotificationSettings',
      (c: HomeNavigationCoordinator) => c.openNotificationSettings(),
      'ProfileTab',
      { screen: 'NotificationPreferences' },
    ],
    [
      'openPaymentMethods',
      (c: HomeNavigationCoordinator) => c.openPaymentMethods(),
      'ProfileTab',
      { screen: 'PaymentMethods' },
    ],
    [
      'openSupport',
      (c: HomeNavigationCoordinator) => c.openSupport(),
      'ProfileTab',
      { screen: 'HelpCenter' },
    ],
  ])('%s routes correctly', (_label, call, tab, payload) => {
    const { coordinator, navigate } = setup();
    call(coordinator);
    expect(navigate).toHaveBeenCalledWith(tab, payload);
  });

  it('openConversation forwards params to the messaging screen', () => {
    const { coordinator, navigate } = setup();
    coordinator.openConversation({ conversationId: 'c1' });
    expect(navigate).toHaveBeenCalledWith('MessagingTab', {
      screen: 'Messaging',
      params: { conversationId: 'c1' },
    });
  });

  it('openJobDetails passes the jobId', () => {
    const { coordinator, navigate } = setup();
    coordinator.openJobDetails('job-42');
    expect(navigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'job-42' },
    });
  });
});
