import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
} from 'react-native';
import { theme } from '../../../theme';

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
    borderRadius: theme.borderRadius.xl, // More rounded for modern look
    overflow: 'hidden',
  };

  // Add padding
  if (padding !== 'none') {
    const paddingMap = {
      sm: theme.spacing[3],
      md: theme.spacing[5], // Slightly more padding
      lg: theme.spacing[6],
      xl: theme.spacing[8],
    };
    baseStyle.padding = paddingMap[padding];
  }

  // Apply variant styles with enhanced Material Design 3 patterns
  switch (variant) {
    case 'elevated':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.background,
        ...(isPressed ? theme.shadows.lg : theme.shadows.md), // Dynamic shadow
        opacity: disabled ? 0.5 : 1,
        // Add subtle state overlay for interactive cards
        ...(interactive && !disabled && isPressed ? {
          backgroundColor: theme.colors.backgroundSecondary,
        } : {}),
      };

    case 'outlined':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: isPressed && interactive
          ? theme.colors.gray100
          : theme.colors.border,
        opacity: disabled ? 0.5 : 1,
        ...(interactive && !disabled && isPressed ? {
          backgroundColor: theme.colors.gray25,
        } : {}),
      };

    case 'filled':
      return {
        ...baseStyle,
        backgroundColor: isPressed && interactive
          ? theme.colors.backgroundTertiary
          : theme.colors.backgroundSecondary,
        opacity: disabled ? 0.5 : 1,
        ...(interactive && !disabled ? theme.shadows.sm : {}),
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
    marginBottom: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  body: {
    flex: 1,
  },
  footer: {
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  // Specialized card styles
  jobCard: {
    marginVertical: theme.spacing[2],
    marginHorizontal: theme.spacing[4],
  },
  contractorCard: {
    marginVertical: theme.spacing[2],
    marginHorizontal: theme.spacing[4],
  },
  statCard: {
    flex: 1,
    margin: theme.spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});

export default Card;