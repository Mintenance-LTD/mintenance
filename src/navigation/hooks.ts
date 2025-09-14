import { useNavigation, useRoute } from '@react-navigation/native';
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
