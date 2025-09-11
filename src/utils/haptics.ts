import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { logger } from './logger';

// Haptic feedback utility with fallbacks and best practices
export class HapticService {
  // Light haptic feedback for button presses, selections
  static light = async () => {
    if (Platform.OS === 'ios') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        logger.warn('Haptic feedback not available:', { data: error });
      }
    }
  };

  // Medium haptic feedback for navigation, toggles
  static medium = async () => {
    if (Platform.OS === 'ios') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        logger.warn('Haptic feedback not available:', { data: error });
      }
    }
  };

  // Heavy haptic feedback for important actions, confirmations
  static heavy = async () => {
    if (Platform.OS === 'ios') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        logger.warn('Haptic feedback not available:', { data: error });
      }
    }
  };

  // Success feedback for completed actions
  static success = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.warn('Haptic feedback not available:', { data: error });
    }
  };

  // Warning feedback for caution states
  static warning = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      logger.warn('Haptic feedback not available:', { data: error });
    }
  };

  // Error feedback for failed actions
  static error = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      logger.warn('Haptic feedback not available:', { data: error });
    }
  };

  // Selection feedback for pickers, toggles
  static selection = async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      logger.warn('Haptic feedback not available:', { data: error });
    }
  };

  // Context-specific haptic feedback methods
  static buttonPress = () => HapticService.light();
  static tabSwitch = () => HapticService.light();
  static toggleSwitch = () => HapticService.medium();
  static formSubmit = () => HapticService.medium();
  static navigationBack = () => HapticService.light();
  static pullToRefresh = () => HapticService.light();
  static longPress = () => HapticService.medium();
  static swipeAction = () => HapticService.light();
  static cardFlip = () => HapticService.medium();

  // Feedback for specific app actions
  static likePost = () => HapticService.light();
  static savePost = () => HapticService.medium();
  static jobPosted = () => HapticService.success();
  static jobAccepted = () => HapticService.success();
  static jobRejected = () => HapticService.warning();
  static loginSuccess = () => HapticService.success();
  static loginFailed = () => HapticService.error();
  static messageReceived = () => HapticService.light();
  static messageSent = () => HapticService.light();
}

// Hook for using haptics in components
export const useHaptics = () => {
  return {
    // Basic haptics
    light: HapticService.light,
    medium: HapticService.medium,
    heavy: HapticService.heavy,

    // Notification haptics
    success: HapticService.success,
    warning: HapticService.warning,
    error: HapticService.error,
    selection: HapticService.selection,

    // Context-specific haptics
    buttonPress: HapticService.buttonPress,
    tabSwitch: HapticService.tabSwitch,
    toggleSwitch: HapticService.toggleSwitch,
    formSubmit: HapticService.formSubmit,
    navigationBack: HapticService.navigationBack,
    pullToRefresh: HapticService.pullToRefresh,
    longPress: HapticService.longPress,
    swipeAction: HapticService.swipeAction,

    // App-specific haptics
    likePost: HapticService.likePost,
    savePost: HapticService.savePost,
    jobPosted: HapticService.jobPosted,
    jobAccepted: HapticService.jobAccepted,
    jobRejected: HapticService.jobRejected,
    loginSuccess: HapticService.loginSuccess,
    loginFailed: HapticService.loginFailed,
    messageReceived: HapticService.messageReceived,
    messageSent: HapticService.messageSent,
  };
};

export default HapticService;
