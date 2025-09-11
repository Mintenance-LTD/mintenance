import { jest } from '@jest/globals';

// Navigation Mock Factory
export class NavigationMockFactory {
  // React Navigation Mock
  static createReactNavigationMock() {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockReset = jest.fn();
    const mockSetOptions = jest.fn();
    const mockSetParams = jest.fn();
    const mockAddListener = jest.fn(() => jest.fn()); // Returns unsubscribe function
    const mockRemoveListener = jest.fn();
    const mockIsFocused = jest.fn(() => true);
    const mockCanGoBack = jest.fn(() => false);

    return {
      // Navigation hook
      useNavigation: jest.fn(() => ({
        navigate: mockNavigate,
        goBack: mockGoBack,
        reset: mockReset,
        setOptions: mockSetOptions,
        setParams: mockSetParams,
        addListener: mockAddListener,
        removeListener: mockRemoveListener,
        isFocused: mockIsFocused,
        canGoBack: mockCanGoBack,
        dispatch: jest.fn(),
        getId: jest.fn(() => 'test-navigator-id'),
        getParent: jest.fn(),
        getState: jest.fn(() => ({
          key: 'stack-test',
          index: 0,
          routeNames: ['Home', 'Profile'],
          routes: [{ key: 'home', name: 'Home' }],
          type: 'stack',
        })),
        push: jest.fn(),
        pop: jest.fn(),
        popToTop: jest.fn(),
        replace: jest.fn(),
      })),

      // Route hook
      useRoute: jest.fn(() => ({
        key: 'test-route-key',
        name: 'TestScreen',
        params: {},
      })),

      // Focus effect hook
      useFocusEffect: jest.fn((callback) => {
        // Execute callback immediately in tests
        callback();
      }),

      // Navigation state hook
      useNavigationState: jest.fn((selector) =>
        selector({
          key: 'stack-test',
          index: 0,
          routeNames: ['Home', 'Profile'],
          routes: [{ key: 'home', name: 'Home' }],
          type: 'stack',
        })
      ),

      // Is focused hook
      useIsFocused: jest.fn(() => true),

      // NavigationContainer
      NavigationContainer: jest.fn(({ children }) => children),

      // Common Actions
      CommonActions: {
        navigate: jest.fn((name, params) => ({
          type: 'NAVIGATE',
          payload: { name, params },
        })),
        goBack: jest.fn(() => ({
          type: 'GO_BACK',
        })),
        reset: jest.fn((state) => ({
          type: 'RESET',
          payload: state,
        })),
        setParams: jest.fn((params) => ({
          type: 'SET_PARAMS',
          payload: { params },
        })),
      },

      // Stack Actions
      StackActions: {
        replace: jest.fn((name, params) => ({
          type: 'REPLACE',
          payload: { name, params },
        })),
        push: jest.fn((name, params) => ({
          type: 'PUSH',
          payload: { name, params },
        })),
        pop: jest.fn((count) => ({
          type: 'POP',
          payload: { count },
        })),
        popToTop: jest.fn(() => ({
          type: 'POP_TO_TOP',
        })),
      },

      // Tab Actions
      TabActions: {
        jumpTo: jest.fn((name, params) => ({
          type: 'JUMP_TO',
          payload: { name, params },
        })),
      },

      // Drawer Actions
      DrawerActions: {
        openDrawer: jest.fn(() => ({
          type: 'OPEN_DRAWER',
        })),
        closeDrawer: jest.fn(() => ({
          type: 'CLOSE_DRAWER',
        })),
        toggleDrawer: jest.fn(() => ({
          type: 'TOGGLE_DRAWER',
        })),
      },

      // Navigation events
      EventArg: jest.fn(),

      // Mock navigation helpers
      createNavigationContainerRef: jest.fn(() => ({
        current: {
          navigate: mockNavigate,
          goBack: mockGoBack,
          reset: mockReset,
          isReady: jest.fn(() => true),
          getRootState: jest.fn(),
        },
      })),
    };
  }

  // Stack Navigator Mock
  static createStackNavigatorMock() {
    const mockStackNavigator = {
      Screen: jest.fn(({ component: Component, ...props }) => Component),
      Navigator: jest.fn(({ children }) => children),
      Group: jest.fn(({ children }) => children),
    };

    return {
      createStackNavigator: jest.fn(() => mockStackNavigator),
      Stack: mockStackNavigator,
      TransitionPresets: {
        SlideFromRightIOS: {},
        ModalSlideFromBottomIOS: {},
        ModalPresentationIOS: {},
        FadeFromBottomAndroid: {},
        RevealFromBottomAndroid: {},
        ScaleFromCenterAndroid: {},
        DefaultTransition: {},
        ModalTransition: {},
      },
      HeaderStyleInterpolators: {
        forFade: jest.fn(),
        forStatic: jest.fn(),
        forSlideLeft: jest.fn(),
        forSlideRight: jest.fn(),
        forSlideUp: jest.fn(),
      },
      CardStyleInterpolators: {
        forHorizontalIOS: jest.fn(),
        forVerticalIOS: jest.fn(),
        forModalPresentationIOS: jest.fn(),
        forFadeFromBottomAndroid: jest.fn(),
        forRevealFromBottomAndroid: jest.fn(),
        forScaleFromCenterAndroid: jest.fn(),
      },
    };
  }

  // Bottom Tab Navigator Mock
  static createBottomTabNavigatorMock() {
    const mockTabNavigator = {
      Screen: jest.fn(({ component: Component, ...props }) => Component),
      Navigator: jest.fn(({ children }) => children),
    };

    return {
      createBottomTabNavigator: jest.fn(() => mockTabNavigator),
      BottomTab: mockTabNavigator,
    };
  }

  // Top Tab Navigator Mock
  static createTopTabNavigatorMock() {
    const mockTopTabNavigator = {
      Screen: jest.fn(({ component: Component, ...props }) => Component),
      Navigator: jest.fn(({ children }) => children),
    };

    return {
      createMaterialTopTabNavigator: jest.fn(() => mockTopTabNavigator),
      TopTab: mockTopTabNavigator,
    };
  }

  // Drawer Navigator Mock
  static createDrawerNavigatorMock() {
    const mockDrawerNavigator = {
      Screen: jest.fn(({ component: Component, ...props }) => Component),
      Navigator: jest.fn(({ children }) => children),
    };

    return {
      createDrawerNavigator: jest.fn(() => mockDrawerNavigator),
      Drawer: mockDrawerNavigator,
    };
  }

  // Native Stack Navigator Mock (React Navigation 6+)
  static createNativeStackNavigatorMock() {
    const mockNativeStackNavigator = {
      Screen: jest.fn(({ component: Component, ...props }) => Component),
      Navigator: jest.fn(({ children }) => children),
      Group: jest.fn(({ children }) => children),
    };

    return {
      createNativeStackNavigator: jest.fn(() => mockNativeStackNavigator),
      NativeStack: mockNativeStackNavigator,
    };
  }

  // Create all navigation mocks
  static createAllMocks() {
    return {
      core: this.createReactNavigationMock(),
      stack: this.createStackNavigatorMock(),
      bottomTab: this.createBottomTabNavigatorMock(),
      topTab: this.createTopTabNavigatorMock(),
      drawer: this.createDrawerNavigatorMock(),
      nativeStack: this.createNativeStackNavigatorMock(),
    };
  }

  // Custom hooks for testing navigation
  static createTestNavigationHook(initialParams = {}) {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockReset = jest.fn();

    return {
      useNavigation: () => ({
        navigate: mockNavigate,
        goBack: mockGoBack,
        reset: mockReset,
        setOptions: jest.fn(),
        setParams: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => true),
        canGoBack: jest.fn(() => false),
        getState: jest.fn(() => ({})),
      }),
      useRoute: () => ({
        key: 'test-route',
        name: 'TestScreen',
        params: initialParams,
      }),
      mockNavigate,
      mockGoBack,
      mockReset,
    };
  }

  // Reset all mocks
  static resetMocks() {
    jest.clearAllMocks();
  }
}

// Export commonly used mocks
export const mockReactNavigation =
  NavigationMockFactory.createReactNavigationMock();
export const mockStackNavigator =
  NavigationMockFactory.createStackNavigatorMock();
export const mockBottomTabNavigator =
  NavigationMockFactory.createBottomTabNavigatorMock();
