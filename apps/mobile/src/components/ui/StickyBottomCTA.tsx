/**
 * StickyBottomCTA - Sticky bottom bar with price and action button
 * Airbnb-style bottom CTA bar for detail screens.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export interface StickyBottomCTAProps {
  price?: number;
  priceLabel?: string;
  buttonText: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondaryText?: string;
  style?: ViewStyle;
  testID?: string;
}

export const StickyBottomCTA: React.FC<StickyBottomCTAProps> = memo(({
  price,
  priceLabel,
  buttonText,
  onPress,
  loading = false,
  disabled = false,
  secondaryText,
  style,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: bottomPadding },
        style,
      ]}
      testID={testID}
    >
      {price !== undefined && (
        <View style={styles.priceSection}>
          <Text style={styles.priceText}>
            {'\u00A3'}{price.toLocaleString()}
          </Text>
          {priceLabel && (
            <Text style={styles.priceLabel}>{priceLabel}</Text>
          )}
        </View>
      )}

      <View style={price !== undefined ? styles.buttonHalf : styles.buttonFull}>
        <TouchableOpacity
          style={[
            styles.button,
            disabled && styles.buttonDisabled,
          ]}
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={buttonText}
          testID={`${testID}-button`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>
        {secondaryText && (
          <Text style={styles.secondaryText}>{secondaryText}</Text>
        )}
      </View>
    </View>
  );
});

StickyBottomCTA.displayName = 'StickyBottomCTA';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  priceSection: {
    flex: 1,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  priceLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  buttonHalf: {
    flex: 1,
    alignItems: 'flex-end',
  },
  buttonFull: {
    flex: 1,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default StickyBottomCTA;
