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

interface Bid {
  id: string;
  contractorName: string;
  jobTitle: string;
  amount: number;
  status: string;
  jobId?: string;
}

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

      {bids.slice(0, 3).map((bid) => (
        <View key={bid.id} style={styles.bidCard}>
          <View style={styles.bidAvatar}>
            <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.bidInfo}>
            <Text style={styles.contractorName} numberOfLines={1}>{bid.contractorName}</Text>
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
      ))}
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
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bidInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
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
    fontSize: 16,
    fontWeight: '700',
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
