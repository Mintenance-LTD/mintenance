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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BidService, Bid } from '../services/BidService';
import SwipeableCardWrapper, { SwipeableCardRef } from '../components/SwipeableCardWrapper';
import type { JobsStackParamList } from '../navigation/types';
import { theme } from '../theme';

type BidReviewRouteProp = RouteProp<JobsStackParamList, 'BidReview'>;

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) {
    stars.push(<Ionicons key={i} name="star" size={14} color={theme.colors.accent} />);
  }
  if (rating % 1 !== 0) {
    stars.push(<Ionicons key="half" name="star-half" size={14} color={theme.colors.accent} />);
  }
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) {
    stars.push(<Ionicons key={`e${i}`} name="star-outline" size={14} color={theme.colors.textTertiary} />);
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
              (navigation as unknown as { navigate: (...args: unknown[]) => void }).navigate('MessagingTab', {
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
              <View style={styles.detailIconWrap}>
                <Ionicons name="time-outline" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.detailText}>Estimated: {bid.estimated_duration}</Text>
            </View>
          )}

          {/* Availability */}
          {bid.availability && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              </View>
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
          <ActivityIndicator size="large" color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Loading bids...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allReviewed || bids.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Bids</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-circle" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>All Bids Reviewed</Text>
          <Text style={styles.emptySubtitle}>You've reviewed all pending bids for this job.</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Bids</Text>
          {jobTitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{jobTitle}</Text> : null}
        </View>
        <View style={styles.bidCountChip}>
          <Text style={styles.bidCountText}>{bids.length} bids</Text>
        </View>
      </View>

      {/* Comparison Summary */}
      {bids.length > 1 && (
        <View style={styles.summaryRow}>
          {[
            { label: 'Low', value: `£${Math.min(...bids.map(b => b.amount)).toLocaleString()}`, iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight, icon: 'trending-down-outline' as const },
            { label: 'Avg', value: `£${Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length).toLocaleString()}`, iconColor: '#3B82F6', iconBg: '#DBEAFE', icon: 'analytics-outline' as const },
            { label: 'High', value: `£${Math.max(...bids.map(b => b.amount)).toLocaleString()}`, iconColor: theme.colors.error, iconBg: '#FEE2E2', icon: 'trending-up-outline' as const },
            { label: 'Top Rating', value: `${Math.max(...bids.map(b => b.contractor?.rating ?? 0)).toFixed(1)}★`, iconColor: theme.colors.accent, iconBg: theme.colors.accentLight, icon: 'star-outline' as const },
          ].map((item) => (
            <View key={item.label} style={styles.summaryItem}>
              <View style={[styles.summaryIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={14} color={item.iconColor} />
              </View>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sort Bar */}
      <View style={styles.sortRow}>
        {([['price', 'Lowest Price'], ['rating', 'Highest Rated'], ['timeline', 'Fastest']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
            onPress={() => setSortBy(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: sortBy === key }}
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
                  <Ionicons name="checkmark" size={48} color={theme.colors.primary} />
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
          <Ionicons name="checkmark" size={30} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.textInverse} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bidCountChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bidCountText: {
    fontSize: 13,
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
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
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
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 20,
    fontWeight: '700',
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
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
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
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  proposalSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rejectButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  acceptButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
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
    color: theme.colors.primary,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  goBackButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: theme.colors.textPrimary,
  },
  goBackButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  summaryItem: { alignItems: 'center' },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 11, color: theme.colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  sortChipActive: { backgroundColor: theme.colors.primary },
  sortChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  sortChipTextActive: { color: theme.colors.textInverse },
});

export default BidReviewScreen;
