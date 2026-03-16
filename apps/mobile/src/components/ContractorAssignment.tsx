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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, Bid } from '@mintenance/types';

interface BidWithExtras extends Bid {
  contractorAvatar?: string;
  contractorRating?: number;
  proposedTimeline?: string;
}
import { useJobBids, useAcceptBid } from '../hooks/useJobs';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { theme } from '../theme';

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
            <Ionicons name='trophy' size={14} color={theme.colors.accent} />
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
                    color: bid.amount <= job.budget ? theme.colors.primary : theme.colors.error,
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
              <Ionicons name='checkmark-circle' size={16} color={theme.colors.primary} />
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
          <ActivityIndicator size='large' color={theme.colors.textPrimary} />
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  bidCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bidsList: {
    gap: 12,
  },
  bidCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  lowestBidCard: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  selectedBidCard: {
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
  },
  lowestBidBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lowestBidText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorAvatar: {
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  contractorRating: {
    fontSize: 13,
    color: theme.colors.accent,
    marginBottom: 2,
  },
  bidTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  bidAmount: {
    alignItems: 'flex-end',
  },
  bidPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  budgetComparison: {
    fontSize: 12,
    fontWeight: '500',
  },
  bidDescription: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  bidDescriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timelineText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.textPrimary,
  },
  viewProfileText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
  },
  acceptedText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ContractorAssignment;
