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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { BidService, Bid } from '../services/BidService';
import { supabase } from '../config/supabase';
import SwipeableCardWrapper, {
  SwipeableCardRef,
} from '../components/SwipeableCardWrapper';
import type { JobsStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { styles } from './BidReviewStyles';
import { BidReviewCard } from './BidReviewCard';

interface QuoteLineItem {
  description: string;
  type?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
type BidQuoteMap = Record<
  string,
  {
    line_items?: QuoteLineItem[];
    tax_rate?: number;
    tax_amount?: number;
    total_amount?: number;
  }
>;

type BidReviewRouteProp = RouteProp<JobsStackParamList, 'BidReview'>;

export const BidReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BidReviewRouteProp>();
  const { user } = useAuth();
  const { jobId } = route.params;

  const [bids, setBids] = useState<Bid[]>([]);
  const [quoteMap, setQuoteMap] = useState<BidQuoteMap>({});
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
      if (data.length > 0 && data[0]?.job?.title)
        setJobTitle(data[0].job.title);

      // Fetch linked quotes for line items display
      const contractorIds = data.map((b) => b.contractor_id).filter(Boolean);
      if (contractorIds.length > 0) {
        const { data: quotes } = await supabase
          .from('contractor_quotes')
          .select(
            'contractor_id, line_items, tax_rate, tax_amount, total_amount'
          )
          .eq('job_id', jobId)
          .in('contractor_id', contractorIds);
        const map: BidQuoteMap = {};
        (quotes || []).forEach((q: Record<string, unknown>) => {
          const cid = q.contractor_id as string;
          const items = q.line_items as QuoteLineItem[] | null;
          if (cid && items?.length)
            map[cid] = {
              line_items: items,
              tax_rate: q.tax_rate as number,
              tax_amount: q.tax_amount as number,
              total_amount: q.total_amount as number,
            };
        });
        setQuoteMap(map);
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
        `You accepted ${bid.contractor?.first_name || 'the contractor'}'s bid of ${formatCurrency(bid.amount)}.`,
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
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to accept bid. Please try again.'
      );
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
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to reject bid. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleAllSwiped = () => {
    setAllReviewed(true);
  };

  const renderBidCard = (bid: Bid) => (
    <BidReviewCard bid={bid} quoteData={quoteMap[bid.contractor_id]} />
  );

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
              value: formatCurrency(Math.min(...bids.map((b) => b.amount))),
              iconColor: theme.colors.primary,
              iconBg: theme.colors.primaryLight,
              icon: 'trending-down-outline' as const,
            },
            {
              label: 'Avg',
              value: formatCurrency(
                Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length)
              ),
              iconColor: '#3B82F6',
              iconBg: '#DBEAFE',
              icon: 'analytics-outline' as const,
            },
            {
              label: 'High',
              value: formatCurrency(Math.max(...bids.map((b) => b.amount))),
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

      {/* Swipe Area — IndiGo-style fanned-deck visual: stackSize=3 so up
          to two bids peek behind the active one, with alternating
          rotation + horizontal offset per depth so the deck looks
          like a hand of cards. Single-bid case still renders a flat
          single card (no fake ghost peeks). User-asked redesign;
          deeper redesign steps (media-first card layout, gesture-
          driven swipe, accept polish) tracked separately. */}
      <View style={styles.swiperContainer}>
        <SwipeableCardWrapper
          ref={swiperRef}
          cards={sortedBids}
          renderCard={(bid: unknown) => renderBidCard(bid as Bid)}
          onSwipedRight={handleAccept}
          onSwipedLeft={handleReject}
          onSwipedAll={handleAllSwiped}
          stackSize={3}
          stackSeparation={14}
          stackRotationDeg={2}
          stackTranslateX={6}
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
