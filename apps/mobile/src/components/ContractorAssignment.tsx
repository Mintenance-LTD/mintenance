import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Job, Bid } from '@mintenance/types';

interface BidWithExtras extends Bid {
  contractorAvatar?: string;
  contractorRating?: number;
  proposedTimeline?: string;
}
import { useJobBids, useAcceptBid } from '../hooks/useJobs';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

interface ContractorAssignmentProps {
  job: Job;
  onContractorAssigned?: (contractorId: string, bidId: string) => void;
}

export const ContractorAssignment: React.FC<ContractorAssignmentProps> = ({
  job,
  onContractorAssigned,
}) => {
  const { user } = useAuth();
  const [selectedBid, setSelectedBid] = useState<string | null>(null);

  // Get bids for this job
  const { data: bidsData = [], isLoading, error, refetch } = useJobBids(job.id);
  const bids = bidsData as Bid[];
  const acceptBidMutation = useAcceptBid();

  const isHomeowner = user?.role === 'homeowner';
  const canAssignContractor = isHomeowner && job.status === 'posted';

  const handleAcceptBid = (bid: Bid) => {
    Alert.alert(
      'Accept Bid',
      `Accept bid from ${bid.contractorName || 'this contractor'} for £${bid.amount}?\n\nThis will assign them to the job and change the status to "Assigned".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Bid',
          style: 'default',
          onPress: () => confirmAcceptBid(bid),
        },
      ]
    );
  };

  const confirmAcceptBid = async (bid: Bid) => {
    try {
      logger.info('Accepting bid', {
        jobId: job.id,
        bidId: bid.id,
        contractorId: bid.contractorId,
        amount: bid.amount,
      });

      setSelectedBid(bid.id);
      await acceptBidMutation.mutateAsync(bid.id);

      Alert.alert(
        'Success!',
        `Bid accepted! ${bid.contractorName || 'The contractor'} has been assigned to your job.`,
        [{ text: 'OK' }]
      );

      if (onContractorAssigned) {
        onContractorAssigned(bid.contractorId, bid.id);
      }
    } catch (error) {
      logger.error('Failed to accept bid:', error);
      Alert.alert(
        'Error',
        (error instanceof Error ? error.message : String(error)) || 'Failed to accept bid. Please try again.'
      );
    } finally {
      setSelectedBid(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getContractorRating = (rating?: number) => {
    if (!rating) return 'No rating';
    return `★ ${rating.toFixed(1)}`;
  };

  const renderBidCard = ({ item: bid }: { item: Bid }) => {
    const isLowestBid =
      bids.length > 1 &&
      bid.amount === Math.min(...bids.map((b: Bid) => b.amount));
    const isSelected = selectedBid === bid.id;

    return (
      <View
        style={[
          styles.bidCard,
          isLowestBid && styles.lowestBidCard,
          isSelected && styles.selectedBidCard,
        ]}
      >
        {isLowestBid && (
          <View style={styles.lowestBidBadge}>
            <Ionicons name='trophy' size={14} color={theme.colors.warning} />
            <Text style={styles.lowestBidText}>Lowest Bid</Text>
          </View>
        )}

        <View style={styles.contractorHeader}>
          <View style={styles.contractorAvatar}>
            {(bid as BidWithExtras).contractorAvatar ? (
              <Image
                source={{ uri: (bid as BidWithExtras).contractorAvatar }}
                style={styles.avatar}
              />
            ) : (
              <Ionicons
                name='person-circle'
                size={40}
                color={theme.colors.textTertiary}
              />
            )}
          </View>

          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>
              {bid.contractorName || 'Anonymous Contractor'}
            </Text>
            <Text style={styles.contractorRating}>
              {getContractorRating((bid as BidWithExtras).contractorRating)}
            </Text>
            <Text style={styles.bidTime}>{formatTimeAgo(bid.createdAt)}</Text>
          </View>

          <View style={styles.bidAmount}>
            <Text style={styles.bidPrice}>£{bid.amount}</Text>
            {job.budget && (
              <Text
                style={[
                  styles.budgetComparison,
                  {
                    color: bid.amount <= job.budget ? theme.colors.success : theme.colors.error,
                  },
                ]}
              >
                {bid.amount <= job.budget ? 'Within budget' : 'Over budget'}
              </Text>
            )}
          </View>
        </View>

        {bid.description && (
          <View style={styles.bidDescription}>
            <Text style={styles.bidDescriptionText}>{bid.description}</Text>
          </View>
        )}

        {(bid as BidWithExtras).proposedTimeline && (
          <View style={styles.timeline}>
            <Ionicons
              name='time-outline'
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.timelineText}>
              Estimated completion: {(bid as BidWithExtras).proposedTimeline}
            </Text>
          </View>
        )}

        <View style={styles.bidActions}>
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => {
              // Navigate to contractor profile
              logger.info('View contractor profile', {
                contractorId: bid.contractorId,
              });
            }}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>

          {canAssignContractor && bid.status === 'pending' && (
            <TouchableOpacity
              style={[
                styles.acceptButton,
                isSelected && styles.acceptButtonLoading,
              ]}
              onPress={() => handleAcceptBid(bid)}
              disabled={isSelected || acceptBidMutation.isPending}
            >
              {isSelected && acceptBidMutation.isPending ? (
                <ActivityIndicator size='small' color={theme.colors.textInverse} />
              ) : (
                <>
                  <Ionicons name='checkmark' size={16} color={theme.colors.textInverse} />
                  <Text style={styles.acceptButtonText}>Accept Bid</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {bid.status === 'accepted' && (
            <View style={styles.acceptedBadge}>
              <Ionicons name='checkmark-circle' size={16} color={theme.colors.success} />
              <Text style={styles.acceptedText}>Accepted</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name='document-text-outline'
        size={48}
        color={theme.colors.textTertiary}
      />
      <Text style={styles.emptyTitle}>No Bids Yet</Text>
      <Text style={styles.emptyDescription}>
        Contractors haven't submitted bids for this job yet.
        {'\n'}Check back later or share your job to attract more contractors.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Contractor Bids</Text>
      {bids.length > 0 && (
        <Text style={styles.bidCount}>
          {bids.length} bid{bids.length === 1 ? '' : 's'} received
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading bids...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name='warning-outline' size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Failed to load bids</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      {bids.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={bids}
          renderItem={renderBidCard}
          keyExtractor={(bid) => bid.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bidsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  bidCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bidsList: {
    gap: theme.spacing[3],
  },
  bidCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.base,
  },
  lowestBidCard: {
    borderColor: theme.colors.warning,
    borderWidth: 2,
  },
  selectedBidCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  lowestBidBadge: {
    position: 'absolute',
    top: -8,
    left: theme.spacing.md,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  lowestBidText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  contractorAvatar: {
    marginRight: theme.spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  contractorRating: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.warning,
    marginBottom: 2,
  },
  bidTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  bidAmount: {
    alignItems: 'flex-end',
  },
  bidPrice: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  budgetComparison: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bidDescription: {
    marginBottom: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bidDescriptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing[3],
  },
  timelineText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewProfileButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  viewProfileText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
  },
  acceptedText: {
    color: theme.colors.success,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: theme.spacing['2xl'],
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[3],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default ContractorAssignment;
