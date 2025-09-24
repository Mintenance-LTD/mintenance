import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import navigation types
import type { RootStackParamList, RootTabParamList } from './types';

// Import feature navigators
import AuthNavigator from './navigators/AuthNavigator';
import JobsNavigator from './navigators/JobsNavigator';
import MessagingNavigator from './navigators/MessagingNavigator';
import ProfileNavigator from './navigators/ProfileNavigator';
import ModalNavigator from './navigators/ModalNavigator';

// Import screens
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
// ADD BUTTON COMPONENT
// ============================================================================

const AddButton: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();

  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => haptics.buttonPress()}
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
      <Ionicons name="add" size={24} color={theme.colors.textInverse} />
    </TouchableOpacity>
  );
};

// ============================================================================
// TAB NAVIGATOR
// ============================================================================

const TabNavigator: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();

  const handleTabPress = (navigation: any, route: string) => {
    haptics.tabSwitch();

    // Enhanced navigation logic with proper flow handling
    if (route === 'Add') {
      if (user?.role === 'homeowner') {
        navigation.navigate('Modal', { screen: 'ServiceRequest' });
      } else {
        navigation.navigate('JobsTab', { screen: 'JobsList' });
      }
    }
  };

  // Enhanced navigation helper for consistent deep linking
  const navigateWithRoleCheck = (navigation: any, destination: string, params?: any) => {
    try {
      // Ensure navigation state is clean before navigating
      if (user?.role === 'homeowner' && destination.includes('Contractor')) {
        // Prevent homeowners from accessing contractor-only features
        navigation.navigate('HomeTab');
        return;
      }

      if (user?.role === 'contractor' && destination.includes('Homeowner')) {
        // Prevent contractors from accessing homeowner-only features
        navigation.navigate('HomeTab');
        return;
      }

      navigation.navigate(destination, params);
    } catch (error) {
      console.warn('Navigation error:', error);
      // Fallback to home on navigation errors
      navigation.navigate('HomeTab');
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: Platform.OS === 'ios' ? 34 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 90 : 72,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
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
              {...(props as any)}
              onPress={(e) => {
                handleTabPress(props.onPress, 'Home');
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
              {...(props as any)}
              onPress={(e) => {
                handleTabPress(props.onPress, 'Jobs');
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
              {...(props as any)}
              onPress={(e) => {
                handleTabPress(props.onPress, 'Feed');
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
              {...(props as any)}
              onPress={(e) => {
                handleTabPress(props.onPress, 'Messages');
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
              {...(props as any)}
              onPress={(e) => {
                handleTabPress(props.onPress, 'Profile');
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

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading spinner with proper UX during auth check
  if (loading) {
    // Import loading component at top of file would be better,
    // but for now using inline component to avoid circular imports
    const { LoadingState } = require('../components/LoadingStates');
    return (
      <LoadingState
        title="Loading App"
        message="Setting up your workspace..."
        size="large"
      />
    );
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
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
});

export default RootNavigator;
