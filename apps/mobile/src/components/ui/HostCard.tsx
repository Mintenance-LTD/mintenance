/**
 * HostCard - Homeowner/contractor info card
 * Airbnb-style host info card for job detail screens.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '../optimized/OptimizedImage';

export interface HostCardProps {
  avatar?: string;
  name: string;
  subtitle?: string;
  rating?: number;
  metadata?: string;
  onPress?: () => void;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  testID?: string;
}

export const HostCard: React.FC<HostCardProps> = memo(({
  avatar,
  name,
  subtitle,
  rating,
  metadata,
  onPress,
  actionLabel,
  actionIcon = 'chevron-forward',
  style,
  testID,
}) => {
  const content = (
    <View style={[styles.container, style]} testID={testID}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatar ? (
          <OptimizedImage
            source={{ uri: avatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {rating !== undefined && (
            <View style={styles.ratingInline}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}
        {metadata && (
          <Text style={styles.metadata} numberOfLines={1}>{metadata}</Text>
        )}
      </View>

      {/* Action */}
      {(onPress || actionLabel) && (
        <View style={styles.actionContainer}>
          {actionLabel && (
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          )}
          <Ionicons
            name={actionIcon}
            size={20}
            color="#717171"
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s profile`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

HostCard.displayName = 'HostCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    minHeight: 44,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  ratingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222222',
  },
  subtitle: {
    fontSize: 14,
    color: '#717171',
    marginTop: 2,
  },
  metadata: {
    fontSize: 13,
    color: '#717171',
    marginTop: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
});

export default HostCard;
