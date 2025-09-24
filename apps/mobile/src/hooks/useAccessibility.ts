import { useState, useEffect, useCallback, useMemo } from 'react';
import { AccessibilityInfo, Platform, AccessibilityRole } from 'react-native';

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

export interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  prefersCrossDeviceSync: boolean;
  screenReaderName?: string;
}

export interface AccessibilityPreferences {
  announceForAccessibility: (message: string) => void;
  setAccessibilityFocus: (reactTag: number) => void;
  isAccessibilityElement: boolean;
  accessible?: boolean;
  accessibilityRole: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: Array<{
    name: string;
    label?: string;
  }>;
}

// ============================================================================
// ACCESSIBILITY HOOK
// ============================================================================

export const useAccessibility = () => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    prefersCrossDeviceSync: false,
  });

  // ============================================================================
  // INITIALIZATION & LISTENERS
  // ============================================================================

  useEffect(() => {
    const updateAccessibilityInfo = async () => {
      try {
        const [
          isScreenReaderEnabled,
          isBoldTextEnabled,
          isGrayscaleEnabled,
          isInvertColorsEnabled,
          isReduceMotionEnabled,
          isReduceTransparencyEnabled,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isGrayscaleEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isReduceMotionEnabled() : Promise.resolve(false),
          Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false),
        ]);

        let screenReaderName: string | undefined;
        if (isScreenReaderEnabled) {
          // Set screen reader name based on platform
          screenReaderName = Platform.OS === 'ios' ? 'VoiceOver' : 'TalkBack';
        }

        setAccessibilityState({
          isScreenReaderEnabled,
          isBoldTextEnabled,
          isGrayscaleEnabled,
          isInvertColorsEnabled,
          isReduceMotionEnabled,
          isReduceTransparencyEnabled,
          prefersCrossDeviceSync: false, // Not available in RN
          screenReaderName,
        });
      } catch (error) {
        console.error('Failed to get accessibility info:', error);
      }
    };

    updateAccessibilityInfo();

    // Set up listeners for accessibility changes
    const listeners = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
        setAccessibilityState(prev => ({ ...prev, isScreenReaderEnabled: isEnabled }));
      }),
    ];

    if (Platform.OS === 'ios') {
      listeners.push(
        AccessibilityInfo.addEventListener('boldTextChanged', (isEnabled) => {
          setAccessibilityState(prev => ({ ...prev, isBoldTextEnabled: isEnabled }));
        }),
        AccessibilityInfo.addEventListener('grayscaleChanged', (isEnabled) => {
          setAccessibilityState(prev => ({ ...prev, isGrayscaleEnabled: isEnabled }));
        }),
        AccessibilityInfo.addEventListener('invertColorsChanged', (isEnabled) => {
          setAccessibilityState(prev => ({ ...prev, isInvertColorsEnabled: isEnabled }));
        }),
        AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
          setAccessibilityState(prev => ({ ...prev, isReduceMotionEnabled: isEnabled }));
        }),
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', (isEnabled) => {
          setAccessibilityState(prev => ({ ...prev, isReduceTransparencyEnabled: isEnabled }));
        })
      );
    }

    return () => {
      listeners.forEach(listener => listener?.remove?.());
    };
  }, []);

  // ============================================================================
  // ACCESSIBILITY UTILITIES
  // ============================================================================

  const announceForAccessibility = useCallback((message: string) => {
    if (accessibilityState.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [accessibilityState.isScreenReaderEnabled]);

  const setAccessibilityFocus = useCallback((reactTag: number) => {
    if (accessibilityState.isScreenReaderEnabled) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }, [accessibilityState.isScreenReaderEnabled]);

  // ============================================================================
  // ACCESSIBILITY PROPS GENERATORS
  // ============================================================================

  const getButtonProps = useCallback((
    label: string,
    hint?: string,
    disabled?: boolean,
    pressed?: boolean
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      disabled,
      selected: pressed,
    },
    accessible: true,
  }), []);

  const getTextInputProps = useCallback((
    label: string,
    value?: string,
    hint?: string,
    disabled?: boolean,
    secure?: boolean
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'text',
    accessibilityLabel: label,
    accessibilityHint: hint || (secure ? 'Secure text input' : 'Text input'),
    accessibilityValue: value ? { text: secure ? 'Has text' : value } : undefined,
    accessibilityState: {
      disabled,
    },
    accessible: true,
  }), []);

  const getCheckboxProps = useCallback((
    label: string,
    checked: boolean | 'mixed',
    hint?: string,
    disabled?: boolean
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'checkbox',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      checked,
      disabled,
    },
    accessible: true,
  }), []);

  const getRadioProps = useCallback((
    label: string,
    selected: boolean,
    hint?: string,
    disabled?: boolean
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'radio',
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: {
      selected,
      disabled,
    },
    accessible: true,
  }), []);

  const getSliderProps = useCallback((
    label: string,
    value: number,
    min: number,
    max: number,
    hint?: string,
    disabled?: boolean
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'adjustable',
    accessibilityLabel: label,
    accessibilityHint: hint || 'Swipe up or down to adjust value',
    accessibilityValue: {
      min,
      max,
      now: value,
      text: `${value}`,
    },
    accessibilityState: {
      disabled,
    },
    accessible: true,
    accessibilityActions: [
      { name: 'increment', label: 'Increase value' },
      { name: 'decrement', label: 'Decrease value' },
    ],
  }), []);

  const getImageProps = useCallback((
    label: string,
    decorative: boolean = false
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'image',
    accessibilityLabel: decorative ? undefined : label,
    accessible: !decorative,
  }), []);

  const getHeaderProps = useCallback((
    level: 1 | 2 | 3 | 4 | 5 | 6,
    text: string
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'header',
    accessibilityLabel: text,
    accessible: true,
  }), []);

  const getListProps = useCallback((
    itemCount: number,
    label?: string
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'list',
    accessibilityLabel: label || `List with ${itemCount} items`,
    accessible: true,
  }), []);

  const getListItemProps = useCallback((
    index: number,
    total: number,
    label: string,
    hint?: string
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'none', // Use 'none' to let children handle accessibility
    accessibilityLabel: `${label}, ${index + 1} of ${total}`,
    accessibilityHint: hint,
    accessible: true,
  }), []);

  // ============================================================================
  // NAVIGATION PROPS
  // ============================================================================

  const getTabProps = useCallback((
    label: string,
    selected: boolean,
    index: number,
    total: number
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'tab',
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: {
      selected,
    },
    accessible: true,
  }), []);

  const getTabPanelProps = useCallback((
    label: string
  ): Partial<AccessibilityPreferences> => ({
    accessibilityRole: 'none',
    accessibilityLabel: `${label} panel`,
    accessible: true,
  }), []);

  // ============================================================================
  // FORM VALIDATION HELPERS
  // ============================================================================

  const getErrorProps = useCallback((
    errorMessage?: string
  ): Partial<AccessibilityPreferences> => {
    if (!errorMessage) return {};

    return {
      accessibilityLabel: `Error: ${errorMessage}`,
      accessibilityRole: 'alert',
      accessible: true,
    };
  }, []);

  const getFormFieldProps = useCallback((
    label: string,
    required: boolean = false,
    errorMessage?: string,
    hint?: string
  ) => {
    const baseLabel = required ? `${label}, required` : label;
    const fullLabel = errorMessage ? `${baseLabel}, ${errorMessage}` : baseLabel;

    return {
      accessibilityLabel: fullLabel,
      accessibilityHint: hint,
      accessibilityInvalid: !!errorMessage,
      accessible: true,
    };
  }, []);

  // ============================================================================
  // DYNAMIC CONTENT HELPERS
  // ============================================================================

  const announceStateChange = useCallback((
    oldState: any,
    newState: any,
    getMessage: (oldVal: any, newVal: any) => string
  ) => {
    if (accessibilityState.isScreenReaderEnabled && oldState !== newState) {
      const message = getMessage(oldState, newState);
      announceForAccessibility(message);
    }
  }, [accessibilityState.isScreenReaderEnabled, announceForAccessibility]);

  const announcePageChange = useCallback((pageName: string) => {
    announceForAccessibility(`Navigated to ${pageName}`);
  }, [announceForAccessibility]);

  const announceLoading = useCallback((isLoading: boolean, context?: string) => {
    const message = isLoading
      ? `Loading${context ? ` ${context}` : ''}`
      : `Finished loading${context ? ` ${context}` : ''}`;
    announceForAccessibility(message);
  }, [announceForAccessibility]);

  const announceError = useCallback((errorMessage: string, context?: string) => {
    const message = `Error${context ? ` in ${context}` : ''}: ${errorMessage}`;
    announceForAccessibility(message);
  }, [announceForAccessibility]);

  const announceSuccess = useCallback((successMessage: string, context?: string) => {
    const message = `Success${context ? ` in ${context}` : ''}: ${successMessage}`;
    announceForAccessibility(message);
  }, [announceForAccessibility]);

  const announceFormValidation = useCallback((fieldName: string, isValid: boolean, errorMessage?: string) => {
    if (!isValid && errorMessage) {
      announceForAccessibility(`${fieldName} field has an error: ${errorMessage}`);
    } else if (isValid) {
      announceForAccessibility(`${fieldName} field is valid`);
    }
  }, [announceForAccessibility]);

  const announceListChange = useCallback((action: 'added' | 'removed' | 'updated', itemName: string, listName?: string) => {
    const listContext = listName ? ` in ${listName}` : '';
    const actionText = action === 'added' ? 'Added' : action === 'removed' ? 'Removed' : 'Updated';
    announceForAccessibility(`${actionText} ${itemName}${listContext}`);
  }, [announceForAccessibility]);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return useMemo(() => ({
    // State
    ...accessibilityState,
    
    // Utilities
    announceForAccessibility,
    setAccessibilityFocus,
    
    // Props generators
    getButtonProps,
    getTextInputProps,
    getCheckboxProps,
    getRadioProps,
    getSliderProps,
    getImageProps,
    getHeaderProps,
    getListProps,
    getListItemProps,
    getTabProps,
    getTabPanelProps,
    getErrorProps,
    getFormFieldProps,
    
    // Dynamic content
    announceStateChange,
    announcePageChange,
    announceLoading,
    announceError,
    announceSuccess,
    announceFormValidation,
    announceListChange,
    
    // Computed values
    shouldReduceMotion: accessibilityState.isReduceMotionEnabled,
    shouldUseBoldText: accessibilityState.isBoldTextEnabled,
    shouldUseHighContrast: accessibilityState.isInvertColorsEnabled || accessibilityState.isGrayscaleEnabled,
    isUsingAssistiveTechnology: accessibilityState.isScreenReaderEnabled,
  }), [
    accessibilityState,
    announceForAccessibility,
    setAccessibilityFocus,
    getButtonProps,
    getTextInputProps,
    getCheckboxProps,
    getRadioProps,
    getSliderProps,
    getImageProps,
    getHeaderProps,
    getListProps,
    getListItemProps,
    getTabProps,
    getTabPanelProps,
    getErrorProps,
    getFormFieldProps,
    announceStateChange,
    announcePageChange,
    announceLoading,
    announceError,
    announceSuccess,
    announceFormValidation,
    announceListChange,
  ]);
};

// ============================================================================
// ACCESSIBILITY TESTING HELPERS
// ============================================================================

export const AccessibilityTestHelpers = {
  // Test if element has proper accessibility props
  hasAccessibilityProps: (element: any) => {
    return (
      element.props.accessible !== false &&
      (element.props.accessibilityLabel || element.props.accessibilityRole)
    );
  },

  // Test if interactive element has proper role
  hasInteractiveRole: (element: any) => {
    const interactiveRoles = ['button', 'link', 'tab', 'checkbox', 'radio', 'switch', 'adjustable'];
    return interactiveRoles.includes(element.props.accessibilityRole);
  },

  // Test if element has sufficient contrast (mock for testing)
  hasSufficientContrast: (backgroundColor: string, textColor: string) => {
    // This would integrate with a contrast checking library in production
    return true; // Placeholder
  },

  // Test if text size is appropriate
  hasAppropriateTextSize: (fontSize: number) => {
    return fontSize >= 16; // Minimum recommended size
  },

  // Test if touch target is large enough
  hasAdequateTouchTarget: (width: number, height: number) => {
    return width >= 44 && height >= 44; // iOS HIG minimum
  },
};

export default useAccessibility;
