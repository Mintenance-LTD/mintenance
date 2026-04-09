/**
 * BidsReceived Component
 *
 * Clean Airbnb-style bid cards with avatar, contractor info,
 * bold bid amount, and subtle review button.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { theme } from '../../theme';

const AVATAR_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#6B7280',
];

const getAvatarColor = (name: string): string => {
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length] ?? '#6B7280';
};

const getInitial = (name: string): string =>
  (name.charAt(0) || '?').toUpperCase();

interface Bid {
  id: string;
  contractorName: string;
  jobTitle: string;
  amount: number;
  status: string;
  jobId?: string;
}

const getBidLabel = (
  bid: Bid,
  allBids: Bid[]
): { text: string; color: string; bg: string } | null => {
  if (allBids.length < 2) return null;
  const sorted = [...allBids].sort((a, b) => a.amount - b.amount);
  if (sorted[0]?.id === bid.id)
    return {
      text: 'Best Price',
      color: theme.colors.primary,
      bg: theme.colors.primaryLight,
    };
  return null;
};

interface BidsReceivedProps {
  isLoading?: boolean;
  bids: Bid[];
  onReviewPress?: (bidId: string) => void;
  onViewAllPress?: () => void;
}

export const BidsReceived: React.FC<BidsReceivedProps> = ({
  isLoading,
  bids,
  onReviewPress,
  onViewAllPress,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bids Received</Text>
        </View>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.bidCard}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={styles.bidInfo}>
              <Skeleton width={120} height={14} borderRadius={4} />
              <Skeleton
                width={90}
                height={12}
                borderRadius={4}
                style={{ marginTop: 4 }}
              />
            </View>
            <View style={styles.bidRight}>
              <Skeleton width={60} height={22} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (bids.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyCardLeft}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name='mail-outline'
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.emptyCardText}>
              <Text style={styles.emptyCardTitle}>Bids Received</Text>
              <Text style={styles.emptyCardSubtitle}>
                No bids yet for your open requests
              </Text>
            </View>
          </View>
          {onViewAllPress && (
            <TouchableOpacity
              style={styles.emptyCardButton}
              onPress={onViewAllPress}
              accessibilityRole='button'
              accessibilityLabel='View your posted jobs'
            >
              <Text style={styles.emptyCardButtonText}>View jobs</Text>
              <Ionicons
                name='arrow-forward'
                size={14}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bids Received</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} accessibilityRole='button'>
            <Text style={styles.viewAll}>View All ({bids.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {bids.slice(0, 3).map((bid) => {
        const label = getBidLabel(bid, bids);
        return (
          <View key={bid.id} style={styles.bidCard}>
            <View
              style={[
                styles.bidAvatar,
                { backgroundColor: getAvatarColor(bid.contractorName) },
              ]}
            >
              <Text style={styles.avatarInitial}>
                {getInitial(bid.contractorName)}
              </Text>
            </View>
            <View style={styles.bidInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.contractorName} numberOfLines={1}>
                  {bid.contractorName}
                </Text>
                {label && (
                  <View
                    style={[styles.bidLabel, { backgroundColor: label.bg }]}
                  >
                    <Text style={[styles.bidLabelText, { color: label.color }]}>
                      {label.text}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {bid.jobTitle}
              </Text>
            </View>
            <View style={styles.bidRight}>
              <Text style={styles.bidAmount}>
                £{bid.amount.toLocaleString()}
              </Text>
              {onReviewPress && (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => onReviewPress(bid.id)}
                  accessibilityRole='button'
                  accessibilityLabel={`Review bid from ${bid.contractorName}`}
                >
                  <Text style={styles.reviewText}>Review</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAll: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  emptyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    flex: 1,
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  bidAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  bidInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bidLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bidLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  contractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  jobTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bidRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  reviewText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
});
