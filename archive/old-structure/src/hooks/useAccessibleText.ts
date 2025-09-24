import { useState, useEffect } from 'react';
import { AccessibilityInfo, TextStyle } from 'react-native';
import { scaledFontSize, theme } from '../theme';

interface UseAccessibleTextOptions {
  maxScale?: number;
  minScale?: number;
}

export const useAccessibleText = (
  baseFontSize: number,
  options: UseAccessibleTextOptions = {}
) => {
  const { maxScale = 1.3, minScale = 0.8 } = options;
  const [fontSize, setFontSize] = useState(
    scaledFontSize(baseFontSize, maxScale)
  );
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check if screen reader is enabled
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    // Listen for screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    // Update font size based on system font scale
    const updateFontSize = () => {
      const scaledSize = scaledFontSize(baseFontSize, maxScale);
      const constrainedSize = Math.max(
        baseFontSize * minScale,
        Math.min(scaledSize, baseFontSize * maxScale)
      );
      setFontSize(constrainedSize);
    };

    updateFontSize();

    return () => subscription?.remove();
  }, [baseFontSize, maxScale, minScale]);

  return {
    fontSize,
    isScreenReaderEnabled,
    // Style object ready to use
    textStyle: {
      fontSize,
      // Enhance line height for better readability when scaled
      lineHeight: fontSize * (isScreenReaderEnabled ? 1.5 : 1.4),
    } as TextStyle,
  };
};

// Hook for getting accessible colors with high contrast support
export const useAccessibleColors = () => {
  const [isHighContrastEnabled, setIsHighContrastEnabled] = useState(false);

  useEffect(() => {
    // Check for high contrast preference (iOS 13+)
    AccessibilityInfo.isHighTextContrastEnabled?.().then(
      setIsHighContrastEnabled
    );

    const subscription = AccessibilityInfo.addEventListener?.(
      'highTextContrastChanged' as any,
      setIsHighContrastEnabled
    );

    return () => subscription?.remove?.();
  }, []);

  return {
    isHighContrastEnabled,
    // Enhanced colors for high contrast mode
    colors: {
      ...theme.colors,
      textPrimary: isHighContrastEnabled ? '#000000' : theme.colors.textPrimary,
      textSecondary: isHighContrastEnabled
        ? '#1F1F1F'
        : theme.colors.textSecondary,
      background: isHighContrastEnabled ? '#FFFFFF' : theme.colors.background,
    },
  };
};

// Hook for accessible touch targets
export const useAccessibleTouchTarget = (baseSize: number) => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  // Increase touch targets when screen reader is enabled
  const accessibleSize = isScreenReaderEnabled
    ? Math.max(baseSize, 44)
    : Math.max(baseSize, 44); // Always meet minimum 44px

  return {
    touchTargetSize: accessibleSize,
    isScreenReaderEnabled,
    style: {
      minHeight: accessibleSize,
      minWidth: accessibleSize,
    },
  };
};
