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
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { queryKeys } from '../lib/queryClient';
import { BidService, Bid } from '../services/BidService';
// 2026-05-26 audit-59 P2: direct supabase contractor_quotes read removed.
// /api/jobs/:id/bids already embeds the linked quote via the
// bids.quote_id FK (see bids/route.ts:89). Reading the table directly
// here was the wrong source of truth — if a contractor had multiple
// quotes on the same job, the contractor_id+job_id lookup could pick
// the wrong row.
import SwipeableCardWrapper, {
  SwipeableCardRef,
} from '../components/SwipeableCardWrapper';
import type { JobsStackParamList } from '../navigation/types';
import { me } from '../design-system/mint-editorial';
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

  // Step 4d: undo banner state. Holds the just-rejected bid + a
  // dismiss timer ref. Server gives a 60s undo window; we surface
  // the snackbar for ~5s, after which it auto-dismisses (the bid
  // stays rejected in the DB regardless).
  const [recentlyRejected, setRecentlyRejected] = useState<Bid | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setRecentlyRejected(null);
  }, []);

  const queryClient = useQueryClient();
  // 2026-06-06 audit: BidReview previously mutated bid state then
  // goBack()'d without invalidating any cache, so JobDetails + JobsList
  // kept showing the pre-accept "posted" state (and "View N Bids" CTA)
  // until a manual refresh. Invalidate the job detail, its bids, and the
  // job lists after every accept/reject/undo so the next render is fresh.
  const invalidateJobCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.bids(jobId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
  }, [queryClient, jobId]);

  // Brief check-mark celebration on bid accept (~720ms total).
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const triggerAcceptCelebration = useCallback(
    () =>
      new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(280),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 240,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => resolve());
      }),
    [celebrationAnim]
  );

  const sortedBids = useMemo(() => {
    const copy = [...bids];
    if (sortBy === 'price') copy.sort((a, b) => a.amount - b.amount);
    else if (sortBy === 'rating')
      copy.sort(
        (a, b) => (b.contractor?.rating ?? 0) - (a.contractor?.rating ?? 0)
      );
    else {
      // 2026-05-26 audit-59 P2: previously sorted by `estimated_duration`
      // (string) which the API never returns — the field is
      // `estimated_duration_days` (number). The string-compare on
      // two undefineds left the deck order untouched. Sort by the
      // numeric days field, ascending, missing values to the end.
      copy.sort((a, b) => {
        const ad =
          (a as unknown as { estimated_duration_days?: number })
            .estimated_duration_days ?? Number.MAX_SAFE_INTEGER;
        const bd =
          (b as unknown as { estimated_duration_days?: number })
            .estimated_duration_days ?? Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
    }
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

      // 2026-05-26 audit-59 P2: read the embedded quote from each
      // bid (the API joins via bids.quote_id FK), keyed by
      // contractor_id since the card lookup site uses that key.
      // supabase-js types the join as PropertyRow[] | PropertyRow
      // depending on cardinality; handle both. Falls back to the
      // direct fields on bid (total_amount, line_items) if a future
      // bid carries the quote inline rather than via the join.
      const map: BidQuoteMap = {};
      for (const b of data) {
        const cid = b.contractor_id;
        if (!cid) continue;
        const rawQuote = (b as unknown as { quote?: unknown }).quote;
        const quote = Array.isArray(rawQuote)
          ? (rawQuote[0] as Record<string, unknown> | undefined)
          : (rawQuote as Record<string, unknown> | undefined);
        const items = quote?.line_items as QuoteLineItem[] | undefined;
        if (items && items.length > 0) {
          map[cid] = {
            line_items: items,
            tax_rate: quote?.tax_rate as number | undefined,
            tax_amount: quote?.tax_amount as number | undefined,
            total_amount: quote?.total_amount as number | undefined,
          };
        }
      }
      setQuoteMap(map);
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
    // 2026-05-26 audit-51 P0: previously indexed into the unsorted
    // `bids` array. The swipe deck renders `sortedBids` (see
    // <SwipeCards cards={sortedBids} /> below), so when the homeowner
    // sorted by rating / timeline / price, the cardIndex coming back
    // from the deck pointed at a DIFFERENT bid than the one they
    // visually swiped. Result: the wrong contractor got accepted /
    // rejected. Read from sortedBids to keep the deck and the
    // mutation in lockstep.
    const bid = sortedBids[cardIndex];
    if (!bid || !user?.id || processing) return;

    setProcessing(true);
    try {
      // Audit step 11 (2026-04-29): pass jobId explicitly so the
      // mutation route can be addressed without a server-side bid →
      // job lookup. `jobId` comes from `route.params` above.
      await BidService.acceptBid(bid.id, jobId);
      invalidateJobCaches();
      // Fire the celebration overlay first so the user sees a clear
      // "accepted" beat before the modal Alert; awaited so the alert
      // doesn't pop on top of the fade-in.
      await triggerAcceptCelebration();
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
                  // 2026-05-23 audit-16 P1: conversationId IS the jobId
                  // across the app. MessagingScreen destructures
                  // `conversationId: jobId` and hits
                  // /api/messages/threads/<jobId>/messages — that
                  // endpoint resolves a thread directly off `jobs`.
                  // The previous `${jobId}_${contractorId}` shape was
                  // a thread-id fiction that 404'd the API and
                  // dropped the homeowner into a "thread not found"
                  // chat right after accepting a bid.
                  conversationId: jobId,
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
    // 2026-05-26 audit-51 P0: see handleAccept above — must index into
    // sortedBids (what the deck renders), not the unsorted bids array.
    const bid = sortedBids[cardIndex];
    if (!bid || !user?.id || processing) return;

    setProcessing(true);
    try {
      await BidService.rejectBid(bid.id, jobId);
      invalidateJobCaches();
      // Step 4d: surface the undo banner for 5s after a successful
      // reject. The server-side undo window is 60s, so dismissing
      // the snackbar doesn't strand the user — they just lose the
      // one-tap path.
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setRecentlyRejected(bid);
      undoTimerRef.current = setTimeout(() => {
        setRecentlyRejected(null);
        undoTimerRef.current = null;
      }, 5000);
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

  const handleUndoReject = useCallback(async () => {
    const bid = recentlyRejected;
    if (!bid || !user?.id) return;
    dismissUndo();
    setProcessing(true);
    try {
      await BidService.unrejectBid(bid.id, jobId);
      invalidateJobCaches();
      // Bring the rejected bid back into the deck so the user can
      // re-review it without leaving the screen.
      swiperRef.current?.unswipe();
    } catch (err) {
      Alert.alert(
        'Undo failed',
        err instanceof Error
          ? err.message
          : 'Could not reverse the rejection. The undo window may have closed.'
      );
    } finally {
      setProcessing(false);
    }
  }, [recentlyRejected, user?.id, dismissUndo]);

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
          <ActivityIndicator size='large' color={me.ink} />
          <Text style={styles.loadingText}>Loading bids...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allReviewed || bids.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Mirrors the editorial header on the main view so the
            empty state doesn't snap back to the legacy centred
            navbar. */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.screenHeader}>
          <Text style={styles.eyebrow}>Decision time</Text>
          <Text style={styles.headline} accessibilityRole='header'>
            Review Bids
          </Text>
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='checkmark-circle' size={36} color={me.brand} />
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
      {/* 2026-05-22 Mint Editorial v2: top bar (back + bid count
          chip) on the paper background, with the eyebrow + serif
          headline + subtitle pattern beneath. Replaces the
          centered phone-app navbar where the title was sandwiched
          between back-arrow and chip. */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <View style={styles.bidCountChip}>
          <Text style={styles.bidCountText}>{bids.length} bids</Text>
        </View>
      </View>
      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>Decision time</Text>
        <Text style={styles.headline} accessibilityRole='header'>
          Review Bids
        </Text>
        {jobTitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {jobTitle}
          </Text>
        ) : null}
      </View>

      {/* Comparison Summary */}
      {bids.length > 1 && (
        <View style={styles.summaryRow}>
          {[
            {
              label: 'Low',
              value: formatCurrency(Math.min(...bids.map((b) => b.amount))),
              iconColor: me.brand,
              iconBg: me.brandSoft,
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
              iconColor: me.errFg,
              iconBg: '#FEE2E2',
              icon: 'trending-up-outline' as const,
            },
            {
              label: 'Top Rating',
              // 2026-05-22 audit M4: contractor rating may arrive from
              // the API as a string (Postgres NUMERIC). `Math.max(...,
              // <string>)` coerces to NaN, then `.toFixed(1)` returns
              // "NaN★". Coerce per-row before the max.
              value: (() => {
                const ratings = bids.map((b) => {
                  const r = b.contractor?.rating;
                  if (r == null) return 0;
                  const n = typeof r === 'number' ? r : Number(r);
                  return Number.isFinite(n) ? n : 0;
                });
                const top = ratings.length > 0 ? Math.max(...ratings) : 0;
                return `${top.toFixed(1)}★`;
              })(),
              iconColor: me.accent,
              iconBg: me.warnBg,
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
          dragBackdrop
          overlayLabels={{
            left: {
              element: (
                <View style={styles.overlayPass}>
                  <Ionicons name='close' size={48} color={me.errFg} />
                  <Text style={styles.overlayPassText}>PASS</Text>
                </View>
              ),
            },
            right: {
              element: (
                <View style={styles.overlayAccept}>
                  <Ionicons name='checkmark' size={48} color={me.brand} />
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
          <Ionicons name='close' size={30} color={me.errFg} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => swiperRef.current?.swipeRight()}
          disabled={processing}
          accessibilityRole='button'
          accessibilityLabel='Accept this bid'
        >
          <Ionicons name='checkmark' size={30} color={me.brand} />
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size='small' color={me.onBrand} />
        </View>
      )}

      {/* Undo banner (#1 step 4d) — auto-dismisses after 5s. */}
      {recentlyRejected && (
        <View style={styles.undoSnackbar} pointerEvents='box-none'>
          <Text style={styles.undoSnackbarText} numberOfLines={1}>
            Rejected{' '}
            {recentlyRejected.contractor
              ? `${recentlyRejected.contractor.first_name}'s bid`
              : 'bid'}
          </Text>
          <TouchableOpacity
            onPress={handleUndoReject}
            accessibilityRole='button'
            accessibilityLabel='Undo bid rejection'
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={styles.undoSnackbarAction}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Accept-celebration overlay (~720ms fade-in/hold/fade-out). */}
      <Animated.View
        pointerEvents='none'
        style={[
          styles.celebrationOverlay,
          {
            opacity: celebrationAnim,
            transform: [
              {
                scale: celebrationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.celebrationCircle}>
          <Ionicons name='checkmark' size={56} color={me.onBrand} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};
