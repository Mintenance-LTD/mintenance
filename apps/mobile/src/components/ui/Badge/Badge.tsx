import React, { useState } from 'react';
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

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
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

const VARIANT_BG: Record<BadgeVariant, string> = {
  primary: '#E0E7FF',
  secondary: '#F3F4F6',
  success: theme.colors.primaryLight,
  error: '#FEE2E2',
  warning: theme.colors.accentLight,
  info: '#DBEAFE',
  neutral: theme.colors.backgroundSecondary,
};

const VARIANT_TEXT: Record<BadgeVariant, string> = {
  primary: '#3730A3',
  secondary: '#374151',
  success: '#065F46',
  error: '#991B1B',
  warning: '#92400E',
  info: '#1E40AF',
  neutral: theme.colors.textPrimary,
};

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
  const iconColor = VARIANT_TEXT[variant];
  const iconSz = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

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
          size={iconSz}
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
          accessibilityRole='button'
          accessibilityLabel={
            typeof children === 'string' ? children : undefined
          }
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
      accessibilityRole='text'
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

interface ChipProps extends BadgeProps {
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
  const iconColor = VARIANT_TEXT[variant];
  const iconSz = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  const renderContent = () => (
    <View style={styles.chipContent}>
      {icon && (
        <Ionicons
          name={icon}
          size={iconSz}
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
          accessibilityRole='button'
          accessibilityLabel='Remove'
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={deleteIcon} size={iconSz} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[chipStyles, style]}
        onPress={onPress}
        accessibilityRole='button'
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
      accessibilityRole='text'
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      testID={testID}
    >
      {renderContent()}
    </View>
  );
};

interface NotificationBadgeProps {
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
  if (count === 0 && !showZero) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const notificationStyles = getNotificationBadgeStyles(size);

  return (
    <View
      style={[notificationStyles, getBadgeStyles(variant, size, true), style]}
      accessibilityRole='text'
      accessibilityLabel={`${count} notification${count !== 1 ? 's' : ''}`}
      testID={testID}
    >
      <Text style={getBadgeTextStyles(variant, size)} numberOfLines={1}>
        {displayCount}
      </Text>
    </View>
  );
};

const getBadgeStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  rounded: boolean
): ViewStyle => {
  const sizeStyles = getSizeStyles(size);
  return {
    ...sizeStyles,
    backgroundColor: VARIANT_BG[variant],
    borderRadius: rounded ? 100 : 16,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  };
};

const getChipStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  selected: boolean
): ViewStyle => ({
  ...getBadgeStyles(variant, size, true),
  borderWidth: selected ? 0 : 1,
  borderColor: selected ? 'transparent' : theme.colors.border,
});

const getSizeStyles = (size: BadgeSize): ViewStyle => {
  switch (size) {
    case 'sm':
      return { paddingHorizontal: 8, paddingVertical: 2, minHeight: 20 };
    case 'md':
      return { paddingHorizontal: 12, paddingVertical: 4, minHeight: 24 };
    case 'lg':
      return { paddingHorizontal: 16, paddingVertical: 6, minHeight: 32 };
    default:
      return {};
  }
};

const getBadgeTextStyles = (
  variant: BadgeVariant,
  size: BadgeSize
): TextStyle => ({
  fontSize: size === 'sm' ? 12 : size === 'md' ? 13 : 15,
  fontWeight: '500',
  color: VARIANT_TEXT[variant],
  textAlign: 'center',
});

const getChipTextStyles = (
  variant: BadgeVariant,
  size: BadgeSize,
  selected: boolean
): TextStyle => {
  const base = getBadgeTextStyles(variant, size);
  if (!selected && variant === 'neutral')
    return { ...base, color: theme.colors.textPrimary };
  return base;
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
  icon: { marginRight: 4 },
  deleteButton: { marginLeft: 4, padding: 2 },
});
