import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// ============================================================================
// HAPTIC SYSTEM TYPES
// ============================================================================

export type HapticPattern = 'pulse' | 'double' | 'triple' | 'heartbeat' | 'wave';
export type HapticIntensity = 'light' | 'medium' | 'heavy';
export type HapticContext = 'ui' | 'notification' | 'success' | 'warning' | 'error' | 'custom';

export interface HapticPreferences {
  enabled: boolean;
  uiHaptics: boolean;
  notificationHaptics: boolean;
  intensity: HapticIntensity;
}

const HAPTIC_PREFERENCES_KEY = '@mintenance_haptic_preferences';

// ============================================================================
// ENHANCED HAPTIC SERVICE
// ============================================================================

export class HapticService {
  private static preferences: HapticPreferences = {
    enabled: true,
    uiHaptics: true,
    notificationHaptics: true,
    intensity: 'medium',
  };

  private static isInitialized = false;

  // Initialize preferences from storage
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(HAPTIC_PREFERENCES_KEY);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
      this.isInitialized = true;
    } catch (error) {
      logger.warn('Failed to load haptic preferences:', { data: error });
    }
  }

  // Save preferences to storage
  static async updatePreferences(prefs: Partial<HapticPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...prefs };
      await AsyncStorage.setItem(HAPTIC_PREFERENCES_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      logger.warn('Failed to save haptic preferences:', { data: error });
    }
  }

  // Get current preferences
  static getPreferences(): HapticPreferences {
    return { ...this.preferences };
  }

  // Check if haptics should be played
  private static shouldPlayHaptic(context: HapticContext): boolean {
    if (!this.preferences.enabled) return false;

    switch (context) {
      case 'ui':
        return this.preferences.uiHaptics;
      case 'notification':
      case 'success':
      case 'warning':
      case 'error':
        return this.preferences.notificationHaptics;
      case 'custom':
      default:
        return true;
    }
  }

  // Enhanced impact feedback with intensity preference
  private static async playImpact(style: Haptics.ImpactFeedbackStyle, context: HapticContext = 'ui'): Promise<void> {
    if (!this.shouldPlayHaptic(context)) return;

    try {
      // Adjust intensity based on preferences
      let adjustedStyle = style;
      if (this.preferences.intensity === 'light' && style === Haptics.ImpactFeedbackStyle.Heavy) {
        adjustedStyle = Haptics.ImpactFeedbackStyle.Medium;
      } else if (this.preferences.intensity === 'heavy' && style === Haptics.ImpactFeedbackStyle.Light) {
        adjustedStyle = Haptics.ImpactFeedbackStyle.Medium;
      }

      if (Platform.OS === 'ios') {
        await Haptics.impactAsync(adjustedStyle);
      }
    } catch (error) {
      logger.warn('Haptic feedback failed:', { data: error });
    }
  }

  // Enhanced notification feedback
  private static async playNotification(type: Haptics.NotificationFeedbackType, context: HapticContext = 'notification'): Promise<void> {
    if (!this.shouldPlayHaptic(context)) return;

    try {
      await Haptics.notificationAsync(type);
    } catch (error) {
      logger.warn('Haptic notification failed:', { data: error });
    }
  }

  // Play custom haptic patterns
  static async playPattern(pattern: HapticPattern, intensity: HapticIntensity = 'medium'): Promise<void> {
    if (!this.shouldPlayHaptic('custom')) return;

    const getStyle = () => {
      switch (intensity) {
        case 'light': return Haptics.ImpactFeedbackStyle.Light;
        case 'heavy': return Haptics.ImpactFeedbackStyle.Heavy;
        default: return Haptics.ImpactFeedbackStyle.Medium;
      }
    };

    try {
      switch (pattern) {
        case 'pulse':
          await this.playImpact(getStyle(), 'custom');
          break;

        case 'double':
          await this.playImpact(getStyle(), 'custom');
          setTimeout(async () => {
            await this.playImpact(getStyle(), 'custom');
          }, 100);
          break;

        case 'triple':
          for (let i = 0; i < 3; i++) {
            setTimeout(async () => {
              await this.playImpact(getStyle(), 'custom');
            }, i * 100);
          }
          break;

        case 'heartbeat':
          await this.playImpact(getStyle(), 'custom');
          setTimeout(async () => {
            await this.playImpact(getStyle(), 'custom');
          }, 150);
          setTimeout(async () => {
            await this.playImpact(Haptics.ImpactFeedbackStyle.Light, 'custom');
          }, 400);
          break;

        case 'wave':
          const intensities = [
            Haptics.ImpactFeedbackStyle.Light,
            Haptics.ImpactFeedbackStyle.Medium,
            Haptics.ImpactFeedbackStyle.Heavy,
            Haptics.ImpactFeedbackStyle.Medium,
            Haptics.ImpactFeedbackStyle.Light,
          ];

          intensities.forEach((intensity, index) => {
            setTimeout(async () => {
              if (Platform.OS === 'ios') {
                await Haptics.impactAsync(intensity);
              }
            }, index * 80);
          });
          break;
      }
    } catch (error) {
      logger.warn('Haptic pattern failed:', { data: error });
    }
  }
  // Basic haptic methods (updated to use enhanced system)
  static light = async () => {
    await this.playImpact(Haptics.ImpactFeedbackStyle.Light, 'ui');
  };

  static medium = async () => {
    await this.playImpact(Haptics.ImpactFeedbackStyle.Medium, 'ui');
  };

  static heavy = async () => {
    await this.playImpact(Haptics.ImpactFeedbackStyle.Heavy, 'ui');
  };

  // Notification haptics
  static success = async () => {
    await this.playNotification(Haptics.NotificationFeedbackType.Success, 'success');
  };

  static warning = async () => {
    await this.playNotification(Haptics.NotificationFeedbackType.Warning, 'warning');
  };

  static error = async () => {
    await this.playNotification(Haptics.NotificationFeedbackType.Error, 'error');
  };

  static selection = async () => {
    if (!this.shouldPlayHaptic('ui')) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      logger.warn('Haptic selection failed:', { data: error });
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

// ============================================================================
// HAPTIC HOOK
// ============================================================================

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

    // Pattern haptics
    playPattern: HapticService.playPattern,

    // Preferences management
    getPreferences: HapticService.getPreferences,
    updatePreferences: HapticService.updatePreferences,
    initialize: HapticService.initialize,

    // Context-specific haptics
    buttonPress: HapticService.buttonPress,
    tabSwitch: HapticService.tabSwitch,
    toggleSwitch: HapticService.toggleSwitch,
    formSubmit: HapticService.formSubmit,
    navigationBack: HapticService.navigationBack,
    pullToRefresh: HapticService.pullToRefresh,
    longPress: HapticService.longPress,
    swipeAction: HapticService.swipeAction,
    cardFlip: HapticService.cardFlip,

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
