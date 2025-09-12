import type { StackNavigationProp } from '@react-navigation/stack';
import type { 
  AuthStackParamList, 
  RootStackParamList,
  JobsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList 
} from '../../navigation/types';

// ============================================================================
// ENHANCED NAVIGATION MOCK FACTORY
// ============================================================================

export interface MockNavigationHelpers {
  navigate: jest.Mock;
  goBack: jest.Mock;
  canGoBack: jest.Mock;
  setOptions: jest.Mock;
  dispatch: jest.Mock;
  reset: jest.Mock;
  addListener: jest.Mock;
  removeListener: jest.Mock;
  isFocused: jest.Mock;
  navigateDeprecated: jest.Mock;
  preload: jest.Mock;
  getId: jest.Mock;
  getState: jest.Mock;
  getParent: jest.Mock;
  setParams: jest.Mock;
  push: jest.Mock;
  pop: jest.Mock;
  popToTop: jest.Mock;
  replace: jest.Mock;
}

export class NavigationMockFactory {
  private static createBaseMock(): MockNavigationHelpers {
    return {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      setOptions: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      addListener: jest.fn(() => jest.fn()), // Return unsubscribe function
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
      navigateDeprecated: jest.fn(),
      preload: jest.fn(),
      getId: jest.fn(() => 'test-screen-id'),
      getState: jest.fn(() => ({
        key: 'test-state',
        index: 0,
        routeNames: ['TestScreen'],
        routes: [{ key: 'test-route', name: 'TestScreen', params: {} }],
        history: [],
        type: 'stack',
        stale: false,
      })),
      getParent: jest.fn(),
      setParams: jest.fn(),
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
      replace: jest.fn(),
    };
  }

  static createAuthNavigationMock(): StackNavigationProp<AuthStackParamList, 'Login'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      // Type-safe navigation for Auth stack
      navigate: jest.fn((screen: keyof AuthStackParamList, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static createJobsNavigationMock(): StackNavigationProp<JobsStackParamList, 'JobsList'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof JobsStackParamList, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static createRootNavigationMock(): StackNavigationProp<RootStackParamList, 'Main'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof RootStackParamList, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static createMessagingNavigationMock(): StackNavigationProp<MessagingStackParamList, 'MessagesList'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof MessagingStackParamList, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static createProfileNavigationMock(): StackNavigationProp<ProfileStackParamList, 'ProfileMain'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof ProfileStackParamList, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static createGenericNavigationMock(): StackNavigationProp<any> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: string, params?: any) => {
        console.log(`Navigate to ${screen}`, params);
      }),
    } as any;
  }

  static resetAllMocks(): void {
    Object.values(this.createBaseMock()).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const mockAuthNavigation = NavigationMockFactory.createAuthNavigationMock();
export const mockJobsNavigation = NavigationMockFactory.createJobsNavigationMock();
export const mockRootNavigation = NavigationMockFactory.createRootNavigationMock();
export const mockMessagingNavigation = NavigationMockFactory.createMessagingNavigationMock();
export const mockProfileNavigation = NavigationMockFactory.createProfileNavigationMock();
export const mockGenericNavigation = NavigationMockFactory.createGenericNavigationMock();

export default NavigationMockFactory;
