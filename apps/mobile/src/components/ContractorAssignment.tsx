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
import { Job, Bid } from '../types';
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
  const { data: bids = [], isLoading, error, refetch } = useJobBids(job.id);
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
    } catch (error: any) {
      logger.error('Failed to accept bid:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to accept bid. Please try again.'
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
            <Ionicons name='trophy' size={14} color='#FFD700' />
            <Text style={styles.lowestBidText}>Lowest Bid</Text>
          </View>
        )}

        <View style={styles.contractorHeader}>
          <View style={styles.contractorAvatar}>
            {(bid as any).contractorAvatar ? (
              <Image
                source={{ uri: (bid as any).contractorAvatar }}
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
              {getContractorRating((bid as any).contractorRating)}
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
                    color: bid.amount <= job.budget ? '#10B981' : '#EF4444',
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

        {(bid as any).proposedTimeline && (
          <View style={styles.timeline}>
            <Ionicons
              name='time-outline'
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.timelineText}>
              Estimated completion: {(bid as any).proposedTimeline}
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
                <ActivityIndicator size='small' color='#FFFFFF' />
              ) : (
                <>
                  <Ionicons name='checkmark' size={16} color='#FFFFFF' />
                  <Text style={styles.acceptButtonText}>Accept Bid</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {bid.status === 'accepted' && (
            <View style={styles.acceptedBadge}>
              <Ionicons name='checkmark-circle' size={16} color='#10B981' />
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
          <Ionicons name='warning-outline' size={48} color='#EF4444' />
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
    marginBottom: 4,
  },
  bidCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bidsList: {
    gap: 12,
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.base,
  },
  lowestBidCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  selectedBidCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  lowestBidBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lowestBidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  contractorRating: {
    fontSize: 14,
    color: '#F59E0B',
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
    color: theme.colors.primary,
    marginBottom: 2,
  },
  budgetComparison: {
    fontSize: 12,
    fontWeight: '500',
  },
  bidDescription: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bidDescriptionText: {
    fontSize: 14,
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
    fontSize: 14,
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  viewProfileText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptButtonLoading: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  acceptedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ContractorAssignment;
