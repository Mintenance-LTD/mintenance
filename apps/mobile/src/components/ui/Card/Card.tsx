import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
} from 'react-native';
import { designTokens } from '../../../design-system/tokens';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;

  // Touch props (when interactive)
  onPress?: TouchableOpacityProps['onPress'];
  onLongPress?: TouchableOpacityProps['onLongPress'];
  activeOpacity?: number;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none';
  testID?: string;
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  interactive = false,
  disabled = false,
  style,
  onPress,
  onLongPress,
  activeOpacity = 0.7,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  testID,
}) => {
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [isPressed, setIsPressed] = useState(false);

  const cardStyles = getCardStyles(variant, padding, interactive, disabled, isPressed);

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    Animated.spring(scaleAnimation, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Render as TouchableOpacity if interactive
  if (interactive || onPress || onLongPress) {
    return (
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnimation }] },
        ]}
      >
        <TouchableOpacity
          style={[cardStyles, style]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={onLongPress}
          disabled={disabled}
          activeOpacity={1}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole={accessibilityRole || 'button'}
          accessibilityState={{ disabled, selected: isPressed }}
          testID={testID}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Render as regular View
  return (
    <View
      style={[cardStyles, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </View>
  );
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const CardHeader: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View style={[styles.header, style]}>
    {children}
  </View>
);

export const CardBody: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View style={[styles.body, style]}>
    {children}
  </View>
);

export const CardFooter: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <View style={[styles.footer, style]}>
    {children}
  </View>
);

// ============================================================================
// SPECIALIZED CARD COMPONENTS
// ============================================================================

export const JobCard: React.FC<CardProps> = (props) => (
  <Card
    {...props}
    variant="elevated"
    padding="md"
    interactive
    style={StyleSheet.flatten([styles.jobCard, props.style])}
  />
);

export const ContractorCard: React.FC<CardProps> = (props) => (
  <Card
    {...props}
    variant="elevated"
    padding="md"
    interactive
    style={StyleSheet.flatten([styles.contractorCard, props.style])}
  />
);

export const StatCard: React.FC<CardProps> = (props) => (
  <Card
    {...props}
    variant="filled"
    padding="lg"
    style={StyleSheet.flatten([styles.statCard, props.style])}
  />
);

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getCardStyles = (
  variant: CardVariant,
  padding: CardPadding,
  interactive: boolean,
  disabled: boolean,
  isPressed: boolean = false
): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: designTokens.borderRadius.xl, // More rounded for modern look
    overflow: 'hidden',
  };

  // Add padding
  if (padding !== 'none') {
    const paddingMap = {
      sm: designTokens.spacing[3],
      md: designTokens.spacing[5], // Slightly more padding
      lg: designTokens.spacing[6],
      xl: designTokens.spacing[8],
    };
    baseStyle.padding = paddingMap[padding];
  }

  // Apply variant styles with enhanced Material Design 3 patterns
  switch (variant) {
    case 'elevated':
      return {
        ...baseStyle,
        backgroundColor: designTokens.semanticColors.background.primary,
        ...(isPressed ? designTokens.shadows.lg : designTokens.shadows.md), // Dynamic shadow
        opacity: disabled ? designTokens.opacity[50] : 1,
        // Add subtle state overlay for interactive cards
        ...(interactive && !disabled && isPressed ? {
          backgroundColor: designTokens.colors.neutral[50],
        } : {}),
      };

    case 'outlined':
      return {
        ...baseStyle,
        backgroundColor: designTokens.semanticColors.background.primary,
        borderWidth: 1,
        borderColor: isPressed && interactive
          ? designTokens.colors.primary[200]
          : designTokens.semanticColors.border.primary,
        opacity: disabled ? designTokens.opacity[50] : 1,
        ...(interactive && !disabled && isPressed ? {
          backgroundColor: designTokens.colors.primary[50],
        } : {}),
      };

    case 'filled':
      return {
        ...baseStyle,
        backgroundColor: isPressed && interactive
          ? designTokens.colors.neutral[100]
          : designTokens.semanticColors.background.secondary,
        opacity: disabled ? designTokens.opacity[50] : 1,
        ...(interactive && !disabled ? designTokens.shadows.sm : {}),
      };

    default:
      return baseStyle;
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    marginBottom: designTokens.spacing[3],
    paddingBottom: designTokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: designTokens.semanticColors.border.primary,
  },
  body: {
    flex: 1,
  },
  footer: {
    marginTop: designTokens.spacing[3],
    paddingTop: designTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: designTokens.semanticColors.border.primary,
  },

  // Specialized card styles
  jobCard: {
    marginVertical: designTokens.spacing[2],
    marginHorizontal: designTokens.spacing[4],
  },
  contractorCard: {
    marginVertical: designTokens.spacing[2],
    marginHorizontal: designTokens.spacing[4],
  },
  statCard: {
    flex: 1,
    margin: designTokens.spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});

export default Card;