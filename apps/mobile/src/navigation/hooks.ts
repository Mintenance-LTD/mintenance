import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useHaptics } from '../utils/haptics';
import { logger } from '@mintenance/shared';
import type {
  RootStackParamList,
  JobsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList,
  JobsNavigationProp,
  JobsRouteProp,
  MessagingNavigationProp,
  MessagingRouteProp,
  ProfileNavigationProp,
  ProfileRouteProp,
} from './types';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

// ============================================================================
// TYPE-SAFE NAVIGATION HOOKS
// ============================================================================

/**
 * Type-safe version of useNavigation for root navigation
 */
export const useTypedNavigation = <T extends keyof RootStackParamList>() =>
  useNavigation<StackNavigationProp<RootStackParamList, T>>();

/**
 * Type-safe version of useRoute for root navigation
 */
export const useTypedRoute = <T extends keyof RootStackParamList>() =>
  useRoute<RouteProp<RootStackParamList, T>>();

// ============================================================================
// FEATURE-SPECIFIC NAVIGATION HOOKS
// ============================================================================

/**
 * Type-safe navigation hook for Jobs feature
 */
export const useJobsNavigation = <T extends keyof JobsStackParamList>() =>
  useNavigation<JobsNavigationProp<T>>();

/**
 * Type-safe route hook for Jobs feature
 */
export const useJobsRoute = <T extends keyof JobsStackParamList>() =>
  useRoute<JobsRouteProp<T>>();

/**
 * Type-safe navigation hook for Messaging feature
 */
export const useMessagingNavigation = <T extends keyof MessagingStackParamList>() =>
  useNavigation<MessagingNavigationProp<T>>();

/**
 * Type-safe route hook for Messaging feature
 */
export const useMessagingRoute = <T extends keyof MessagingStackParamList>() =>
  useRoute<MessagingRouteProp<T>>();

/**
 * Type-safe navigation hook for Profile feature
 */
export const useProfileNavigation = <T extends keyof ProfileStackParamList>() =>
  useNavigation<ProfileNavigationProp<T>>();

/**
 * Type-safe route hook for Profile feature
 */
export const useProfileRoute = <T extends keyof ProfileStackParamList>() =>
  useRoute<ProfileRouteProp<T>>();

// ============================================================================
// NAVIGATION UTILITIES
// ============================================================================

/**
 * Navigate to any screen with type safety
 */
export const navigateToScreen = <T extends keyof RootStackParamList>(
  navigation: StackNavigationProp<RootStackParamList>,
  screen: T,
  params?: RootStackParamList[T]
) => {
  if (params) {
    navigation.navigate(screen as any, params);
  } else {
    navigation.navigate(screen as any);
  }
};

/**
 * Navigate back with optional fallback
 */
export const goBackSafe = (
  navigation: StackNavigationProp<RootStackParamList>,
  fallbackScreen?: keyof RootStackParamList
) => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else if (fallbackScreen) {
    navigation.navigate(fallbackScreen as any);
  }
};

/**
 * Reset navigation stack to specific screen
 */
export const resetToScreen = <T extends keyof RootStackParamList>(
  navigation: StackNavigationProp<RootStackParamList>,
  screen: T,
  params?: RootStackParamList[T]
) => {
  navigation.reset({
    index: 0,
    routes: [
      {
        name: screen as any,
        params: params as any,
      },
    ],
  });
};

// ============================================================================
// NAVIGATION GUARDS
// ============================================================================

/**
 * Type guard to check if navigation has specific route
 */
export const hasRoute = (
  navigation: StackNavigationProp<RootStackParamList>,
  routeName: keyof RootStackParamList
): boolean => {
  const state = navigation.getState();
  return state.routes.some(route => route.name === routeName);
};

/**
 * Get current route name with type safety
 */
export const getCurrentRouteName = (
  navigation: StackNavigationProp<RootStackParamList>
): keyof RootStackParamList | undefined => {
  const state = navigation.getState();
  return state.routes[state.index]?.name as keyof RootStackParamList;
};

// ============================================================================
// ENHANCED NAVIGATION HELPERS
// ============================================================================

/**
 * Enhanced navigation hook with role-based guards and error handling
 */
export const useEnhancedNavigation = () => {
  const navigation = useTypedNavigation();
  const { user } = useAuth();
  const haptics = useHaptics();

  const navigateWithGuard = <T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T],
    options?: {
      requiresAuth?: boolean;
      allowedRoles?: ('homeowner' | 'contractor')[];
      fallbackScreen?: keyof RootStackParamList;
    }
  ) => {
    try {
      // Auth guard
      if (options?.requiresAuth && !user) {
        navigation.navigate('Auth');
        return false;
      }

      // Role-based guard
      if (options?.allowedRoles && user && !options.allowedRoles.includes(user.role)) {
        logger.warn(`Navigation blocked: User role ${user.role} not allowed for ${screen}`);
        const fallback = options.fallbackScreen || 'Main';
        navigation.navigate(fallback);
        return false;
      }

      // Haptic feedback
      haptics.buttonPress();

      // Navigate with params if provided
      if (params) {
        navigation.navigate(screen as any, params);
      } else {
        navigation.navigate(screen as any);
      }

      return true;
    } catch (error) {
      logger.error('Navigation error:', error);

      // Fallback navigation on error
      const fallback = options?.fallbackScreen || 'Main';
      try {
        navigation.navigate(fallback);
      } catch (fallbackError) {
        logger.error('Fallback navigation also failed:', fallbackError);
      }

      return false;
    }
  };

  const goBackWithFallback = (fallbackScreen: keyof RootStackParamList = 'Main') => {
    try {
      haptics.buttonPress();

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate(fallbackScreen);
      }

      return true;
    } catch (error) {
      logger.error('Go back error:', error);

      try {
        navigation.navigate(fallbackScreen);
      } catch (fallbackError) {
        logger.error('Fallback go back also failed:', fallbackError);
      }

      return false;
    }
  };

  const resetNavigationStack = <T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    try {
      haptics.buttonPress();

      navigation.reset({
        index: 0,
        routes: [
          {
            name: screen as any,
            params: params as any,
          },
        ],
      });

      return true;
    } catch (error) {
      logger.error('Reset navigation error:', error);
      return false;
    }
  };

  return {
    navigation,
    navigateWithGuard,
    goBackWithFallback,
    resetNavigationStack,
    user,
  };
};

/**
 * Navigation flow helper for common user journeys
 */
export const useNavigationFlows = () => {
  const { navigateWithGuard, user } = useEnhancedNavigation();

  const navigateToJobDetails = (jobId: string) => {
    return navigateWithGuard('Main', {
      screen: 'JobsTab',
      params: { screen: 'JobDetails', params: { jobId } }
    }, {
      requiresAuth: true,
    });
  };

  const navigateToMessaging = (params: {
    jobId: string;
    jobTitle: string;
    otherUserId: string;
    otherUserName: string;
  }) => {
    return navigateWithGuard('Main', {
      screen: 'MessagingTab',
      params: { screen: 'Messaging', params }
    }, {
      requiresAuth: true,
    });
  };

  const navigateToCreateJob = () => {
    return navigateWithGuard('Modal', {
      screen: 'ServiceRequest'
    }, {
      requiresAuth: true,
      allowedRoles: ['homeowner'],
      fallbackScreen: 'Main',
    });
  };

  const navigateToContractorDiscovery = () => {
    return navigateWithGuard('Modal', {
      screen: 'ContractorDiscovery'
    }, {
      requiresAuth: true,
      allowedRoles: ['homeowner'],
      fallbackScreen: 'Main',
    });
  };

  const navigateToBidSubmission = (jobId: string) => {
    return navigateWithGuard('Main', {
      screen: 'JobsTab',
      params: { screen: 'BidSubmission', params: { jobId } }
    }, {
      requiresAuth: true,
      allowedRoles: ['contractor'],
      fallbackScreen: 'Main',
    });
  };

  return {
    navigateToJobDetails,
    navigateToMessaging,
    navigateToCreateJob,
    navigateToContractorDiscovery,
    navigateToBidSubmission,
    user,
  };
};
