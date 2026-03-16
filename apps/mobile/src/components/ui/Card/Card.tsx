import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  Platform,
} from 'react-native';
import { theme } from '../../../theme';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPress?: TouchableOpacityProps['onPress'];
  onLongPress?: TouchableOpacityProps['onLongPress'];
  activeOpacity?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none';
  testID?: string;
}

const PADDING_MAP: Record<Exclude<CardPadding, 'none'>, number> = { sm: 12, md: 20, lg: 24, xl: 32 };

export const Card: React.FC<CardProps> = ({
  children, variant = 'elevated', padding = 'md', interactive = false, disabled = false, style,
  onPress, onLongPress, activeOpacity = 0.7, accessibilityLabel, accessibilityHint, accessibilityRole, testID,
}) => {
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [isPressed, setIsPressed] = useState(false);

  const cardStyles = getCardStyles(variant, padding, disabled, isPressed);

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    Animated.spring(scaleAnimation, { toValue: 0.99, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnimation, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };

  if (interactive || onPress || onLongPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnimation }] }}>
        <TouchableOpacity
          style={[cardStyles, style]} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}
          onLongPress={onLongPress} disabled={disabled} activeOpacity={1} accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint} accessibilityRole={accessibilityRole || 'button'}
          accessibilityState={{ disabled, selected: isPressed }} testID={testID}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={[cardStyles, style]} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} accessibilityRole={accessibilityRole} testID={testID}>
      {children}
    </View>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

export const CardBody: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.body, style]}>{children}</View>
);

export const CardFooter: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

export const JobCard: React.FC<CardProps> = (props) => (
  <Card {...props} variant="elevated" padding="md" interactive style={StyleSheet.flatten([styles.jobCard, props.style])} />
);

export const ContractorCard: React.FC<CardProps> = (props) => (
  <Card {...props} variant="elevated" padding="md" interactive style={StyleSheet.flatten([styles.contractorCard, props.style])} />
);

export const StatCard: React.FC<CardProps> = (props) => (
  <Card {...props} variant="filled" padding="lg" style={StyleSheet.flatten([styles.statCard, props.style])} />
);

const getCardStyles = (variant: CardVariant, padding: CardPadding, disabled: boolean, isPressed: boolean): ViewStyle => {
  const baseStyle: ViewStyle = { borderRadius: 16, overflow: 'hidden' };
  if (padding !== 'none') baseStyle.padding = PADDING_MAP[padding];

  const shadow = Platform.select({
    ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
    android: { elevation: 2 },
  });

  switch (variant) {
    case 'elevated':
      return { ...baseStyle, backgroundColor: theme.colors.surface, ...shadow, opacity: disabled ? 0.5 : 1 };
    case 'outlined':
      return { ...baseStyle, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, opacity: disabled ? 0.5 : 1 };
    case 'filled':
      return { ...baseStyle, backgroundColor: isPressed ? theme.colors.border : theme.colors.backgroundSecondary, opacity: disabled ? 0.5 : 1 };
    default:
      return baseStyle;
  }
};

const styles = StyleSheet.create({
  header: { marginBottom: 12, paddingBottom: 12 },
  body: { flex: 1 },
  footer: { marginTop: 12, paddingTop: 12 },
  jobCard: { marginVertical: 8, marginHorizontal: 16 },
  contractorCard: { marginVertical: 8, marginHorizontal: 16 },
  statCard: { flex: 1, margin: 8, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
});

export default Card;
