/**
 * BidReviewScreen
 *
 * Tinder-like swipe interface for homeowners to review bids on their jobs.
 * Swipe right to accept, swipe left to reject.
 * Uses existing SwipeableCardWrapper and BidService.
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { BidService, Bid } from '../services/BidService';
import SwipeableCardWrapper, { SwipeableCardRef } from '../components/SwipeableCardWrapper';
import type { JobsStackParamList } from '../navigation/types';

type BidReviewRouteProp = RouteProp<JobsStackParamList, 'BidReview'>;

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) {
    stars.push(<Ionicons key={i} name="star" size={14} color="#222222" />);
  }
  if (rating % 1 !== 0) {
    stars.push(<Ionicons key="half" name="star-half" size={14} color="#222222" />);
  }
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) {
    stars.push(<Ionicons key={`e${i}`} name="star-outline" size={14} color="#B0B0B0" />);
  }
  return stars;
}

export const BidReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BidReviewRouteProp>();
  const { user } = useAuth();
  const { jobId } = route.params;

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [allReviewed, setAllReviewed] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'timeline'>('price');
  const swiperRef = useRef<SwipeableCardRef>(null);

  const sortedBids = useMemo(() => {
    const copy = [...bids];
    if (sortBy === 'price') copy.sort((a, b) => a.amount - b.amount);
    else if (sortBy === 'rating') copy.sort((a, b) => (b.contractor?.rating ?? 0) - (a.contractor?.rating ?? 0));
    else copy.sort((a, b) => (a.estimated_duration ?? '').localeCompare(b.estimated_duration ?? ''));
    return copy;
  }, [bids, sortBy]);

  const fetchBids = useCallback(async () => {
    try {
      setLoading(true);
      const data = await BidService.getBidsByJob(jobId, 'pending');
      setBids(data);
      if (data.length === 0) setAllReviewed(true);
      // Get job title from first bid if available
      if (data.length > 0 && data[0].job?.title) {
        setJobTitle(data[0].job.title);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load bids');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const handleAccept = async (cardIndex: number) => {
    const bid = bids[cardIndex];
    if (!bid || !user?.id || processing) return;

    setProcessing(true);
    try {
      await BidService.acceptBid(bid.id, user.id);
      Alert.alert(
        'Bid Accepted',
        `You accepted ${bid.contractor?.first_name || 'the contractor'}'s bid of £${bid.amount}.`,
        [
          {
            text: 'Message Contractor',
            onPress: () => {
              navigation.navigate('MessagingTab', {
                screen: 'Messaging',
                params: {
                  conversationId: `${jobId}_${bid.contractor_id}`,
                  jobTitle: jobTitle || 'Job',
                  recipientId: bid.contractor_id,
                  recipientName: bid.contractor
                    ? `${bid.contractor.first_name} ${bid.contractor.last_name}`
                    : 'Contractor',
                },
              });
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to accept bid. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (cardIndex: number) => {
    const bid = bids[cardIndex];
    if (!bid || !user?.id || processing) return;

    setProcessing(true);
    try {
      await BidService.rejectBid(bid.id, user.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to reject bid. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAllSwiped = () => {
    setAllReviewed(true);
  };

  const renderBidCard = (bid: Bid) => {
    const contractor = bid.contractor;
    return (
      <View style={styles.bidCard}>
        <ScrollView style={styles.cardScroll} showsVerticalScrollIndicator={false}>
          {/* Contractor Header */}
          <View style={styles.contractorHeader}>
            {contractor?.profile_picture ? (
              <Image source={{ uri: contractor.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
              </View>
            )}
            <View style={styles.contractorInfo}>
              <Text style={styles.contractorName}>
                {contractor ? `${contractor.first_name} ${contractor.last_name}` : 'Contractor'}
              </Text>
              {contractor?.rating != null && (
                <View style={styles.ratingRow}>
                  <View style={styles.stars}>{renderStars(contractor.rating)}</View>
                  <Text style={styles.ratingText}>
                    {contractor.rating.toFixed(1)} ({contractor.reviews_count || 0} reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bid Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Bid Amount</Text>
            <Text style={styles.amountValue}>£{bid.amount.toLocaleString()}</Text>
          </View>

          {/* Estimated Duration */}
          {bid.estimated_duration && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>Estimated: {bid.estimated_duration}</Text>
            </View>
          )}

          {/* Availability */}
          {bid.availability && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>Available: {bid.availability}</Text>
            </View>
          )}

          {/* Proposal Message */}
          <View style={styles.proposalSection}>
            <Text style={styles.proposalLabel}>Proposal</Text>
            <Text style={styles.proposalText}>{bid.message}</Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading bids...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allReviewed || bids.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Bids</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
          <Text style={styles.emptyTitle}>All Bids Reviewed</Text>
          <Text style={styles.emptySubtitle}>You've reviewed all pending bids for this job.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Bids</Text>
          {jobTitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{jobTitle}</Text> : null}
        </View>
        <Text style={styles.bidCount}>{bids.length} bids</Text>
      </View>

      {/* Comparison Summary */}
      {bids.length > 1 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Low</Text>
            <Text style={styles.summaryValue}>£{Math.min(...bids.map(b => b.amount)).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avg</Text>
            <Text style={styles.summaryValue}>£{Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>High</Text>
            <Text style={styles.summaryValue}>£{Math.max(...bids.map(b => b.amount)).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Top Rating</Text>
            <Text style={styles.summaryValue}>{Math.max(...bids.map(b => b.contractor?.rating ?? 0)).toFixed(1)}★</Text>
          </View>
        </View>
      )}

      {/* Sort Bar */}
      <View style={styles.sortRow}>
        {([['price', 'Lowest Price'], ['rating', 'Highest Rated'], ['timeline', 'Fastest']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
            onPress={() => setSortBy(key)}
          >
            <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipe Area */}
      <View style={styles.swiperContainer}>
        <SwipeableCardWrapper
          ref={swiperRef}
          cards={sortedBids}
          renderCard={(bid: unknown) => renderBidCard(bid as Bid)}
          onSwipedRight={handleAccept}
          onSwipedLeft={handleReject}
          onSwipedAll={handleAllSwiped}
          stackSize={2}
          overlayLabels={{
            left: {
              element: (
                <View style={styles.overlayPass}>
                  <Ionicons name="close" size={48} color={theme.colors.error} />
                  <Text style={styles.overlayPassText}>PASS</Text>
                </View>
              ),
            },
            right: {
              element: (
                <View style={styles.overlayAccept}>
                  <Ionicons name="checkmark" size={48} color={theme.colors.success} />
                  <Text style={styles.overlayAcceptText}>ACCEPT</Text>
                </View>
              ),
            },
          }}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => swiperRef.current?.swipeLeft()}
          disabled={processing}
          accessibilityRole="button"
          accessibilityLabel="Reject this bid"
        >
          <Ionicons name="close" size={30} color={theme.colors.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => swiperRef.current?.swipeRight()}
          disabled={processing}
          accessibilityRole="button"
          accessibilityLabel="Accept this bid"
        >
          <Ionicons name="checkmark" size={30} color={theme.colors.success} />
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.white} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bidCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  swiperContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bidCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    ...theme.shadows.base,
  },
  cardScroll: {
    flex: 1,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 14,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  amountSection: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  proposalSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  proposalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  proposalText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  rejectButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.base,
  },
  acceptButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.base,
  },
  overlayPass: {
    alignItems: 'center',
  },
  overlayPassText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.error,
  },
  overlayAccept: {
    alignItems: 'center',
  },
  overlayAcceptText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.success,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlayDark30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 2 },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sortChipActive: { borderColor: '#222222', backgroundColor: '#222222' },
  sortChipText: { fontSize: 12, fontWeight: '500', color: theme.colors.textSecondary },
  sortChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
});

export default BidReviewScreen;
