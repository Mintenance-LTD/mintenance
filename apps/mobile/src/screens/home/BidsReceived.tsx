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

const AVATAR_COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6',
  '#F39C12', '#1ABC9C', '#E67E22', '#34495E',
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
  if (sorted[0].id === bid.id) return { text: 'Best Price', color: '#15803D', bg: '#F0FDF4' };
  return null;
};

interface BidsReceivedProps {
  bids: Bid[];
  onReviewPress?: (bidId: string) => void;
  onViewAllPress?: () => void;
}

export const BidsReceived: React.FC<BidsReceivedProps> = ({
  bids,
  onReviewPress,
  onViewAllPress,
}) => {
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
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  viewAll: {
    color: '#222222',
    fontWeight: '600',
    fontSize: 14,
  },
  bidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...theme.shadows.sm,
  },
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 10,
  },
  emptyInlineText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textDecorationLine: 'underline',
  },
  bidAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderRadius: 4,
  },
  bidLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  jobTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bidRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  bidAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reviewText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
