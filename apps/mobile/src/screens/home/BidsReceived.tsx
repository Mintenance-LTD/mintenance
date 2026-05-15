/**
 * BidsReceived Component
 *
 * Clean Airbnb-style bid cards with avatar, contractor info,
 * bold bid amount, and subtle review button.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { me } from '../../design-system/mint-editorial';
import { formatCurrency } from '../../utils/formatCurrency';

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
      color: me.brand,
      bg: me.brandSoft,
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
              <Ionicons name='mail-outline' size={24} color={me.brand} />
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
              <Ionicons name='arrow-forward' size={14} color={me.brand} />
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
              <Text style={styles.bidAmount}>{formatCurrency(bid.amount)}</Text>
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
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  viewAll: {
    color: me.brand,
    fontWeight: '600',
    fontSize: 14,
  },
  bidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  emptyCard: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
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
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    flex: 1,
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 2,
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: me.ink2,
  },
  emptyCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    backgroundColor: me.bg2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.brand,
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
    color: me.onBrand,
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
    color: me.ink,
  },
  jobTitle: {
    fontSize: 13,
    color: me.ink2,
  },
  bidRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  bidAmount: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  reviewButton: {
    backgroundColor: me.brand,
    borderRadius: me.radius.btn,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  reviewText: {
    color: me.onBrand,
    fontSize: 12,
    fontWeight: '600',
  },
});
