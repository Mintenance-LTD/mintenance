/**
 * BidsReceived Component
 *
 * Displays recent bids received on homeowner jobs,
 * matching the web dashboard's "Bids Received" section.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Skeleton } from '../../components/skeletons/Skeleton';

const AVATAR_COLORS = [
  theme.colors.error, theme.colors.info, theme.colors.success, theme.colors.info,
  theme.colors.warning, theme.colors.success, theme.colors.warning, theme.colors.textSecondary,
];

const getAvatarColor = (name: string): string => {
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

const getInitial = (name: string): string => {
  return (name.charAt(0) || '?').toUpperCase();
};

interface Bid {
  id: string;
  contractorName: string;
  jobTitle: string;
  amount: number;
  status: string;
  jobId?: string;
}

const getBidLabel = (bid: Bid, allBids: Bid[]): { text: string; color: string; bg: string } | null => {
  if (allBids.length < 2) return null;
  const sorted = [...allBids].sort((a, b) => a.amount - b.amount);
  if (sorted[0].id === bid.id) return { text: 'Best Price', color: theme.colors.success, bg: theme.colors.primaryLight };
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
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.bidInfo}>
              <Skeleton width={120} height={14} borderRadius={4} />
              <Skeleton width={90} height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.bidRight}>
              <Skeleton width={60} height={22} borderRadius={4} />
              <Skeleton width={56} height={28} borderRadius={12} style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (bids.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bids Received</Text>
        </View>
        <View style={styles.emptyInline}>
          <Ionicons name='mail-open-outline' size={16} color={theme.colors.textTertiary} />
          <Text style={styles.emptyInlineText}>No bids yet</Text>
          {onViewAllPress ? (
            <TouchableOpacity onPress={onViewAllPress} accessibilityRole='button' accessibilityLabel='View your posted jobs'>
              <Text style={styles.emptyLink}>View jobs</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bids Received ({bids.length})</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} accessibilityRole="button">
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {bids.slice(0, 3).map((bid) => {
        const label = getBidLabel(bid, bids);
        return (
        <View key={bid.id} style={styles.bidCard}>
          <View style={[styles.bidAvatar, { backgroundColor: getAvatarColor(bid.contractorName) }]}>
            <Text style={styles.avatarInitial}>{getInitial(bid.contractorName)}</Text>
          </View>
          <View style={styles.bidInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.contractorName} numberOfLines={1}>{bid.contractorName}</Text>
              {label && (
                <View style={[styles.bidLabel, { backgroundColor: label.bg }]}>
                  <Text style={[styles.bidLabelText, { color: label.color }]}>{label.text}</Text>
                </View>
              )}
            </View>
            <Text style={styles.jobTitle} numberOfLines={1}>{bid.jobTitle}</Text>
          </View>
          <View style={styles.bidRight}>
            <Text style={styles.bidAmount}>£{bid.amount.toLocaleString()}</Text>
            {onReviewPress && (
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => onReviewPress(bid.id)}
                accessibilityRole="button"
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
    marginBottom: theme.spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  title: {
    fontSize: theme.typography.briefSizes.title,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  viewAll: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.briefSizes.body,
  },
  bidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.base,
  },
  emptyInlineText: {
    flex: 1,
    fontSize: theme.typography.briefSizes.body,
    color: theme.colors.textSecondary,
  },
  emptyLink: {
    fontSize: 13,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textDecorationLine: 'underline',
  },
  bidAvatar: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.spacing[5],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  avatarInitial: {
    fontSize: theme.typography.briefSizes.bodyLarge,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.white,
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
    borderRadius: theme.borderRadius.sm,
  },
  bidLabelText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
  },
  contractorName: {
    fontSize: theme.typography.briefSizes.body,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  jobTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bidRight: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing[3],
  },
  bidAmount: {
    fontSize: 22,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
  },
  reviewText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
