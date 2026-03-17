import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Platform, View, ActivityIndicator, ViewStyle } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useFocusEffect,
  useNavigation,
  LinkingOptions,
  useNavigationContainerRef,
} from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

// Import navigation types
import type { RootStackParamList, RootTabParamList, AuthStackParamList } from './types';

// Import feature navigators
import AuthNavigator from './navigators/AuthNavigator';
import JobsNavigator from './navigators/JobsNavigator';
import MessagingNavigator from './navigators/MessagingNavigator';
import ProfileNavigator from './navigators/ProfileNavigator';
import ModalNavigator from './navigators/ModalNavigator';
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
import OfflineSyncStatus from '../components/OfflineSyncStatus';

// Import notification service for push notification listeners
import { NotificationService } from '../services/NotificationService';
import type { NotificationDeepLinkData } from '../services/notifications/types';
import { logger } from '../utils/logger';

// Import QuickJobModal for homeowner (+) button
import { QuickJobModal } from '../screens/job-posting/QuickJobModal';

// Import messaging hook for unread badge count
import { useUnreadMessageCount } from '../hooks/useMessaging';

// Import booking screens for root stack
import { RescheduleBookingScreen } from '../screens/booking/RescheduleBookingScreen';
import { RateBookingScreen } from '../screens/booking/RateBookingScreen';
import { BookingDetailsScreen } from '../screens/booking/BookingDetailsScreen';

// Export types for backward compatibility
export type { RootStackParamList, AuthStackParamList } from './types';

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

  useFocusEffect(
    React.useCallback(() => {
      // Redirect away - actual action handled by tab press listener
      if (user?.role === 'homeowner') {
        tabNavigation.navigate('HomeTab');
      } else {
        (tabNavigation.navigate as (...args: unknown[]) => void)('JobsTab', { screen: 'ExploreMap' });
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
  const [showQuickJobModal, setShowQuickJobModal] = useState(false);
  const { data: unreadMessageCount } = useUnreadMessageCount();

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
    (rootNavRef.current?.navigate as ((...args: unknown[]) => void) | undefined)?.('Modal', {
      screen: 'QuickJobPost',
      params,
    });
  }, []);

  return (
    <>
    <OfflineSyncStatus showWhenOnline compact position="top" />
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
          tabBarButton: ({ onPress, style, children, ...rest }) => (
            <TouchableOpacity
              onPress={(e) => {
                handleTabPress('HomeTab');
                onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Home tab"
              accessibilityHint="Navigate to home screen"
              style={[style as ViewStyle, { minHeight: 44, minWidth: 44 }]}
            >
              {children}
            </TouchableOpacity>
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
          tabBarButton: ({ onPress, style, children, ...rest }) => (
            <TouchableOpacity
              onPress={(e) => {
                handleTabPress('JobsTab');
                onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Jobs tab"
              accessibilityHint="Navigate to jobs"
              style={[style as ViewStyle, { minHeight: 44, minWidth: 44 }]}
            >
              {children}
            </TouchableOpacity>
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
              : 'Find jobs near you',
          tabBarButton: ({ onPress, style, children, ...rest }) => (
            <TouchableOpacity
              onPress={(e) => {
                handleTabPress('AddTab');
                onPress?.(e);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                user?.role === 'homeowner'
                  ? 'Create service request'
                  : 'Find jobs near you'
              }
              style={[
                style as ViewStyle,
                {
                  minHeight: 64,
                  minWidth: 64,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              {children}
            </TouchableOpacity>
          ),
        }}
        listeners={({ navigation }: { navigation: BottomTabNavigationProp<RootTabParamList> }) => ({
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
              // Contractors: centre button = Find Jobs (map of available jobs to bid on)
              (tabNavigation.navigate as (...args: unknown[]) => void)('JobsTab', { screen: 'ExploreMap' });
            }
          },
        })}
      />

      <Tab.Screen
        name="MessagingTab"
        component={MessagingNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarBadge: unreadMessageCount && unreadMessageCount > 0
            ? unreadMessageCount
            : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Messages tab',
          tabBarButton: ({ onPress, style, children, ...rest }) => (
            <TouchableOpacity
              onPress={(e) => {
                handleTabPress('MessagingTab');
                onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Messages tab"
              accessibilityHint="Navigate to messages and conversations"
              style={[style as ViewStyle, { minHeight: 44, minWidth: 44 }]}
            >
              {children}
            </TouchableOpacity>
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
          tabBarButton: ({ onPress, style, children, ...rest }) => (
            <TouchableOpacity
              onPress={(e) => {
                handleTabPress('ProfileTab');
                onPress?.(e);
              }}
              accessibilityRole="tab"
              accessibilityLabel="Profile tab"
              accessibilityHint="Navigate to your profile and settings"
              style={[style as ViewStyle, { minHeight: 44, minWidth: 44 }]}
            >
              {children}
            </TouchableOpacity>
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

/**
 * Maps URL paths to screen names for deep linking and universal links.
 *
 * Supported URL patterns:
 *   mintenance://jobs/:jobId       -> JobDetails screen
 *   mintenance://messages/:id      -> Messaging screen
 *   mintenance://contractors/:id   -> ContractorProfile modal
 *   mintenance://notifications     -> Notifications modal
 *   mintenance://profile           -> Profile tab
 *   https://mintenance.app/jobs/X  -> JobDetails (universal link)
 *
 * Push notification deep links are bridged via getInitialURL and subscribe
 * below, converting notification data into navigation URLs that React
 * Navigation can resolve through this same config.
 */

const linkingConfig: LinkingOptions<RootStackParamList>['config'] = {
  screens: {
    Main: {
      screens: {
        HomeTab: 'home',
        JobsTab: {
          screens: {
            JobsList: 'jobs',
            JobDetails: 'jobs/:jobId',
            JobPayment: 'payment/:jobId',
            ContractView: 'contracts/:jobId',
            BidSubmission: 'jobs/:jobId/bid',
            BidReview: 'jobs/:jobId/bids',
            PhotoReview: 'jobs/:jobId/photos',
            ReviewSubmission: 'jobs/:jobId/review',
          },
        },
        AddTab: 'add',
        MessagingTab: {
          screens: {
            MessagesList: 'messages',
            Messaging: 'messages/:conversationId',
          },
        },
        ProfileTab: {
          screens: {
            ProfileMain: 'profile',
            Properties: 'properties',
            PropertyDetail: 'properties/:propertyId',
          },
        },
      },
    },
    Auth: {
      screens: {
        Login: 'login',
        Register: 'register',
        ForgotPassword: 'forgot-password',
        ResetPassword: 'reset-password',
      },
    },
    Modal: {
      screens: {
        ServiceRequest: 'request',
        ContractorProfile: 'contractors/:contractorId',
        Notifications: 'notifications',
      },
    },
    BookingDetails: 'bookings/:bookingId',
  },
};

/**
 * Converts a push notification's data payload into a deep link URL that
 * React Navigation can resolve through the linking config above.
 *
 * Returns null if the notification does not contain actionable deep link data.
 */
function notificationToDeepLinkUrl(data: NotificationDeepLinkData | undefined): string | null {
  if (!data?.type) return null;

  switch (data.type) {
    case 'job_update':
    case 'bid_received':
    case 'payment_received':
    case 'quote_sent':
      if (data.jobId) return `mintenance://jobs/${data.jobId}`;
      break;
    case 'message_received':
      if (data.conversationId) return `mintenance://messages/${data.conversationId}`;
      break;
    case 'meeting_scheduled':
      // Meeting details are in the Modal stack - not mapped to a simple URL path.
      // Fall through to the NotificationService deep link handler instead.
      return null;
    case 'system':
      return 'mintenance://home';
    default:
      return null;
  }
  return null;
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mintenance://', 'https://mintenance.app', 'https://www.mintenance.app'],
  config: linkingConfig,

  /**
   * Custom getInitialURL bridges push notifications with URL-based deep linking.
   * When the app is opened from a killed state by tapping a notification, this
   * converts the notification data into a URL that React Navigation can resolve.
   * Falls back to Linking.getInitialURL() for standard URL deep links.
   */
  async getInitialURL(): Promise<string | null> {
    // 1. Check if the app was opened via a push notification tap (killed state)
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data as NotificationDeepLinkData | undefined;
        const deepLinkUrl = notificationToDeepLinkUrl(data);
        if (deepLinkUrl) {
          logger.info('DeepLink', `App opened from notification: ${deepLinkUrl}`);
          return deepLinkUrl;
        }
      }
    } catch (error) {
      logger.warn('DeepLink', 'Failed to get last notification response');
    }

    // 2. Fall back to standard URL deep link (universal link / custom scheme)
    const url = await Linking.getInitialURL();
    if (url) {
      logger.info('DeepLink', `App opened from URL: ${url}`);
    }
    return url;
  },

  /**
   * Custom subscribe bridges real-time notification taps with React Navigation's
   * linking system. When the user taps a notification while the app is in the
   * foreground or background, this converts the notification into a URL event
   * that React Navigation handles like any other deep link.
   */
  subscribe(listener: (url: string) => void) {
    // 1. Listen for standard URL deep links (custom scheme + universal links)
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      logger.info('DeepLink', `URL event received: ${url}`);
      listener(url);
    });

    // 2. Listen for notification tap events and convert to URL deep links
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationDeepLinkData | undefined;
        const deepLinkUrl = notificationToDeepLinkUrl(data);
        if (deepLinkUrl) {
          logger.info('DeepLink', `Notification tap -> ${deepLinkUrl}`);
          listener(deepLinkUrl);
        }
        // Note: notifications without a URL mapping (e.g., meeting_scheduled)
        // are handled by the NotificationService.registerListeners handler
        // which navigates directly via the navigation ref.
      }
    );

    // Return cleanup function
    return () => {
      urlSubscription.remove();
      notificationSubscription.remove();
    };
  },
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
          navigationRef.navigate(screen as never, params as never),
        reset: (state: unknown) => navigationRef.reset(state as never),
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
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <AppErrorBoundary>
      <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
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
                name="Main"
                component={TabNavigator}
                options={{ animation: 'none' }}
              />
              <RootStack.Screen
                name="Modal"
                component={ModalNavigator}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              />
              <RootStack.Screen
                name="BookingDetails"
                component={BookingDetailsScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <RootStack.Screen
                name="RescheduleBooking"
                component={RescheduleBookingScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
              <RootStack.Screen
                name="RateBooking"
                component={RateBookingScreen}
                options={{ headerShown: false, gestureEnabled: true }}
              />
            </>
          ) : (
            <RootStack.Screen
              name="Auth"
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
      <Ionicons name="add" size={28} color={theme.colors.textInverse} />
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
