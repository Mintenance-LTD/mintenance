import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useFocusEffect,
  useNavigation,
  LinkingOptions,
} from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Import navigation types
import type { RootStackParamList, RootTabParamList, AuthStackParamList } from './types';

// Import feature navigators
import AuthNavigator from './navigators/AuthNavigator';
import JobsNavigator from './navigators/JobsNavigator';
import MessagingNavigator from './navigators/MessagingNavigator';
import ProfileNavigator from './navigators/ProfileNavigator';
import ModalNavigator from './navigators/ModalNavigator';
import DiscoverNavigator from './navigators/DiscoverNavigator';

// Import core screens
import HomeScreen from '../screens/HomeScreen';

// Import context and utilities
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { theme } from '../theme';
import { useTheme } from '../design-system/theme';
import {
  AppErrorBoundary,
  withScreenErrorBoundary,
} from '../components/ErrorBoundaryProvider';

// Import navigation components
import { CustomTabBar } from './components/CustomTabBar';

// Import QuickJobModal for homeowner (+) button
import { QuickJobModal } from '../screens/job-posting/QuickJobModal';

// Export types for backward compatibility
export type { RootStackParamList, AuthStackParamList } from './types';

// ============================================================================
// WRAPPED SCREENS
// ============================================================================

const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'Home');

// ============================================================================
// NAVIGATION STACKS
// ============================================================================

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// ============================================================================
// ADD ACTION SCREEN
// ============================================================================

const AddActionScreen: React.FC = () => {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { user } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      // Redirect away - actual action handled by tab press listener
      if (user?.role === 'homeowner') {
        tabNavigation.navigate('HomeTab');
      } else {
        tabNavigation.navigate('JobsTab', { screen: 'JobsList' });
      }
    }, [tabNavigation, user?.role])
  );

  return null;
};

// ============================================================================
// TAB NAVIGATOR
// ============================================================================

const TabNavigator: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const enableMap = process.env.EXPO_PUBLIC_ENABLE_MAP !== 'false';
  const [showQuickJobModal, setShowQuickJobModal] = useState(false);

  // Store root navigation ref for QuickJobModal search callback
  const rootNavRef = React.useRef<NavigationProp<RootStackParamList> | null>(null);

  const handleTabPress = (route: keyof RootTabParamList) => {
    haptics.tabSwitch();
  };

  const handleQuickJobSearch = useCallback((params: {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    category: string;
    urgency: string;
  }) => {
    setShowQuickJobModal(false);
    rootNavRef.current?.navigate('Modal', {
      screen: 'QuickJobPost',
      params,
    });
  }, []);

  return (
    <>
    <QuickJobModal
      visible={showQuickJobModal}
      onClose={() => setShowQuickJobModal(false)}
      onSearch={handleQuickJobSearch}
    />
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={SafeHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home tab',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('HomeTab');
                props.onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Home tab"
              accessibilityHint="Navigate to home screen"
              style={[props.style, { minHeight: 44, minWidth: 44 }]}
            />
          ),
        }}
      />
      {enableMap && user?.role !== 'homeowner' && (
        <Tab.Screen
          name="DiscoverTab"
          component={DiscoverNavigator}
          options={{
            tabBarLabel: 'Find Jobs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Find jobs near you',
          }}
          listeners={{
            tabPress: () => handleTabPress('DiscoverTab' as keyof RootTabParamList),
          }}
        />
      )}

      <Tab.Screen
        name="JobsTab"
        component={JobsNavigator}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Jobs tab',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('JobsTab');
                props.onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Jobs tab"
              accessibilityHint="Navigate to jobs"
              style={[props.style, { minHeight: 44, minWidth: 44 }]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AddTab"
        component={AddActionScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <FloatingActionButton />,
          tabBarAccessibilityLabel:
            user?.role === 'homeowner'
              ? 'Create service request'
              : 'Browse jobs',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('AddTab');
                props.onPress?.(e);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                user?.role === 'homeowner'
                  ? 'Create service request'
                  : 'Browse jobs'
              }
              style={[
                props.style,
                {
                  minHeight: 64,
                  minWidth: 64,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            />
          ),
        }}
        listeners={({ navigation }: { navigation: BottomTabNavigationProp<RootTabParamList> }) => ({
          tabPress: (e: unknown) => {
            e.preventDefault();
            const tabNavigation =
              navigation as BottomTabNavigationProp<RootTabParamList>;
            const rootNavigation =
              tabNavigation.getParent<NavigationProp<RootStackParamList>>();
            // Store root nav ref for modal search callback
            rootNavRef.current = rootNavigation || null;
            if (user?.role === 'homeowner') {
              haptics.buttonPress();
              setShowQuickJobModal(true);
            } else {
              tabNavigation.navigate('JobsTab', { screen: 'JobsList' });
            }
          },
        })}
      />

      <Tab.Screen
        name="MessagingTab"
        component={MessagingNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Messages tab',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('MessagingTab');
                props.onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Messages tab"
              accessibilityHint="Navigate to messages and conversations"
              style={[props.style, { minHeight: 44, minWidth: 44 }]}
            />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('ProfileTab');
                props.onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Profile tab"
              accessibilityHint="Navigate to your profile and settings"
              style={[props.style, { minHeight: 44, minWidth: 44 }]}
            />
          ),
        }}
      />
    </Tab.Navigator>
    </>
  );
};

// ============================================================================
// LINKING CONFIGURATION
// ============================================================================

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mintenance://', 'https://mintenance.app', 'https://www.mintenance.app'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: 'home',
          DiscoverTab: 'discover',
          JobsTab: 'jobs',
          AddTab: 'add',
          MessagingTab: 'messages',
          ProfileTab: 'profile',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      Modal: {
        screens: {
          ServiceRequest: 'request',
        },
      },
    },
  },
};

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  // Build a React Navigation theme that matches our app theme colors
  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
        },
      };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer linking={linking} theme={navTheme}>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyle: { backgroundColor: theme.colors.background },
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'spring', config: { stiffness: 1000, damping: 100, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
              close: { animation: 'spring', config: { stiffness: 1000, damping: 100, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
            },
          }}
        >
          {user ? (
            <>
              <RootStack.Screen
                name="Main"
                component={TabNavigator}
                options={{
                  animationTypeForReplace: user ? 'push' : 'pop',
                }}
              />
              <RootStack.Group
                screenOptions={{
                  presentation: 'modal',
                  gestureEnabled: true,
                }}
              >
                <RootStack.Screen
                  name="Modal"
                  component={ModalNavigator}
                  options={{
                    headerShown: false,
                  }}
                />
              </RootStack.Group>
            </>
          ) : (
            <RootStack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{
                animationTypeForReplace: user ? 'push' : 'pop',
              }}
            />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </AppErrorBoundary>
  );
};

// ============================================================================
// FLOATING ACTION BUTTON COMPONENT
// ============================================================================

const FloatingActionButton: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const handlePress = React.useCallback(() => {
    haptics.buttonPress();
  }, [haptics]);

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: insets.bottom + 16 }]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        user?.role === 'homeowner' ? 'Create service request' : 'Browse jobs'
      }
      accessibilityHint={
        user?.role === 'homeowner'
          ? 'Double tap to create a new service request'
          : 'Double tap to browse available jobs'
      }
    >
      <Ionicons name="add" size={28} color={theme.colors.textInverse} />
    </TouchableOpacity>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  fabContainer: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000,
  },
});

export default AppNavigator;
