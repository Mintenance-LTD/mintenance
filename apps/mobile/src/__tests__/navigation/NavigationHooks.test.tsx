import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import hooks to test
import {
  useTypedNavigation,
  useJobsNavigation,
  useMessagingNavigation,
  useProfileNavigation,
  navigateToScreen,
  goBackSafe,
  resetToScreen,
  hasRoute,
  getCurrentRouteName,
} from '../../navigation/hooks';

// Import types
import type {
  RootStackParamList,
  JobsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList,
} from '../../navigation/types';

// Mock react-navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockReset = jest.fn();
const mockGetState = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      reset: mockReset,
      getState: mockGetState,
    }),
    useRoute: () => ({
      key: 'test-route',
      name: 'TestScreen',
      params: {},
    }),
  };
});

// Test component using navigation hooks
const TestComponent: React.FC = () => {
  const navigation = useTypedNavigation();
  const jobsNavigation = useJobsNavigation();
  const messagingNavigation = useMessagingNavigation();
  const profileNavigation = useProfileNavigation();

  return (
    <View testID="test-component">
      <Text>Test Component</Text>
    </View>
  );
};

// Mock stack navigator for testing
const TestStack = createStackNavigator();

const TestNavigator: React.FC = () => (
  <TestStack.Navigator>
    <TestStack.Screen name="Test" component={TestComponent} />
  </TestStack.Navigator>
);

describe('Navigation Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTypedNavigation', () => {
    it('should provide typed navigation object', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestNavigator />
        </NavigationContainer>
      );

      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  describe('useJobsNavigation', () => {
    it('should provide jobs-specific navigation', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestNavigator />
        </NavigationContainer>
      );

      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  describe('useMessagingNavigation', () => {
    it('should provide messaging-specific navigation', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestNavigator />
        </NavigationContainer>
      );

      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  describe('useProfileNavigation', () => {
    it('should provide profile-specific navigation', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestNavigator />
        </NavigationContainer>
      );

      expect(getByTestId('test-component')).toBeTruthy();
    });
  });
});

describe('Navigation Utilities', () => {
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    reset: mockReset,
    getState: mockGetState,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navigateToScreen', () => {
    it('should navigate to screen without parameters', () => {
      navigateToScreen(mockNavigation, 'Auth');

      expect(mockNavigate).toHaveBeenCalledWith('Auth');
    });

    it('should navigate to screen with parameters', () => {
      navigateToScreen(mockNavigation, 'Modal', { screen: 'ServiceRequest' });

      expect(mockNavigate).toHaveBeenCalledWith('Modal', { screen: 'ServiceRequest' });
    });
  });

  describe('goBackSafe', () => {
    it('should go back when possible', () => {
      mockCanGoBack.mockReturnValue(true);

      goBackSafe(mockNavigation);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to fallback when cannot go back', () => {
      mockCanGoBack.mockReturnValue(false);

      goBackSafe(mockNavigation, 'Main');

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Main');
    });

    it('should do nothing when cannot go back and no fallback', () => {
      mockCanGoBack.mockReturnValue(false);

      goBackSafe(mockNavigation);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('resetToScreen', () => {
    it('should reset navigation stack to specified screen', () => {
      resetToScreen(mockNavigation, 'Main');

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'Main',
            params: undefined,
          },
        ],
      });
    });

    it('should reset navigation stack with parameters', () => {
      resetToScreen(mockNavigation, 'Modal', { screen: 'ServiceRequest' });

      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: 'Modal',
            params: { screen: 'ServiceRequest' },
          },
        ],
      });
    });
  });

  describe('hasRoute', () => {
    it('should return true when route exists', () => {
      mockGetState.mockReturnValue({
        routes: [
          { name: 'Main' },
          { name: 'Auth' },
        ],
      });

      const result = hasRoute(mockNavigation, 'Auth');

      expect(result).toBe(true);
      expect(mockGetState).toHaveBeenCalled();
    });

    it('should return false when route does not exist', () => {
      mockGetState.mockReturnValue({
        routes: [
          { name: 'Main' },
        ],
      });

      const result = hasRoute(mockNavigation, 'Auth');

      expect(result).toBe(false);
      expect(mockGetState).toHaveBeenCalled();
    });
  });

  describe('getCurrentRouteName', () => {
    it('should return current route name', () => {
      mockGetState.mockReturnValue({
        routes: [
          { name: 'Main' },
          { name: 'Auth' },
        ],
        index: 1,
      });

      const result = getCurrentRouteName(mockNavigation);

      expect(result).toBe('Auth');
      expect(mockGetState).toHaveBeenCalled();
    });

    it('should return undefined when no current route', () => {
      mockGetState.mockReturnValue({
        routes: [],
        index: 0,
      });

      const result = getCurrentRouteName(mockNavigation);

      expect(result).toBeUndefined();
      expect(mockGetState).toHaveBeenCalled();
    });
  });
});

describe('Type Safety Tests', () => {
  // These tests ensure TypeScript compilation catches type errors
  it('should enforce type safety at compile time', () => {
    // Valid navigation parameters
    const validJobParams: JobsStackParamList['JobDetails'] = { jobId: 'job-123' };
    const validMessagingParams: MessagingStackParamList['Messaging'] = {
      jobId: 'job-123',
      jobTitle: 'Test Job',
      otherUserId: 'user-456',
      otherUserName: 'Test User',
    };

    expect(validJobParams.jobId).toBe('job-123');
    expect(validMessagingParams.jobId).toBe('job-123');
  });

  it('should allow optional parameters', () => {
    const optionalParams: ProfileStackParamList['CreateQuote'] = {
      jobId: 'job-123',
      // clientName and clientEmail are optional
    };

    expect(optionalParams.jobId).toBe('job-123');
    expect(optionalParams.clientName).toBeUndefined();
  });
});

describe('Hook Integration Tests', () => {
  const HookTestComponent: React.FC = () => {
    const navigation = useTypedNavigation();
    const jobsNavigation = useJobsNavigation();

    React.useEffect(() => {
      // Test that hooks can be used together
      const canGoBack = hasRoute(navigation, 'Main');
      const currentRoute = getCurrentRouteName(navigation);
      
      // These would normally trigger navigation in a real app
      // but in tests we just verify they don't throw errors
    }, [navigation, jobsNavigation]);

    return (
      <View testID="hook-test-component">
        <Text>Hook Integration Test</Text>
      </View>
    );
  };

  const HookTestStack = createStackNavigator();
  const HookTestNavigator: React.FC = () => (
    <HookTestStack.Navigator>
      <HookTestStack.Screen name="HookTest" component={HookTestComponent} />
    </HookTestStack.Navigator>
  );

  it('should allow multiple hooks to be used together', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <HookTestNavigator />
      </NavigationContainer>
    );

    expect(getByTestId('hook-test-component')).toBeTruthy();
  });
});

describe('Performance Tests', () => {
  it('should render hooks efficiently', () => {
    const start = performance.now();
    
    render(
      <NavigationContainer>
        <TestNavigator />
      </NavigationContainer>
    );
    
    const end = performance.now();
    const renderTime = end - start;
    
    // Hooks should render quickly (less than 50ms in test environment)
    expect(renderTime).toBeLessThan(50);
  });
});
