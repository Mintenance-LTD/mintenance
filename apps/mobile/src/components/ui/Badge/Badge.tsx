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
import { designTokens } from '../../../design-system/tokens';

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
    borderRadius: rounded ? 100 : designTokens.borderRadius.lg, // More rounded for modern look
    alignSelf: 'flex-start',
    overflow: 'hidden',
    // Add subtle shadow for depth
    ...designTokens.shadows.sm,
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
    borderColor: selected ? 'transparent' : designTokens.semanticColors.border.primary,
  };
};

const getSizeStyles = (size: BadgeSize): ViewStyle => {
  switch (size) {
    case 'sm':
      return {
        paddingHorizontal: designTokens.spacing[2],
        paddingVertical: designTokens.spacing[0.5],
        minHeight: 20,
      };
    case 'md':
      return {
        paddingHorizontal: designTokens.spacing[3],
        paddingVertical: designTokens.spacing[1],
        minHeight: 24,
      };
    case 'lg':
      return {
        paddingHorizontal: designTokens.spacing[4],
        paddingVertical: designTokens.spacing[1.5],
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
        backgroundColor: designTokens.colors.primary[500],
        // Enhanced gradient-like effect with subtle border
        borderWidth: 1,
        borderColor: designTokens.colors.primary[600],
      };
    case 'secondary':
      return {
        backgroundColor: designTokens.colors.secondary[500],
        borderWidth: 1,
        borderColor: designTokens.colors.secondary[600],
      };
    case 'success':
      return {
        backgroundColor: designTokens.colors.success[500],
        borderWidth: 1,
        borderColor: designTokens.colors.success[600],
      };
    case 'error':
      return {
        backgroundColor: designTokens.colors.error[500],
        borderWidth: 1,
        borderColor: designTokens.colors.error[600],
      };
    case 'warning':
      return {
        backgroundColor: designTokens.colors.warning[500],
        borderWidth: 1,
        borderColor: designTokens.colors.warning[600],
      };
    case 'info':
      return {
        backgroundColor: designTokens.colors.info[500],
        borderWidth: 1,
        borderColor: designTokens.colors.info[600],
      };
    case 'neutral':
      return {
        backgroundColor: designTokens.colors.neutral[100],
        borderWidth: 1,
        borderColor: designTokens.colors.neutral[200],
      };
    default:
      return {};
  }
};

const getBadgeTextStyles = (variant: BadgeVariant, size: BadgeSize): TextStyle => {
  const fontSize = size === 'sm' ? designTokens.typography.fontSize.xs :
                   size === 'md' ? designTokens.typography.fontSize.sm :
                   designTokens.typography.fontSize.base;

  const color = variant === 'neutral'
    ? designTokens.semanticColors.text.primary
    : designTokens.semanticColors.text.inverse;

  return {
    fontSize,
    fontWeight: designTokens.typography.fontWeight.medium,
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
      color: designTokens.semanticColors.text.primary,
    };
  }

  return baseStyles;
};

const getIconColor = (variant: BadgeVariant): string => {
  return variant === 'neutral'
    ? designTokens.semanticColors.text.primary
    : designTokens.semanticColors.text.inverse;
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
    marginRight: designTokens.spacing[1],
  },
  deleteButton: {
    marginLeft: designTokens.spacing[1],
    padding: designTokens.spacing[0.5],
  },
});

export default Badge;