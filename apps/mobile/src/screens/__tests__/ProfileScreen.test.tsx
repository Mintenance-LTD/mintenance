import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import ProfileScreen from '../ProfileScreen';
import { TERMS_URL, PRIVACY_URL } from '../../config/legal';

// ---------------------------------------------------------------------------
// Externals only — the screen under test is NOT mocked.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 10, bottom: 0, left: 0, right: 0 }),
}));

// Reanimated-backed animation primitives — render children straight through.
jest.mock('../../components/animations/primitives', () => {
  const ReactActual = require('react');
  const pass = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  return {
    FadeIn: pass,
    SlideIn: pass,
    ScaleIn: pass,
    Pulse: pass,
    BouncyPress: pass,
  };
});

// ResponsiveContainer — pass-through wrapper so the menu rows mount.
jest.mock('../../components/responsive', () => {
  const ReactActual = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

// Presentational header / stats blocks — irrelevant to ProfileScreen's own
// functions; stub to tiny markers so they never pull native deps.
jest.mock('../profile/components/ProfileHeader', () => ({
  ProfileHeader: () => null,
}));
jest.mock('../profile/components/HomeownerStats', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    HomeownerStats: () =>
      ReactActual.createElement(Text, null, 'HOMEOWNER_STATS'),
  };
});
jest.mock('../profile/components/ContractorPerformance', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    ContractorPerformance: () =>
      ReactActual.createElement(Text, null, 'CONTRACTOR_PERF'),
  };
});
jest.mock('../profile/components/ProfileCompleteness', () => ({
  ProfileCompleteness: () => null,
}));

// Keep ProfileMenuSection REAL — it renders the pressable menu rows whose
// onPress handlers are the bulk of the screen's functions.

// Button — render a pressable Text so we can fire Sign Out.
jest.mock('../../components/ui/Button', () => {
  const ReactActual = require('react');
  const { Text } = require('react-native');
  return {
    Button: ({ title, onPress, accessibilityLabel }: any) =>
      ReactActual.createElement(
        Text,
        { onPress, accessibilityLabel, testID: 'btn-' + title },
        title
      ),
  };
});

// Profile data hooks — short-circuit the service chains.
jest.mock('../profile/hooks/useProfileStats', () => ({
  useProfileStats: () => ({
    userStats: {
      totalJobs: 5,
      completedJobs: 3,
      activeJobs: 2,
      rating: 4.5,
      responseTime: '2h',
      joinDate: 'January 2024',
    },
    loading: false,
  }),
}));
jest.mock('../profile/hooks/useContractorVerification', () => ({
  useContractorVerification: () => ({
    identityVerified: true,
    licenseVerified: true,
    paymentMethodLinked: true,
    phoneVerified: true,
  }),
}));

// NotificationService.getUnreadCount drives the Notifications badge.
const mockGetUnreadCount = jest.fn(() => Promise.resolve(7));
jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  },
}));

// goToTab fallback path.
const mockGoToTab = jest.fn();
jest.mock('../../navigation/hooks', () => ({
  goToTab: (...args: unknown[]) => mockGoToTab(...args),
}));

// Navigation — controllable nav object with getParent chain.
const mockNavigate = jest.fn();
const mockRootNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockState = { parentChainEnabled: true, user: null as any };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => {
    const rootNav = { navigate: mockRootNavigate };
    const midNav = {
      getParent: () => (mockState.parentChainEnabled ? rootNav : undefined),
      navigate: mockParentNavigate,
    };
    return {
      navigate: mockNavigate,
      getParent: () => (mockState.parentChainEnabled ? midNav : undefined),
    };
  },
}));

// useAuth — togglable role.
const mockSignOut = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockState.user, signOut: mockSignOut }),
}));

// ---------------------------------------------------------------------------

const setUser = (u: any) => {
  mockState.user = u;
};

describe('ProfileScreen', () => {
  let alertSpy: jest.SpyInstance;
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.parentChainEnabled = true;
    setUser({
      id: 'user-1',
      role: 'homeowner',
      createdAt: '2024-01-01T00:00:00Z',
    });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    openURLSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Mount + effect
  // -------------------------------------------------------------------------

  it('renders homeowner profile and loads unread notification count', async () => {
    const { getByText, getAllByText } = render(<ProfileScreen />);
    expect(getByText('Account')).toBeTruthy();
    expect(getAllByText('My Properties').length).toBeGreaterThan(0); // section + row
    expect(getByText('Support')).toBeTruthy();
    await waitFor(() => {
      expect(mockGetUnreadCount).toHaveBeenCalledWith('user-1');
    });
  });

  it('does not fetch unread count when user has no id', async () => {
    setUser({ role: 'homeowner' }); // no id
    render(<ProfileScreen />);
    // Allow effect to run; getUnreadCount must NOT be called.
    await waitFor(() => expect(mockGetUnreadCount).not.toHaveBeenCalled());
  });

  it('renders HomeownerStats for homeowner role', () => {
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('HOMEOWNER_STATS')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Account menu handlers (homeowner)
  // -------------------------------------------------------------------------

  it('navigates to EditProfile', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Edit Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
  });

  it('navigates to Notifications via the root Modal stack', async () => {
    const { getByText } = render(<ProfileScreen />);
    await waitFor(() => expect(mockGetUnreadCount).toHaveBeenCalled());
    fireEvent.press(getByText('Notifications'));
    expect(mockRootNavigate).toHaveBeenCalledWith('Modal', {
      screen: 'Notifications',
    });
  });

  it('Notifications handler no-ops gracefully when parent chain is missing', () => {
    mockState.parentChainEnabled = false;
    const { getByText } = render(<ProfileScreen />);
    expect(() => fireEvent.press(getByText('Notifications'))).not.toThrow();
    expect(mockRootNavigate).not.toHaveBeenCalled();
  });

  it('navigates to PaymentMethods, Calendar, Reviews', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Payment Methods'));
    expect(mockNavigate).toHaveBeenCalledWith('PaymentMethods');
    fireEvent.press(getByText('Calendar'));
    expect(mockNavigate).toHaveBeenCalledWith('Calendar');
    fireEvent.press(getByText('Reviews'));
    expect(mockNavigate).toHaveBeenCalledWith('Reviews');
  });

  // -------------------------------------------------------------------------
  // Homeowner "My Properties" menu handlers
  // -------------------------------------------------------------------------

  it('navigates through homeowner properties menu rows', () => {
    const { getByText, getAllByText } = render(<ProfileScreen />);
    // "My Properties" appears twice: the section heading AND the first
    // property row. Press the row (last match) which navigates to Properties.
    const myProps = getAllByText('My Properties');
    fireEvent.press(myProps[myProps.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith('Properties');
    fireEvent.press(getByText('Documents'));
    expect(mockNavigate).toHaveBeenCalledWith('Documents');
    fireEvent.press(getByText('Subscription'));
    expect(mockNavigate).toHaveBeenCalledWith('Subscription');
    fireEvent.press(getByText('Financials'));
    expect(mockNavigate).toHaveBeenCalledWith('Financials');
    fireEvent.press(getByText('Escrow Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('EscrowDashboard');
  });

  // -------------------------------------------------------------------------
  // Support menu handlers (shared)
  // -------------------------------------------------------------------------

  it('navigates to SettingsHub and HelpCenter', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('SettingsHub');
    fireEvent.press(getByText('Help Center'));
    expect(mockNavigate).toHaveBeenCalledWith('HelpCenter');
  });

  it('opens mailto for Contact Us', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Contact Us'));
    expect(openURLSpy).toHaveBeenCalledWith(
      'mailto:support@mintenance.co.uk?subject=Support%20Request'
    );
  });

  it('shows an alert when Contact Us mailto fails', async () => {
    openURLSpy.mockRejectedValueOnce(new Error('no email client'));
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Contact Us'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Contact Us',
        expect.stringContaining('support@mintenance.co.uk')
      )
    );
  });

  it('opens Terms of Service URL', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Terms of Service'));
    expect(openURLSpy).toHaveBeenCalledWith(TERMS_URL);
  });

  it('alerts when Terms of Service URL fails to open', async () => {
    openURLSpy.mockRejectedValueOnce(new Error('fail'));
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Terms of Service'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Terms of Service',
        expect.stringContaining('Unable to open')
      )
    );
  });

  it('opens Privacy Policy URL', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Privacy Policy'));
    expect(openURLSpy).toHaveBeenCalledWith(PRIVACY_URL);
  });

  it('alerts when Privacy Policy URL fails to open', async () => {
    openURLSpy.mockRejectedValueOnce(new Error('fail'));
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Privacy Policy'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Privacy Policy',
        expect.stringContaining('Unable to open')
      )
    );
  });

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------

  it('confirms sign out via Alert and calls signOut on confirm', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Sign Out'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
    // Invoke the destructive button's onPress to exercise the bound signOut.
    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const signOutBtn = buttons.find((b) => b.text === 'Sign Out');
    signOutBtn?.onPress?.();
    expect(mockSignOut).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Contractor role branch
  // -------------------------------------------------------------------------

  describe('contractor role', () => {
    beforeEach(() => {
      setUser({
        id: 'c-1',
        role: 'contractor',
        createdAt: '2023-06-01T00:00:00Z',
      });
    });

    it('renders ContractorPerformance and Quick Access section', () => {
      const { getByText, queryByText } = render(<ProfileScreen />);
      expect(getByText('CONTRACTOR_PERF')).toBeTruthy();
      expect(getByText('Quick Access')).toBeTruthy();
      // Homeowner-only section absent.
      expect(queryByText('HOMEOWNER_STATS')).toBeNull();
    });

    it('navigates to Business Tools via typed parent', () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText('Business Tools'));
      expect(mockParentNavigate).toHaveBeenCalledWith('BusinessTab');
      expect(mockGoToTab).not.toHaveBeenCalled();
    });

    it('falls back to goToTab for Business Tools when no parent', () => {
      mockState.parentChainEnabled = false;
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText('Business Tools'));
      expect(mockGoToTab).toHaveBeenCalledWith(
        expect.anything(),
        'BusinessTab'
      );
    });

    it('navigates contractor Quick Access rows', () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText('Verification'));
      expect(mockNavigate).toHaveBeenCalledWith('VerificationStatus');
      fireEvent.press(getByText('Preview public profile'));
      expect(mockNavigate).toHaveBeenCalledWith('MyPublicProfile');
      fireEvent.press(getByText('Business Profile'));
      expect(mockNavigate).toHaveBeenCalledWith('BusinessProfile');
    });
  });

  // -------------------------------------------------------------------------
  // Null user edge
  // -------------------------------------------------------------------------

  it('renders the shared sections with no user (signed-out flash)', () => {
    setUser(null);
    const { getByText, queryByText } = render(<ProfileScreen />);
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
    // Neither role-specific section renders.
    expect(queryByText('HOMEOWNER_STATS')).toBeNull();
    expect(queryByText('CONTRACTOR_PERF')).toBeNull();
    expect(queryByText('Quick Access')).toBeNull();
  });
});
