import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  icon,
  onPress,
  style,
  textStyle,
  testID,
}) => {
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [isPressed, setIsPressed] = useState(false);

  const badgeStyles = getBadgeStyles(variant, size, rounded);
  const badgeTextStyles = getBadgeTextStyles(variant, size);
  const iconColor = getIconColor(variant);
  const iconSize = getIconSize(size);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
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

  const renderContent = () => (
    <View style={styles.content}>
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={[badgeTextStyles, textStyle]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
        <TouchableOpacity
          style={[badgeStyles, style]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={typeof children === 'string' ? children : undefined}
          accessibilityState={{ selected: isPressed }}
          testID={testID}
        >
          {renderContent()}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View
      style={[badgeStyles, style]}
      accessibilityRole="text"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

// ============================================================================
// CHIP COMPONENT (Interactive Badge)
// ============================================================================

export interface ChipProps extends BadgeProps {
  selected?: boolean;
  onDelete?: () => void;
  deleteIcon?: keyof typeof Ionicons.glyphMap;
}

export const Chip: React.FC<ChipProps> = ({
  selected = false,
  onDelete,
  deleteIcon = 'close',
  children,
  variant = selected ? 'primary' : 'neutral',
  size = 'md',
  icon,
  onPress,
  style,
  textStyle,
  testID,
}) => {
  const chipStyles = getChipStyles(variant, size, selected);
  const chipTextStyles = getChipTextStyles(variant, size, selected);
  const iconColor = getIconColor(variant);
  const iconSize = getIconSize(size);

  const renderContent = () => (
    <View style={styles.chipContent}>
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={[chipTextStyles, textStyle]} numberOfLines={1}>
        {children}
      </Text>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel="Remove"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={deleteIcon}
            size={iconSize}
            color={iconColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[chipStyles, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={typeof children === 'string' ? children : undefined}
        accessibilityState={{ selected }}
        testID={testID}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[chipStyles, style]}
      accessibilityRole="text"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

// ============================================================================
// NOTIFICATION BADGE (Numeric Badge)
// ============================================================================

export interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: BadgeSize;
  variant?: BadgeVariant;
  showZero?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'sm',
  variant = 'error',
  showZero = false,
  style,
  testID,
}) => {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const notificationStyles = getNotificationBadgeStyles(size);

  return (
    <View
      style={[notificationStyles, getBadgeStyles(variant, size, true), style]}
      accessibilityRole="text"
      accessibilityLabel={`${count} notification${count !== 1 ? 's' : ''}`}
      testID={testID}
    >
      <Text style={getBadgeTextStyles(variant, size)} numberOfLines={1}>
        {displayCount}
      </Text>
    </View>
  );
};

// ============================================================================
// STYLE FUNCTIONS
// ============================================================================

const getBadgeStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  rounded: boolean
): ViewStyle => {
  const sizeStyles = getSizeStyles(size);
  const colorStyles = getVariantStyles(variant);

  return {
    ...sizeStyles,
    ...colorStyles,
    borderRadius: rounded ? 100 : theme.borderRadius.lg, // More rounded for modern look
    alignSelf: 'flex-start',
    overflow: 'hidden',
    // Add subtle shadow for depth
    ...theme.shadows.sm,
  };
};

const getChipStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  selected: boolean
): ViewStyle => {
  const baseStyles = getBadgeStyles(variant, size, true);

  return {
    ...baseStyles,
    borderWidth: selected ? 0 : 1,
    borderColor: selected ? 'transparent' : theme.colors.border,
  };
};

const getSizeStyles = (size: BadgeSize): ViewStyle => {
  switch (size) {
    case 'sm':
      return {
        paddingHorizontal: theme.spacing[2],
        paddingVertical: theme.spacing[0.5],
        minHeight: 20,
      };
    case 'md':
      return {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        minHeight: 24,
      };
    case 'lg':
      return {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[1.5],
        minHeight: 32,
      };
    default:
      return {};
  }
};

const getVariantStyles = (variant: BadgeVariant): ViewStyle => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: theme.colors.primary,
        // Enhanced gradient-like effect with subtle border
        borderWidth: 1,
        borderColor: theme.colors.primaryDark,
      };
    case 'secondary':
      return {
        backgroundColor: theme.colors.secondary,
        borderWidth: 1,
        borderColor: theme.colors.secondaryDark,
      };
    case 'success':
      return {
        backgroundColor: theme.colors.success,
        borderWidth: 1,
        borderColor: theme.colors.successDark,
      };
    case 'error':
      return {
        backgroundColor: theme.colors.error,
        borderWidth: 1,
        borderColor: theme.colors.errorDark,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.warning,
        borderWidth: 1,
        borderColor: theme.colors.warningDark,
      };
    case 'info':
      return {
        backgroundColor: theme.colors.info,
        borderWidth: 1,
        borderColor: theme.colors.infoDark,
      };
    case 'neutral':
      return {
        backgroundColor: theme.colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    default:
      return {};
  }
};

const getBadgeTextStyles = (variant: BadgeVariant, size: BadgeSize): TextStyle => {
  const fontSize = size === 'sm' ? theme.typography.fontSize.xs :
                   size === 'md' ? theme.typography.fontSize.sm :
                   theme.typography.fontSize.base;

  const color = variant === 'neutral'
    ? theme.colors.textPrimary
    : theme.colors.white;

  return {
    fontSize,
    fontWeight: theme.typography.fontWeight.medium,
    color,
    textAlign: 'center',
  };
};

const getChipTextStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  selected: boolean
): TextStyle => {
  const baseStyles = getBadgeTextStyles(variant, size);

  if (!selected && variant === 'neutral') {
    return {
      ...baseStyles,
      color: theme.colors.textPrimary,
    };
  }

  return baseStyles;
};

const getIconColor = (variant: BadgeVariant): string => {
  return variant === 'neutral'
    ? theme.colors.textPrimary
    : theme.colors.white;
};

const getIconSize = (size: BadgeSize): number => {
  switch (size) {
    case 'sm':
      return 12;
    case 'md':
      return 14;
    case 'lg':
      return 16;
    default:
      return 14;
  }
};

const getNotificationBadgeStyles = (size: BadgeSize): ViewStyle => {
  const baseSize = size === 'sm' ? 18 : size === 'md' ? 20 : 24;

  return {
    minWidth: baseSize,
    height: baseSize,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  };
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: theme.spacing[1],
  },
  deleteButton: {
    marginLeft: theme.spacing[1],
    padding: theme.spacing[0.5],
  },
});

export default Badge;