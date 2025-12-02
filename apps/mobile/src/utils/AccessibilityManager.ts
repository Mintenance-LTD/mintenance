/**
 * Accessibility Manager
 *
 * Centralized service for managing accessibility features across the application.
 * Provides high-level accessibility utilities and consistent behavior.
 */

import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { theme } from '../theme';

// ============================================================================
// ACCESSIBILITY MANAGER CLASS
// ============================================================================

class AccessibilityManager {
  private static instance: AccessibilityManager;
  private isScreenReaderEnabled = false;
  private isReduceMotionEnabled = false;
  private isBoldTextEnabled = false;
  private isHighContrastEnabled = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private async initialize() {
    try {
      // Check initial accessibility settings
      this.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

      if (Platform.OS === 'ios') {
        this.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        this.isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
        this.isHighContrastEnabled =
          await AccessibilityInfo.isInvertColorsEnabled() ||
          await AccessibilityInfo.isGrayscaleEnabled();
      }

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      logger.error('Failed to initialize AccessibilityManager:', error);
    }
  }

  private setupEventListeners() {
    AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      this.isScreenReaderEnabled = enabled;
    });

    if (Platform.OS === 'ios') {
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        this.isReduceMotionEnabled = enabled;
      });

      AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
        this.isBoldTextEnabled = enabled;
      });

      AccessibilityInfo.addEventListener('invertColorsChanged', (enabled) => {
        this.isHighContrastEnabled = enabled || this.isHighContrastEnabled;
      });

      AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) => {
        this.isHighContrastEnabled = enabled || this.isHighContrastEnabled;
      });
    }
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  public get screenReaderEnabled(): boolean {
    return this.isScreenReaderEnabled;
  }

  public get reduceMotionEnabled(): boolean {
    return this.isReduceMotionEnabled;
  }

  public get boldTextEnabled(): boolean {
    return this.isBoldTextEnabled;
  }

  public get highContrastEnabled(): boolean {
    return this.isHighContrastEnabled;
  }

  // ============================================================================
  // ANNOUNCEMENT UTILITIES
  // ============================================================================

  /**
   * Announce message to screen reader
   */
  public announce(message: string, priority: 'low' | 'high' = 'low'): void {
    if (this.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);

      // Add vibration for high priority announcements on Android
      if (Platform.OS === 'android' && priority === 'high') {
        Vibration.vibrate(100);
      }
    }
  }

  /**
   * Announce error messages with appropriate emphasis
   */
  public announceError(message: string, context?: string): void {
    const fullMessage = context ? `Error in ${context}: ${message}` : `Error: ${message}`;
    this.announce(fullMessage, 'high');
  }

  /**
   * Announce success messages
   */
  public announceSuccess(message: string, context?: string): void {
    const fullMessage = context ? `Success in ${context}: ${message}` : `Success: ${message}`;
    this.announce(fullMessage, 'low');
  }

  /**
   * Announce navigation changes
   */
  public announceNavigation(screenName: string, additionalInfo?: string): void {
    const message = additionalInfo
      ? `Navigated to ${screenName}. ${additionalInfo}`
      : `Navigated to ${screenName}`;
    this.announce(message, 'low');
  }

  /**
   * Announce loading states
   */
  public announceLoading(isLoading: boolean, context?: string): void {
    const action = isLoading ? 'Loading' : 'Finished loading';
    const message = context ? `${action} ${context}` : action;
    this.announce(message, 'low');
  }

  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================

  /**
   * Set accessibility focus to an element
   */
  public setFocus(reactTag: number): void {
    if (this.isScreenReaderEnabled) {
      setTimeout(() => {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }, 100); // Small delay to ensure element is rendered
    }
  }

  // ============================================================================
  // STYLING HELPERS
  // ============================================================================

  /**
   * Get font size adjusted for accessibility preferences
   */
  public getAdjustedFontSize(baseFontSize: number): number {
    if (this.isBoldTextEnabled) {
      return baseFontSize * 1.1; // Slightly larger for bold text users
    }
    return baseFontSize;
  }

  /**
   * Get text style adjusted for accessibility
   */
  public getAdjustedTextStyle(baseStyle: any) {
    return {
      ...baseStyle,
      fontSize: this.getAdjustedFontSize(baseStyle.fontSize || 16),
      fontWeight: this.isBoldTextEnabled && !baseStyle.fontWeight ? '600' : baseStyle.fontWeight,
    };
  }

  /**
   * Get colors adjusted for high contrast
   */
  public getAdjustedColors() {
    if (this.isHighContrastEnabled) {
      return {
        primary: '#0000FF', // High contrast blue
        secondary: '#000000', // Pure black
        text: '#000000',
        textSecondary: '#000000',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        border: '#000000',
        error: '#FF0000', // High contrast red
        success: '#008000', // High contrast green
        warning: '#FFD700', // High contrast yellow
      };
    }
    return theme.colors; // Return default colors
  }

  /**
   * Check if animations should be reduced
   */
  public shouldReduceMotion(): boolean {
    return this.isReduceMotionEnabled;
  }

  /**
   * Get animation duration adjusted for reduce motion preference
   */
  public getAnimationDuration(baseDuration: number): number {
    return this.isReduceMotionEnabled ? baseDuration * 0.1 : baseDuration;
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate accessibility props for components
   */
  public validateAccessibilityProps(props: any): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isValid = true;

    // Check for missing accessibility label on interactive elements
    if (props.onPress && !props.accessibilityLabel) {
      warnings.push('Interactive element missing accessibilityLabel');
      isValid = false;
    }

    // Check for appropriate accessibility role
    if (props.onPress && !props.accessibilityRole) {
      warnings.push('Interactive element missing accessibilityRole');
      isValid = false;
    }

    // Check for sufficient color contrast (simplified check)
    if (props.style?.backgroundColor && props.style?.color) {
      // In a real implementation, this would use a proper contrast checker
      const isDarkBg = props.style.backgroundColor.includes('0') || props.style.backgroundColor.includes('1');
      const isLightText = props.style.color.includes('F') || props.style.color.includes('fff');

      if ((isDarkBg && !isLightText) || (!isDarkBg && isLightText)) {
        warnings.push('Potential color contrast issue detected');
      }
    }

    // Check minimum touch target size
    const width = props.style?.width;
    const height = props.style?.height;
    if (props.onPress && width && height && (width < 44 || height < 44)) {
      warnings.push('Touch target may be too small (minimum 44x44 recommended)');
    }

    return { isValid, warnings };
  }

  // ============================================================================
  // COMMON ACCESSIBILITY PROPS GENERATORS
  // ============================================================================

  /**
   * Generate standard button accessibility props
   */
  public getButtonProps(label: string, hint?: string, disabled?: boolean) {
    return {
      accessibilityRole: 'button' as const,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: { disabled: !!disabled },
      accessible: true,
    };
  }

  /**
   * Generate standard text input accessibility props
   */
  public getTextInputProps(label: string, value?: string, isSecure?: boolean, error?: string) {
    const hasError = !!error;
    const fullLabel = hasError ? `${label}, ${error}` : label;

    return {
      accessibilityRole: 'text' as const,
      accessibilityLabel: fullLabel,
      accessibilityValue: isSecure ? (value ? { text: 'Has secure text' } : undefined) : { text: value },
      accessibilityState: { disabled: false },
      accessible: true,
      ...(hasError && { accessibilityInvalid: true }),
    };
  }

  /**
   * Generate standard header accessibility props
   */
  public getHeaderProps(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1) {
    return {
      accessibilityRole: 'header' as const,
      accessibilityLabel: text,
      accessible: true,
      ...(Platform.OS === 'android' && { accessibilityLevel: level }),
    };
  }

  // ============================================================================
  // TESTING UTILITIES
  // ============================================================================

  /**
   * Get accessibility testing report for a component tree
   */
  public getAccessibilityReport(componentProps: any[]): {
    totalElements: number;
    accessibleElements: number;
    issues: Array<{
      element: string;
      issues: string[];
    }>;
  } {
    let totalElements = 0;
    let accessibleElements = 0;
    const issues: Array<{ element: string; issues: string[] }> = [];

    componentProps.forEach((props, index) => {
      totalElements++;

      const validation = this.validateAccessibilityProps(props);
      if (validation.isValid) {
        accessibleElements++;
      }

      if (validation.warnings.length > 0) {
        issues.push({
          element: `Element ${index}`,
          issues: validation.warnings,
        });
      }
    });

    return {
      totalElements,
      accessibleElements,
      issues,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default AccessibilityManager.getInstance();

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for using accessibility manager in components
 */
export const useAccessibilityManager = () => {
  const manager = AccessibilityManager.getInstance();

  return {
    announce: manager.announce.bind(manager),
    announceError: manager.announceError.bind(manager),
    announceSuccess: manager.announceSuccess.bind(manager),
    announceNavigation: manager.announceNavigation.bind(manager),
    announceLoading: manager.announceLoading.bind(manager),
    setFocus: manager.setFocus.bind(manager),
    getAdjustedFontSize: manager.getAdjustedFontSize.bind(manager),
    getAdjustedTextStyle: manager.getAdjustedTextStyle.bind(manager),
    getAdjustedColors: manager.getAdjustedColors.bind(manager),
    shouldReduceMotion: manager.shouldReduceMotion.bind(manager),
    getAnimationDuration: manager.getAnimationDuration.bind(manager),
    getButtonProps: manager.getButtonProps.bind(manager),
    getTextInputProps: manager.getTextInputProps.bind(manager),
    getHeaderProps: manager.getHeaderProps.bind(manager),

    // State getters
    screenReaderEnabled: manager.screenReaderEnabled,
    reduceMotionEnabled: manager.reduceMotionEnabled,
    boldTextEnabled: manager.boldTextEnabled,
    highContrastEnabled: manager.highContrastEnabled,
  };
};