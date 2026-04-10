import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useFocusEffect,
  useNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Import navigation types
import type { RootStackParamList, RootTabParamList } from './types';

import { linking } from './deepLinking';

// Import feature navigators
import AuthNavigator from './navigators/AuthNavigator';
import JobsNavigator from './navigators/JobsNavigator';
import MessagingNavigator from './navigators/MessagingNavigator';
import ProfileNavigator from './navigators/ProfileNavigator';
import BusinessNavigator from './navigators/BusinessNavigator';
import ModalNavigator from './navigators/ModalNavigator';
// Import core screens
import HomeScreen from '../screens/HomeScreen';
import { ExploreMapScreen } from '../screens/explore-map/ExploreMapScreen';

// Import context and utilities
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { useOnboardingGate } from '../hooks/useOnboardingGate';
import { OnboardingModal } from '../components/onboarding/OnboardingModal';
import { theme } from '../theme';
import { useTheme } from '../design-system/theme';
import {
  AppErrorBoundary,
  withScreenErrorBoundary,
} from '../components/ErrorBoundaryProvider';

// Import navigation components
import { CustomTabBar } from './components/CustomTabBar';
import OfflineSyncStatus from '../components/OfflineSyncStatus';

import { NotificationService } from '../services/NotificationService';

// Import QuickJobModal for homeowner (+) button
import { QuickJobModal } from '../screens/job-posting/QuickJobModal';

// Import messaging hook for unread badge count
import { useUnreadMessageCount } from '../hooks/useMessaging';

// Import tab screen options
import {
  getHomeTabOptions,
  getJobsTabOptions,
  getAddTabOptions,
  getBusinessTabOptions,
  getMessagingTabOptions,
  getProfileTabOptions,
} from './tabScreenOptions';

// Import booking screens for root stack
import { RescheduleBookingScreen } from '../screens/booking/RescheduleBookingScreen';
import { RateBookingScreen } from '../screens/booking/RateBookingScreen';
import { BookingDetailsScreen } from '../screens/booking/BookingDetailsScreen';

// Export types for backward compatibility
// ============================================================================
// WRAPPED SCREENS
// ============================================================================

const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'Home');

// ============================================================================
// NAVIGATION STACKS
// ============================================================================

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

// ============================================================================
// ADD ACTION SCREEN
// ============================================================================

const AddActionScreen: React.FC = () => {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { user } = useAuth();

  // Homeowner: AddTab is never the focused screen — tab-press listener opens
  // the QuickJobModal then focus remains on previous tab. If we somehow land
  // here anyway, redirect to Home.
  useFocusEffect(
    React.useCallback(() => {
      if (user?.role === 'homeowner') {
        tabNavigation.navigate('HomeTab');
      }
    }, [tabNavigation, user?.role])
  );

  // Contractor: AddTab IS the destination — render the Find Jobs map inline so
  // the tab indicator correctly highlights "Find Jobs".
  if (user?.role === 'contractor') {
    return <ExploreMapScreen />;
  }

  return null;
};

// ============================================================================
// TAB NAVIGATOR
// ============================================================================

const TabNavigator: React.FC = () => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const [showQuickJobModal, setShowQuickJobModal] = useState(false);
  const { data: unreadMessageCount } = useUnreadMessageCount();
  const onboarding = useOnboardingGate();

  // Store root navigation ref for QuickJobModal search callback
  const rootNavRef = React.useRef<NavigationProp<RootStackParamList> | null>(
    null
  );

  const handleTabPress = () => {
    haptics.tabSwitch();
  };

  const handleQuickJobSearch = useCallback(
    (params: {
      propertyId: string;
      propertyName: string;
      propertyAddress: string;
      category: string;
      urgency: string;
    }) => {
      setShowQuickJobModal(false);
      (
        rootNavRef.current?.navigate as
          | ((...args: unknown[]) => void)
          | undefined
      )?.('Modal', {
        screen: 'QuickJobPost',
        params,
      });
    },
    []
  );

  return (
    <>
      <OfflineSyncStatus showWhenOnline compact position='top' />
      <OnboardingModal
        visible={onboarding.shouldShow}
        userRole={user?.role || 'homeowner'}
        onDismiss={onboarding.dismiss}
      />
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
          name='HomeTab'
          component={SafeHomeScreen}
          options={getHomeTabOptions(handleTabPress)}
        />

        <Tab.Screen
          name='JobsTab'
          component={JobsNavigator}
          options={getJobsTabOptions(handleTabPress)}
        />

        <Tab.Screen
          name='AddTab'
          component={AddActionScreen}
          options={getAddTabOptions(
            handleTabPress,
            user?.role,
            <FloatingActionButton />
          )}
          listeners={({
            navigation,
          }: {
            navigation: BottomTabNavigationProp<RootTabParamList>;
          }) => ({
            tabPress: (e: { preventDefault: () => void }) => {
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
                // Contractors: centre button = Find Jobs — focus the AddTab so the
                // tab indicator highlights correctly and ExploreMap renders inline.
                haptics.buttonPress();
                tabNavigation.navigate('AddTab');
              }
            },
          })}
        />

        {user?.role === 'contractor' && (
          <Tab.Screen
            name='BusinessTab'
            component={BusinessNavigator}
            options={getBusinessTabOptions(handleTabPress)}
          />
        )}

        <Tab.Screen
          name='MessagingTab'
          component={MessagingNavigator}
          options={getMessagingTabOptions(handleTabPress, unreadMessageCount)}
        />

        <Tab.Screen
          name='ProfileTab'
          component={ProfileNavigator}
          options={getProfileTabOptions(handleTabPress)}
        />
      </Tab.Navigator>
    </>
  );
};

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const listenersRegistered = useRef(false);

  // Register push notification listeners once navigation is ready and user is authenticated
  useEffect(() => {
    if (user && navigationRef.isReady() && !listenersRegistered.current) {
      NotificationService.registerListeners({
        navigate: (screen: string, params?: unknown) =>
          (
            navigationRef.navigate as (screen: string, params?: unknown) => void
          )(screen, params),
        reset: (state: unknown) =>
          navigationRef.reset(
            state as Parameters<typeof navigationRef.reset>[0]
          ),
        isReady: () => navigationRef.isReady(),
      });
      listenersRegistered.current = true;
    }

    return () => {
      if (listenersRegistered.current) {
        NotificationService.cleanup();
        listenersRegistered.current = false;
      }
    };
  }, [user, navigationRef]);

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
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size='large' color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        theme={navTheme}
      >
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {user ? (
            <>
              <RootStack.Screen
                name='Main'
                component={TabNavigator}
                options={{ animation: 'none' }}
              />
              <RootStack.Screen
                name='Modal'
                component={ModalNavigator}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
              <RootStack.Screen
                name='BookingDetails'
                component={BookingDetailsScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <RootStack.Screen
                name='RescheduleBooking'
                component={RescheduleBookingScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <RootStack.Screen
                name='RateBooking'
                component={RateBookingScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
            </>
          ) : (
            <RootStack.Screen
              name='Auth'
              component={AuthNavigator}
              options={{ animation: 'none' }}
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
  const insets = useSafeAreaInsets();

  // Press handling is done by the outer tabBarButton + tabPress listener.
  // This component is purely visual (circular icon inside the tab bar button).
  return (
    <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
      <Ionicons name='add' size={28} color={theme.colors.textInverse} />
    </View>
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
