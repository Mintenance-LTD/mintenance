import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Import navigation types
import type { RootStackParamList, RootTabParamList, AuthStackParamList } from './types';

// Export types for backward compatibility
export type { RootStackParamList, AuthStackParamList } from './types';

// Import feature navigators
import AuthNavigator from './navigators/AuthNavigator';
import JobsNavigator from './navigators/JobsNavigator';
import MessagingNavigator from './navigators/MessagingNavigator';
import ProfileNavigator from './navigators/ProfileNavigator';
import ModalNavigator from './navigators/ModalNavigator';
import DiscoverNavigator from './navigators/DiscoverNavigator';

// Import core screens
import HomeScreen from '../screens/HomeScreen';
import ContractorSocialScreen from '../screens/ContractorSocialScreen';

// Import context and utilities
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { theme } from '../theme';
import {
  AppErrorBoundary,
  withScreenErrorBoundary,
} from '../components/ErrorBoundaryProvider';

// Import navigation components
import { CustomTabBar } from './components/CustomTabBar';

// ============================================================================
// WRAPPED SCREENS
// ============================================================================

const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'Home');
const SafeContractorSocialScreen = withScreenErrorBoundary(
  ContractorSocialScreen,
  'Community Feed'
);

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
  const rootNavigation =
    tabNavigation.getParent<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const haptics = useHaptics();

  useFocusEffect(
    React.useCallback(() => {
      haptics.buttonPress();

      if (user?.role === 'homeowner') {
        rootNavigation?.navigate('Modal', { screen: 'ServiceRequest' });
        tabNavigation.navigate('HomeTab');
      } else {
        tabNavigation.navigate('JobsTab', { screen: 'JobsList' });
      }
    }, [haptics, rootNavigation, tabNavigation, user?.role])
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

  const handleTabPress = (route: keyof RootTabParamList) => {
    haptics.tabSwitch();
  };

  return (
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
      {enableMap && (
        <Tab.Screen
          name="DiscoverTab"
          component={DiscoverNavigator}
          options={{
            tabBarLabel: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Discover tab',
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
        listeners={({ navigation }: { navigation: any }) => ({
          tabPress: (e: any) => {
            e.preventDefault();
            const tabNavigation =
              navigation as BottomTabNavigationProp<RootTabParamList>;
            const rootNavigation =
              tabNavigation.getParent<NavigationProp<RootStackParamList>>();
            if (user?.role === 'homeowner') {
              rootNavigation?.navigate('Modal', { screen: 'ServiceRequest' });
              tabNavigation.navigate('HomeTab');
            } else {
              tabNavigation.navigate('JobsTab', { screen: 'JobsList' });
            }
          },
        })}
      />

      <Tab.Screen
        name="FeedTab"
        component={SafeContractorSocialScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Community feed tab',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                handleTabPress('FeedTab');
                props.onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Community feed tab"
              accessibilityHint="Navigate to community feed"
              style={[props.style, { minHeight: 44, minWidth: 44 }]}
            />
          ),
        }}
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
  );
};

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Could show a loading spinner here
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
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
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
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
