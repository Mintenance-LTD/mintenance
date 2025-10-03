import type { StackNavigationProp } from '@react-navigation/stack';
import type {
  AuthStackParamList,
  RootStackParamList,
  JobsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList
} from '../navigation/types';
import { createStub } from './jest-globals';

// ============================================================================
// ENHANCED NAVIGATION MOCK FACTORY
// ============================================================================

export interface MockNavigationHelpers {
  navigate: any;
  goBack: any;
  canGoBack: any;
  setOptions: any;
  dispatch: any;
  reset: any;
  addListener: any;
  removeListener: any;
  isFocused: any;
  navigateDeprecated: any;
  preload: any;
  getId: any;
  getState: any;
  getParent: any;
  setParams: any;
  push: any;
  pop: any;
  popToTop: any;
  replace: any;
}

export class NavigationMockFactory {
  private static createBaseMock(): MockNavigationHelpers {
    return {
      navigate: createStub(),
      goBack: createStub(),
      canGoBack: global.jest?.fn?.(() => true) || (() => true),
      setOptions: createStub(),
      dispatch: createStub(),
      reset: createStub(),
      addListener: global.jest?.fn?.(() => global.jest?.fn?.()) || (() => () => {}), // Return unsubscribe function
      removeListener: createStub(),
      isFocused: global.jest?.fn?.(() => true) || (() => true),
      navigateDeprecated: createStub(),
      preload: createStub(),
      getId: global.jest?.fn?.(() => 'test-screen-id') || (() => 'test-screen-id'),
      getState: global.jest?.fn?.(() => ({
        key: 'test-state',
        index: 0,
        routeNames: ['TestScreen'],
        routes: [{ key: 'test-route', name: 'TestScreen', params: {} }],
        history: [],
        type: 'stack',
        stale: false,
      })) || (() => ({
        key: 'test-state',
        index: 0,
        routeNames: ['TestScreen'],
        routes: [{ key: 'test-route', name: 'TestScreen', params: {} }],
        history: [],
        type: 'stack',
        stale: false,
      })),
      getParent: createStub(),
      setParams: createStub(),
      push: createStub(),
      pop: createStub(),
      popToTop: createStub(),
      replace: createStub(),
    };
  }

  static createAuthNavigationMock(): StackNavigationProp<AuthStackParamList, 'Login'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      // Type-safe navigation for Auth stack
      navigate: jest.fn((screen: keyof AuthStackParamList, params?: any) => {
        // Navigation logging handled by navigation service in real app
      }),
    } as any;
  }

  static createJobsNavigationMock(): StackNavigationProp<JobsStackParamList, 'JobsList'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof JobsStackParamList, params?: any) => {
        // Navigation logging handled by navigation service in real app
      }),
    } as any;
  }

  static createRootNavigationMock(): StackNavigationProp<RootStackParamList, 'Main'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof RootStackParamList, params?: any) => {
        // Navigation logging handled by navigation service in real app
      }),
    } as any;
  }

  static createMessagingNavigationMock(): StackNavigationProp<MessagingStackParamList, 'MessagesList'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof MessagingStackParamList, params?: any) => {
        // Navigation logging handled by navigation service in real app
      }),
    } as any;
  }

  static createProfileNavigationMock(): StackNavigationProp<ProfileStackParamList, 'ProfileMain'> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: keyof ProfileStackParamList, params?: any) => {
        // Navigation logging handled by navigation service in real app
      }),
    } as any;
  }

  static createGenericNavigationMock(): StackNavigationProp<any> {
    const baseMock = this.createBaseMock();
    return {
      ...baseMock,
      navigate: jest.fn((screen: string, params?: any) => {
        // Navigation logging handled by navigation service in real app
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
