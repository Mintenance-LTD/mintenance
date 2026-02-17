/**
 * RatingBadge - Prominent star rating display with review count
 * Airbnb-style rating badge used in job cards and detail screens.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export interface RatingBadgeProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  background?: 'white' | 'transparent' | 'overlay';
  showVerified?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const RatingBadge: React.FC<RatingBadgeProps> = memo(({
  rating,
  reviewCount,
  size = 'md',
  background = 'transparent',
  showVerified = false,
  style,
  testID,
}) => {
  const sizeConfig = SIZE_CONFIGS[size];
  const bgStyle = BACKGROUND_STYLES[background];

  return (
    <View style={[styles.container, bgStyle, style]} testID={testID}>
      <Ionicons
        name="star"
        size={sizeConfig.starSize}
        color={theme.colors.ratingGold}
      />
      <Text style={[styles.ratingText, { fontSize: sizeConfig.ratingFontSize }]}>
        {rating.toFixed(2)}
      </Text>

      {reviewCount !== undefined && (
        <>
          <View style={[styles.divider, { height: sizeConfig.dividerHeight }]} />
          <Text style={[styles.reviewText, { fontSize: sizeConfig.reviewFontSize }]}>
            {reviewCount} review{reviewCount !== 1 ? 's' : ''}
          </Text>
        </>
      )}

      {showVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={sizeConfig.starSize} color={theme.colors.primary} />
          <Text style={[styles.verifiedText, { fontSize: sizeConfig.reviewFontSize }]}>
            Verified Pro
          </Text>
        </View>
      )}
    </View>
  );
});

RatingBadge.displayName = 'RatingBadge';

const SIZE_CONFIGS = {
  sm: {
    starSize: 12,
    ratingFontSize: 13,
    reviewFontSize: 12,
    dividerHeight: 12,
  },
  md: {
    starSize: 16,
    ratingFontSize: 16,
    reviewFontSize: 14,
    dividerHeight: 16,
  },
  lg: {
    starSize: 22,
    ratingFontSize: 32,
    reviewFontSize: 16,
    dividerHeight: 24,
  },
};

const BACKGROUND_STYLES: Record<string, ViewStyle> = {
  white: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 6,
  },
  reviewText: {
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default RatingBadge;
