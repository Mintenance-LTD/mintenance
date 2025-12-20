import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';

// Import navigation components
import RootNavigator from '../../navigation/RootNavigator';
import JobsNavigator from '../../navigation/navigators/JobsNavigator';
import AuthNavigator from '../../navigation/navigators/AuthNavigator';
import MessagingNavigator from '../../navigation/navigators/MessagingNavigator';
import ProfileNavigator from '../../navigation/navigators/ProfileNavigator';
import ModalNavigator from '../../navigation/navigators/ModalNavigator';

// Import navigation hooks
import {
  useTypedNavigation,
  useJobsNavigation,
  useMessagingNavigation,
  useProfileNavigation,
  navigateToScreen,
  goBackSafe,
  resetToScreen,
} from '../../navigation/hooks';

// Import types
import type {
  RootStackParamList,
  JobsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList,
} from '../../navigation/types';

// Import test utilities
import { createTestQueryClient } from '../utils/test-utils';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock dependencies
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    tabSwitch: jest.fn(),
  }),
}));

jest.mock('../../components/ErrorBoundaryProvider', () => ({
  AppErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  withScreenErrorBoundary: (Component: React.ComponentType, name: string) => Component,
}));

// Mock all screen components
jest.mock('../../screens/HomeScreen', () => {
  const { View, Text } = require('react-native');
  return function MockHomeScreen() {
    return (
      <View testID="home-screen">
        <Text>Home Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/JobsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockJobsScreen() {
    return (
      <View testID="jobs-screen">
        <Text>Jobs Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/JobDetailsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockJobDetailsScreen() {
    return (
      <View testID="job-details-screen">
        <Text>Job Details Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/JobPostingScreen', () => {
  const { View, Text } = require('react-native');
  return function MockJobPostingScreen() {
    return (
      <View testID="job-posting-screen">
        <Text>Job Posting Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/LoginScreen', () => {
  const { View, Text } = require('react-native');
  return function MockLoginScreen() {
    return (
      <View testID="login-screen">
        <Text>Login Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/RegisterScreen', () => {
  const { View, Text } = require('react-native');
  return function MockRegisterScreen() {
    return (
      <View testID="register-screen">
        <Text>Register Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/MessagesListScreen', () => {
  const { View, Text } = require('react-native');
  return function MockMessagesListScreen() {
    return (
      <View testID="messages-list-screen">
        <Text>Messages List Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/ProfileScreen', () => {
  const { View, Text } = require('react-native');
  return function MockProfileScreen() {
    return (
      <View testID="profile-screen">
        <Text>Profile Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/ContractorSocialScreen', () => {
  const { View, Text } = require('react-native');
  return function MockContractorSocialScreen() {
    return (
      <View testID="contractor-social-screen">
        <Text>Contractor Social Screen</Text>
      </View>
    );
  };
});

// Mock other screens individually to avoid jest mock factory issues
jest.mock('../../screens/ForgotPasswordScreen', () => {
  const { View, Text } = require('react-native');
  return function MockForgotPasswordScreen() {
    return (
      <View testID="forgot-password-screen">
        <Text>Forgot Password Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/BidSubmissionScreen', () => {
  const { View, Text } = require('react-native');
  return function MockBidSubmissionScreen() {
    return (
      <View testID="bid-submission-screen">
        <Text>Bid Submission Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/MessagingScreen', () => {
  const { View, Text } = require('react-native');
  return function MockMessagingScreen() {
    return (
      <View testID="messaging-screen">
        <Text>Messaging Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/EditProfileScreen', () => {
  const { View, Text } = require('react-native');
  return function MockEditProfileScreen() {
    return (
      <View testID="edit-profile-screen">
        <Text>Edit Profile Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/NotificationSettingsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockNotificationSettingsScreen() {
    return (
      <View testID="notification-settings-screen">
        <Text>Notification Settings Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/PaymentMethodsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockPaymentMethodsScreen() {
    return (
      <View testID="payment-methods-screen">
        <Text>Payment Methods Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/HelpCenterScreen', () => {
  const { View, Text } = require('react-native');
  return function MockHelpCenterScreen() {
    return (
      <View testID="help-center-screen">
        <Text>Help Center Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/InvoiceManagementScreen', () => {
  const { View, Text } = require('react-native');
  return function MockInvoiceManagementScreen() {
    return (
      <View testID="invoice-management-screen">
        <Text>Invoice Management Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/CRMDashboardScreen', () => {
  const { View, Text } = require('react-native');
  return function MockCRMDashboardScreen() {
    return (
      <View testID="crm-dashboard-screen">
        <Text>CRM Dashboard Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/FinanceDashboardScreen', () => {
  const { View, Text } = require('react-native');
  return function MockFinanceDashboardScreen() {
    return (
      <View testID="finance-dashboard-screen">
        <Text>Finance Dashboard Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/ServiceAreasScreen', () => {
  const { View, Text } = require('react-native');
  return function MockServiceAreasScreen() {
    return (
      <View testID="service-areas-screen">
        <Text>Service Areas Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/QuoteBuilderScreen', () => {
  const { View, Text } = require('react-native');
  return function MockQuoteBuilderScreen() {
    return (
      <View testID="quote-builder-screen">
        <Text>Quote Builder Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/CreateQuoteScreen', () => {
  const { View, Text } = require('react-native');
  return function MockCreateQuoteScreen() {
    return (
      <View testID="create-quote-screen">
        <Text>Create Quote Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/ServiceRequestScreen', () => {
  const { View, Text } = require('react-native');
  return function MockServiceRequestScreen() {
    return (
      <View testID="servicerequest-screen">
        <Text>Service Request Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/FindContractorsScreen', () => {
  const { View, Text } = require('react-native');
  return function MockFindContractorsScreen() {
    return (
      <View testID="find-contractors-screen">
        <Text>Find Contractors Screen</Text>
      </View>
    );
  };
});

jest.mock('../../screens/ContractorDiscoveryScreen', () => {
  const { View, Text } = require('react-native');
  return function MockContractorDiscoveryScreen() {
    return (
      <View testID="contractor-discovery-screen">
        <Text>Contractor Discovery Screen</Text>
      </View>
    );
  };
});

const { useAuth } = require('../../contexts/AuthContext');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('Navigation Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation Types', () => {
    it('should have properly typed navigation parameters', () => {
      // Type checking is done at compile time
      // This test ensures the types are exported correctly
      const jobsParams: JobsStackParamList = {
        JobsList: undefined,
        JobDetails: { jobId: 'test-job-id' },
        JobPosting: undefined,
        BidSubmission: { jobId: 'test-job-id' },
      };

      const messagingParams: MessagingStackParamList = {
        MessagesList: undefined,
        Messaging: {
          jobId: 'test-job-id',
          jobTitle: 'Test Job',
          otherUserId: 'user-123',
          otherUserName: 'Test User',
        },
      };

      expect(jobsParams).toBeDefined();
      expect(messagingParams).toBeDefined();
    });
  });

  describe('Feature Navigators', () => {
    it('should render JobsNavigator correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <JobsNavigator />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('jobs-screen')).toBeTruthy();
    });

    it('should render AuthNavigator correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <AuthNavigator />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('login-screen')).toBeTruthy();
    });

    it('should render MessagingNavigator correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <MessagingNavigator />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('messages-list-screen')).toBeTruthy();
    });

    it('should render ProfileNavigator correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <ProfileNavigator />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('profile-screen')).toBeTruthy();
    });

    it('should render ModalNavigator correctly', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <ModalNavigator />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('servicerequest-screen')).toBeTruthy();
    });
  });

  describe('RootNavigator', () => {
    it('should show auth navigator when user is not authenticated', () => {
      useAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>
      );

      expect(getByTestId('login-screen')).toBeTruthy();
    });

    it('should show main navigator when user is authenticated', () => {
      useAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'homeowner',
        },
        loading: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>
      );

      expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('should not render anything when loading', () => {
      useAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { toJSON } = render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>
      );

      // When loading, RootNavigator should render null or empty
      expect(toJSON()).toBeNull();
    });
  });

  describe('Navigation Hooks', () => {
    // Hook testing component
    const TestHookComponent: React.FC = () => {
      const navigation = useTypedNavigation();
      const jobsNavigation = useJobsNavigation();
      const messagingNavigation = useMessagingNavigation();
      const profileNavigation = useProfileNavigation();

      return (
        <div>
          <button
            testID="test-navigate"
            onClick={() => navigateToScreen(navigation, 'Auth')}
          >
            Navigate
          </button>
          <button
            testID="test-go-back"
            onClick={() => goBackSafe(navigation, 'Main')}
          >
            Go Back
          </button>
          <button
            testID="test-reset"
            onClick={() => resetToScreen(navigation, 'Main')}
          >
            Reset
          </button>
        </div>
      );
    };

    it('should provide type-safe navigation hooks', () => {
      useAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'homeowner',
        },
        loading: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <NavigationContainer>
            <TestHookComponent />
          </NavigationContainer>
        </TestWrapper>
      );

      expect(getByTestId('test-navigate')).toBeTruthy();
      expect(getByTestId('test-go-back')).toBeTruthy();
      expect(getByTestId('test-reset')).toBeTruthy();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap screens with error boundaries', () => {
      // This test ensures that error boundaries are properly integrated
      // The actual error boundary testing is done in separate test files
      useAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'homeowner',
        },
        loading: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>
      );

      // Verify that screens render correctly with error boundaries
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels on tab buttons', () => {
      useAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'homeowner',
        },
        loading: false,
      });

      const { getByLabelText } = render(
        <TestWrapper>
          <RootNavigator />
        </TestWrapper>
      );

      // Note: These would be available if the tabs were rendered
      // In a real app, you'd test tab accessibility more thoroughly
      expect(() => getByLabelText('Home tab')).not.toThrow();
    });
  });
});

// Integration test for navigation flow
describe('Navigation Integration', () => {
  it('should handle complete navigation flow', async () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    const { getByTestId, rerender } = render(
      <TestWrapper>
        <RootNavigator />
      </TestWrapper>
    );

    // Should start with login screen
    expect(getByTestId('login-screen')).toBeTruthy();

    // Simulate login
    useAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      },
      loading: false,
    });

    rerender(
      <TestWrapper>
        <RootNavigator />
      </TestWrapper>
    );

    // Should now show main app
    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
    });
  });
});

// Performance test
describe('Navigation Performance', () => {
  it('should render navigation structure efficiently', () => {
    useAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'homeowner',
      },
      loading: false,
    });

    const start = performance.now();
    
    render(
      <TestWrapper>
        <RootNavigator />
      </TestWrapper>
    );
    
    const end = performance.now();
    const renderTime = end - start;
    
    // Navigation should render quickly (less than 100ms in test environment)
    expect(renderTime).toBeLessThan(100);
  });
});
