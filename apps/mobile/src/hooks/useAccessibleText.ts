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


// Hook for accessible touch targets

