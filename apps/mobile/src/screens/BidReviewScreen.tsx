/**
 * BidReviewScreen
 *
 * Tinder-like swipe interface for homeowners to review bids on their jobs.
 * Swipe right to accept, swipe left to reject.
 * Uses existing SwipeableCardWrapper and BidService.
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
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
import { useAuth } from '../contexts/AuthContext';
import { BidService, Bid } from '../services/BidService';
import SwipeableCardWrapper, {
  SwipeableCardRef,
} from '../components/SwipeableCardWrapper';
import type { JobsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { styles } from './BidReviewStyles';

type BidReviewRouteProp = RouteProp<JobsStackParamList, 'BidReview'>;

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) {
    stars.push(
      <Ionicons key={i} name='star' size={14} color={theme.colors.accent} />
    );
  }
  if (rating % 1 !== 0) {
    stars.push(
      <Ionicons
        key='half'
        name='star-half'
        size={14}
        color={theme.colors.accent}
      />
    );
  }
  const empty = 5 - Math.ceil(rating);
  for (let i = 0; i < empty; i++) {
    stars.push(
      <Ionicons
        key={`e${i}`}
        name='star-outline'
        size={14}
        color={theme.colors.textTertiary}
      />
    );
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
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'timeline'>(
    'price'
  );
  const swiperRef = useRef<SwipeableCardRef>(null);

  const sortedBids = useMemo(() => {
    const copy = [...bids];
    if (sortBy === 'price') copy.sort((a, b) => a.amount - b.amount);
    else if (sortBy === 'rating')
      copy.sort(
        (a, b) => (b.contractor?.rating ?? 0) - (a.contractor?.rating ?? 0)
      );
    else
      copy.sort((a, b) =>
        (a.estimated_duration ?? '').localeCompare(b.estimated_duration ?? '')
      );
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
              (
                navigation as unknown as {
                  navigate: (...args: unknown[]) => void;
                }
              ).navigate('MessagingTab', {
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
    const avatarUri =
      contractor?.profile_picture || contractor?.profile_image_url;
    const truncatedBio = contractor?.bio
      ? contractor.bio.length > 100
        ? `${contractor.bio.slice(0, 100)}...`
        : contractor.bio
      : null;

    return (
      <View style={styles.bidCard}>
        <ScrollView
          style={styles.cardScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Contractor Header — tappable to view profile */}
          <TouchableOpacity
            style={styles.contractorHeader}
            onPress={() =>
              contractor?.id &&
              (navigation as ReturnType<typeof Object>).navigate(
                'ContractorProfile',
                { contractorId: contractor.id }
              )
            }
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={`View ${contractor?.first_name || 'contractor'}'s profile`}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons
                  name='person-circle-outline'
                  size={48}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}
            <View style={styles.contractorInfo}>
              <Text style={styles.contractorName}>
                {contractor
                  ? `${contractor.first_name} ${contractor.last_name}`
                  : 'Contractor'}
              </Text>
              {contractor?.company_name ? (
                <Text style={styles.companyName}>
                  {contractor.company_name}
                </Text>
              ) : null}
              {contractor?.rating != null && (
                <View style={styles.ratingRow}>
                  <View style={styles.stars}>
                    {renderStars(contractor.rating)}
                  </View>
                  <Text style={styles.ratingText}>
                    {contractor.rating.toFixed(1)} (
                    {contractor.reviews_count || 0} reviews)
                  </Text>
                </View>
              )}
              {contractor?.city ? (
                <View style={styles.locationRow}>
                  <Ionicons
                    name='location-outline'
                    size={13}
                    color={theme.colors.textTertiary}
                  />
                  <Text style={styles.locationText}>{contractor.city}</Text>
                </View>
              ) : null}
              <Text style={styles.viewProfileLink}>View Full Profile →</Text>
            </View>
          </TouchableOpacity>

          {/* Bio Snippet */}
          {truncatedBio ? (
            <Text style={styles.bioText}>{truncatedBio}</Text>
          ) : null}

          {/* Bid Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Bid Amount</Text>
            <Text style={styles.amountValue}>
              £{bid.amount.toLocaleString()}
            </Text>
          </View>

          {/* Contractor Stats Row */}
          {(contractor?.hourly_rate != null ||
            contractor?.years_experience != null) && (
            <View style={styles.statsRow}>
              {contractor?.hourly_rate != null && (
                <View style={styles.statChip}>
                  <Ionicons
                    name='cash-outline'
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.statText}>
                    £{contractor.hourly_rate}/hr
                  </Text>
                </View>
              )}
              {contractor?.years_experience != null && (
                <View style={styles.statChip}>
                  <Ionicons
                    name='construct-outline'
                    size={14}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.statText}>
                    {contractor.years_experience} yrs exp
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Estimated Duration */}
          {bid.estimated_duration && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name='time-outline' size={16} color='#3B82F6' />
              </View>
              <Text style={styles.detailText}>
                Estimated: {bid.estimated_duration}
              </Text>
            </View>
          )}

          {/* Availability */}
          {bid.availability && (
            <View style={styles.detailRow}>
              <View
                style={[
                  styles.detailIconWrap,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Ionicons
                  name='calendar-outline'
                  size={16}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.detailText}>
                Available: {bid.availability}
              </Text>
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
          <ActivityIndicator size='large' color={theme.colors.textPrimary} />
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
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <Ionicons
              name='arrow-back'
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Bids</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name='checkmark-circle'
              size={36}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>All Bids Reviewed</Text>
          <Text style={styles.emptySubtitle}>
            You've reviewed all pending bids for this job.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
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
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Bids</Text>
          {jobTitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {jobTitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.bidCountChip}>
          <Text style={styles.bidCountText}>{bids.length} bids</Text>
        </View>
      </View>

      {/* Comparison Summary */}
      {bids.length > 1 && (
        <View style={styles.summaryRow}>
          {[
            {
              label: 'Low',
              value: `£${Math.min(...bids.map((b) => b.amount)).toLocaleString()}`,
              iconColor: theme.colors.primary,
              iconBg: theme.colors.primaryLight,
              icon: 'trending-down-outline' as const,
            },
            {
              label: 'Avg',
              value: `£${Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length).toLocaleString()}`,
              iconColor: '#3B82F6',
              iconBg: '#DBEAFE',
              icon: 'analytics-outline' as const,
            },
            {
              label: 'High',
              value: `£${Math.max(...bids.map((b) => b.amount)).toLocaleString()}`,
              iconColor: theme.colors.error,
              iconBg: '#FEE2E2',
              icon: 'trending-up-outline' as const,
            },
            {
              label: 'Top Rating',
              value: `${Math.max(...bids.map((b) => b.contractor?.rating ?? 0)).toFixed(1)}★`,
              iconColor: theme.colors.accent,
              iconBg: theme.colors.accentLight,
              icon: 'star-outline' as const,
            },
          ].map((item) => (
            <View key={item.label} style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIconWrap,
                  { backgroundColor: item.iconBg },
                ]}
              >
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
        {(
          [
            ['price', 'Lowest Price'],
            ['rating', 'Highest Rated'],
            ['timeline', 'Fastest'],
          ] as const
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
            onPress={() => setSortBy(key)}
            accessibilityRole='button'
            accessibilityState={{ selected: sortBy === key }}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === key && styles.sortChipTextActive,
              ]}
            >
              {label}
            </Text>
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
                  <Ionicons name='close' size={48} color={theme.colors.error} />
                  <Text style={styles.overlayPassText}>PASS</Text>
                </View>
              ),
            },
            right: {
              element: (
                <View style={styles.overlayAccept}>
                  <Ionicons
                    name='checkmark'
                    size={48}
                    color={theme.colors.primary}
                  />
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
          accessibilityRole='button'
          accessibilityLabel='Reject this bid'
        >
          <Ionicons name='close' size={30} color={theme.colors.error} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => swiperRef.current?.swipeRight()}
          disabled={processing}
          accessibilityRole='button'
          accessibilityLabel='Accept this bid'
        >
          <Ionicons name='checkmark' size={30} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size='small' color={theme.colors.textInverse} />
        </View>
      )}
    </SafeAreaView>
  );
};

export default BidReviewScreen;
