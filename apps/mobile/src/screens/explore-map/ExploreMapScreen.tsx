/**
 * ExploreMapScreen - Job Discovery Map for Contractors
 *
 * Full-bleed map with floating search bar, category pills,
 * price-tag markers, and budget-first preview card.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  formatCurrency,
  formatCurrencyRange,
} from '../../utils/formatCurrency';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  StatusBar,
  FlatList,
  Platform,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { goToTab } from '../../navigation/hooks';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Force Google Maps only on Android (iOS uses Apple Maps, no key needed).
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
import { Ionicons } from '@expo/vector-icons';
import {
  useExploreMapViewModel,
  type JobMapItem,
} from './viewmodels/ExploreMapViewModel';
import { me } from '../../design-system/mint-editorial';
import { styles, CARD_WIDTH, CATEGORY_MARKERS, CATEGORIES } from './styles';
import { shouldRenderNativeMap as shouldRenderNativeMapUtil } from '../../utils/mapAvailability';

// 2026-05-27 audit-77 P2: empty-state pill that floats above the
// carousel zone when there are zero discoverable jobs in the
// current radius. Live data shows 4 posted/unassigned jobs total
// but 2 sit ~142km outside the 25km London default; without a
// guidance state the contractor sees a blank map + "0 jobs" pill
// and doesn't know whether to zoom out, change category, or move
// the area. Kept local — the styles are specific to this overlay.
const emptyStateStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    maxWidth: 420,
    width: '100%',
    ...me.shadow.pop,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: me.ink2,
    marginBottom: 10,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.bg2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: me.line,
  },
  ctaText: {
    color: me.onBrand,
    fontSize: 12,
    fontWeight: '700',
  },
  ctaTextSecondary: {
    color: me.ink,
    fontSize: 12,
    fontWeight: '700',
  },
});

// 2026-05-27 audit-72 P1: full-screen verification-blocked card for
// pending contractors who hit /api/jobs/discover before admin approval.
// Styles kept local — this is a one-off layout that shouldn't leak
// into the shared explore-map sheet.
const verificationBlockedStyles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 20,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...me.shadow.pop,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: me.ink2,
    textAlign: 'center',
    marginBottom: 18,
  },
  cta: {
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  ctaText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
});

// 2026-05-24 audit-26 P2: "Search this area" pill styles kept local
// to this file so we don't disturb the wider explore-map style export.
const searchAreaStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...me.shadow.card,
  },
  label: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '600',
  },
});

// 2026-05-26 audit-58 P2: retry banner styled as a tappable error pill.
// Sits at the same vertical zone as the "Search this area" pill but
// uses the error palette so it doesn't read as a normal control.
const errorBannerStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.errBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '90%',
    ...me.shadow.card,
  },
  label: {
    color: me.errFg,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});

// Loading dots animation
const LoadingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 150).start();
    animate(dot3, 300).start();
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.loadingDots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
// 2026-05-27 audit-72 P3: previously `new Date('').getTime()` returned
// NaN and propagated through the math as "NaNd ago" on the job card.
// The API type allows created_at: string | null, the mapper converts
// null to '', and homeowner posts before the DB column had a NOT NULL
// default may still surface this way. Fall back to a friendly label
// for any empty/invalid value.
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently posted';
  const parsed = new Date(dateStr).getTime();
  if (!Number.isFinite(parsed)) return 'Recently posted';
  const diff = Date.now() - parsed;
  if (diff < 0) return 'Recently posted';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Carousel Card ────────────────────────────────────────────────────────────
const CarouselCard: React.FC<{
  job: JobMapItem;
  isSelected: boolean;
  onPress: () => void;
  onBid: () => void;
  onDetails: () => void;
}> = ({ job, isSelected, onPress, onBid, onDetails }) => {
  const amt = job.budget_max ?? job.budget_min ?? job.budget;
  const budgetText =
    job.budget_min && job.budget_max && job.budget_max !== job.budget_min
      ? formatCurrencyRange(job.budget_min, job.budget_max)
      : amt
        ? formatCurrency(amt)
        : 'TBD';
  // Null-safe toLowerCase: a job row with category=NULL would crash the
  // whole map (TypeError propagates up FlatList into MapView) — which
  // is one candidate cause of the user-reported "every time I click
  // Find Jobs the app crashes".
  const catKey = (job.category ?? 'general').toLowerCase();
  const catMarker = CATEGORY_MARKERS[catKey] ??
    CATEGORY_MARKERS.general ?? { icon: 'construct' as const, bg: '#6B7280' };

  return (
    <Pressable
      style={[styles.carouselCard, isSelected && styles.carouselCardSelected]}
      onPress={onPress}
    >
      <View style={styles.carouselCardHeader}>
        <Text style={styles.carouselBudget}>{budgetText}</Text>
        <View
          style={[
            styles.carouselCatPill,
            { backgroundColor: catMarker.bg + '20' },
          ]}
        >
          <Ionicons name={catMarker.icon} size={12} color={catMarker.bg} />
        </View>
      </View>
      <Text style={styles.carouselTitle} numberOfLines={1}>
        {job.title}
      </Text>
      <Text style={styles.carouselMeta}>
        {job.distance} km · {timeAgo(job.created_at)}
      </Text>
      <View style={styles.carouselActions}>
        <TouchableOpacity
          style={styles.carouselBidBtn}
          onPress={(e) => {
            e.stopPropagation();
            onBid();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name='flash' size={13} color='#FFF' />
          <Text style={styles.carouselBidText}>Quick Bid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.carouselDetailsBtn}
          onPress={(e) => {
            e.stopPropagation();
            onDetails();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.carouselDetailsText}>Details</Text>
          <Ionicons name='arrow-forward' size={12} color={me.ink} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

interface ExploreMapScreenProps {
  onBackToList?: () => void;
}

export const ExploreMapScreen: React.FC<ExploreMapScreenProps> = ({
  onBackToList,
}) => {
  const insets = useSafeAreaInsets();
  const viewModel = useExploreMapViewModel();
  const navigation =
    useNavigation<NativeStackNavigationProp<JobsStackParamList>>();
  const mapRef = useRef<MapView>(null);
  const carouselRef = useRef<FlatList<JobMapItem>>(null);
  // 2026-05-27 audit-79 P2: read both the JS env var AND the
  // build-time `extra.androidGoogleMapsConfigured` flag so the JS
  // guard agrees with the native AndroidManifest (an EAS build
  // configured with only the non-public GOOGLE_MAPS_API_KEY secret
  // had a valid Maps key in the manifest but the runtime fell back
  // to "Map unavailable").
  const shouldRenderNativeMap = shouldRenderNativeMapUtil();

  // 2026-05-24 audit-38 P2: refetch jobs every time the map regains
  // focus. Previously, after a contractor submitted a bid from
  // BidSubmissionScreen and tapped goBack, the map's local state
  // still showed the just-bid job — /api/jobs/discover already
  // excludes own-bid jobs server-side, so a fresh fetch resolves
  // it cleanly. This also covers the cases of returning from
  // JobDetails after acceptance/cancellation, navigating away to
  // another tab and back, etc.
  //
  // 2026-05-26 audit-49 P0: the dep array was [viewModel] — the view
  // model object is a fresh reference on every render (the hook
  // returns a new object literal). refreshJobs toggles `loading`
  // which re-renders, which produces a new viewModel reference,
  // which fires useFocusEffect again. That hammered /api/jobs/discover
  // in a tight loop and produced the "Find a Job crashed" reports.
  // Depend on the stable callback instead — refreshJobs is memoized
  // inside the view model. Stash it in a ref so the effect closure
  // doesn't recapture each render.
  const refreshJobsRef = useRef(viewModel.refreshJobs);
  refreshJobsRef.current = viewModel.refreshJobs;
  useFocusEffect(
    useCallback(() => {
      refreshJobsRef.current();
    }, [])
  );

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    const job = viewModel.jobs[index];
    if (job && job.id !== viewModel.selectedJob?.id) {
      viewModel.handleJobSelect(job);
      // Finiteness guard: lat/lng arrive from a NUMERIC column and have
      // historically come back as strings — passing one of those to
      // animateToRegion crashes the native MapView module on Android.
      if (Number.isFinite(job.latitude) && Number.isFinite(job.longitude)) {
        mapRef.current?.animateToRegion(
          {
            latitude: job.latitude,
            longitude: job.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          300
        );
      }
    }
  };

  // 2026-05-23 audit: ExploreMapScreen is mounted in two places —
  // (a) as a JobsStack screen reached from the Jobs tab, and
  // (b) inline inside the contractor AddTab via AddActionScreen.
  // The previous `navigation.navigate('JobDetails'/'BidSubmission')`
  // calls only resolved in case (a). From the AddTab context they
  // were no-ops (the route names don't exist on the tab navigator),
  // so contractors using "Find Jobs" couldn't open Details or
  // Quick Bid. goToTab() traverses parents to find JobsTab, then
  // pushes the nested screen — works from both mount sites.
  const handleViewDetails = (jobId: string) => {
    viewModel.handleJobSelect(null);
    goToTab(navigation, 'JobsTab', {
      screen: 'JobDetails',
      params: { jobId },
    });
  };

  const handleBidNow = (jobId: string) => {
    viewModel.handleJobSelect(null);
    goToTab(navigation, 'JobsTab', {
      screen: 'BidSubmission',
      params: { jobId },
    });
  };

  const categorySubtitle = viewModel.selectedCategory
    ? viewModel.selectedCategory.charAt(0).toUpperCase() +
      viewModel.selectedCategory.slice(1)
    : 'All trades';

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' />

      {/* FULL-BLEED MAP — fills entire screen */}
      {shouldRenderNativeMap ? (
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={StyleSheet.absoluteFillObject}
          region={viewModel.region}
          onRegionChangeComplete={viewModel.handleRegionChange}
          onPress={() => viewModel.handleJobSelect(null)}
          showsUserLocation={viewModel.locationGranted}
          showsMyLocationButton={false}
        >
          {/* Contractor location pin */}
          {viewModel.userLocation && (
            <Marker
              coordinate={viewModel.userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={100}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner}>
                  <Ionicons name='person' size={14} color='#FFFFFF' />
                </View>
                <Text style={styles.userMarkerLabel}>You</Text>
              </View>
            </Marker>
          )}

          {viewModel.jobs.map((job) => {
            // Defensive guards — any of these can crash react-native-maps
            // mid-render: null category → TypeError on toLowerCase(),
            // NaN/undefined lat-lng → native Marker throws on coord parse.
            // Skipping an invalid row is preferable to crashing the whole
            // Find Jobs tab.
            const lat =
              typeof job.latitude === 'number' && Number.isFinite(job.latitude)
                ? job.latitude
                : null;
            const lng =
              typeof job.longitude === 'number' &&
              Number.isFinite(job.longitude)
                ? job.longitude
                : null;
            if (lat === null || lng === null) return null;
            const isSelected = viewModel.selectedJob?.id === job.id;
            const catKey = (job.category ?? 'general').toLowerCase();
            const cat = CATEGORY_MARKERS[catKey] ??
              CATEGORY_MARKERS.general ?? {
                icon: 'construct' as const,
                bg: '#6B7280',
              };
            // 2026-05-23 audit-14: live DB stores 'emergency' as the
            // top-tier urgency (per the `jobs.urgency` CHECK constraint
            // — same set used by the tenant-report fix in audit-13).
            // The legacy 'urgent' string is gone from the data model.
            // Accepting either keeps any in-flight legacy rows working
            // while ensuring real emergency jobs get the pulse ring.
            const isUrgent =
              job.urgency === 'emergency' || job.urgency === 'urgent';

            return (
              <Marker
                key={job.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => {
                  viewModel.handleJobSelect(job);
                  const index = viewModel.jobs.findIndex(
                    (j) => j.id === job.id
                  );
                  // 2026-05-26 audit-49 P1: scrollToIndex without
                  // getItemLayout can throw when the target card hasn't
                  // been measured yet. Wrap in try/catch and fall back
                  // to scrollToOffset, which doesn't need layout info.
                  // CARD_WIDTH + 12 mirrors the snapToInterval used on
                  // the carousel FlatList, so the offset lands the
                  // selected card in the same position.
                  if (index >= 0 && carouselRef.current) {
                    try {
                      carouselRef.current.scrollToIndex({
                        index,
                        animated: true,
                      });
                    } catch {
                      carouselRef.current.scrollToOffset({
                        offset: index * (CARD_WIDTH + 12),
                        animated: true,
                      });
                    }
                  }
                }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.markerWrapper}>
                  {/* Outer ring when selected */}
                  <View
                    style={[
                      styles.markerPin,
                      { backgroundColor: isSelected ? '#FFFFFF' : cat.bg },
                      isSelected && { borderColor: cat.bg, borderWidth: 3 },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={isSelected ? 18 : 16}
                      color={isSelected ? cat.bg : me.onBrand}
                    />
                  </View>
                  {/* Arrow */}
                  <View
                    style={[
                      styles.markerArrow,
                      { borderTopColor: isSelected ? '#FFFFFF' : cat.bg },
                    ]}
                  />
                  {/* Urgent pulse dot */}
                  {isUrgent && <View style={styles.urgentDot} />}
                </View>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        // pointerEvents='none' load-bearing: this absoluteFillObject
        // view absorbs taps meant for the job carousel below.
        <View style={styles.mapUnavailable} pointerEvents='none'>
          <Ionicons name='map-outline' size={34} color={me.brand} />
          <Text style={styles.mapUnavailableTitle}>Map unavailable</Text>
          <Text style={styles.mapUnavailableText}>
            Google Maps not configured for this build. Review jobs from the
            cards below.
          </Text>
        </View>
      )}

      {/* ── FLOATING TOP BAR ─────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Back + Search pill row */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToList || (() => navigation.goBack())}
            accessibilityRole='button'
            accessibilityLabel='Back to list'
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
          <View style={styles.searchPill}>
            <Ionicons name='search' size={18} color={me.ink} />
            <View style={styles.searchTextWrap}>
              <Text style={styles.searchTitle}>Near you</Text>
              <Text style={styles.searchSubtitle} numberOfLines={1}>
                {categorySubtitle} · {viewModel.jobCount} job
                {viewModel.jobCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={viewModel.handleFilterPress}
              accessibilityRole='button'
              accessibilityLabel='Open filters'
            >
              <Ionicons name='options-outline' size={16} color={me.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category pills — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = viewModel.selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id ?? 'all'}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                onPress={() => viewModel.handleCategorySelect(cat.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? me.onBrand : me.ink2}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MAP OVERLAYS ─────────────────────────────────────────────────── */}

      {/* Loading dots */}
      {viewModel.loading && (
        <View style={styles.loadingOverlay}>
          <LoadingDots />
        </View>
      )}

      {/* 2026-05-27 audit-72 P1: pending contractor sees the
          verification-blocked card instead of an empty marketplace.
          The viewModel sets this flag when /api/jobs/discover returns
          { jobs: [], code: 'CONTRACTOR_NOT_VERIFIED' }. CTA deep-links
          to ProfileTab → VerificationStatus where the next step in
          the verification flow lives. */}
      {viewModel.verificationRequired && !viewModel.loading && (
        <View style={verificationBlockedStyles.wrapper}>
          <View style={verificationBlockedStyles.card}>
            <View style={verificationBlockedStyles.iconWrap}>
              <Ionicons name='shield-checkmark' size={28} color={me.brand} />
            </View>
            <Text style={verificationBlockedStyles.title}>
              Finish verification to start bidding
            </Text>
            <Text style={verificationBlockedStyles.body}>
              We're reviewing your credentials. Once your account is verified,
              you'll see jobs near you here and can place bids.
            </Text>
            <TouchableOpacity
              style={verificationBlockedStyles.cta}
              onPress={() =>
                goToTab(navigation, 'ProfileTab', {
                  screen: 'VerificationStatus',
                })
              }
              accessibilityRole='button'
              accessibilityLabel='Continue verification'
              activeOpacity={0.85}
            >
              <Text style={verificationBlockedStyles.ctaText}>
                Continue verification
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2026-05-26 audit-58 P2: surface real /api/jobs/discover failures
          instead of showing the same empty state as "no jobs in this
          area". Tapping the banner re-fires the query. */}
      {viewModel.errorMessage && !viewModel.loading && (
        <View
          style={[errorBannerStyles.wrapper, { bottom: insets.bottom + 68 }]}
          pointerEvents='box-none'
        >
          <TouchableOpacity
            style={errorBannerStyles.pill}
            onPress={viewModel.refreshJobs}
            accessibilityRole='button'
            accessibilityLabel='Retry loading jobs'
            activeOpacity={0.8}
          >
            <Ionicons name='alert-circle' size={14} color={me.errFg} />
            <Text style={errorBannerStyles.label}>
              {viewModel.errorMessage}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2026-05-24 audit-26 P2: "Search this area" button. The
          viewModel already tracks `hasPanned` (true once the
          contractor has dragged the map away from the auto-loaded
          region) and exposes `searchInRegion()` which re-queries the
          job list using the current region centre + a derived radius.
          Without a visible control nothing actually invoked it, so
          panning the map silently kept showing stale-area results.
          Anchored above the carousel + bottom pills so it never
          overlaps. */}
      {viewModel.hasPanned && !viewModel.loading && (
        <View
          style={[
            searchAreaStyles.wrapper,
            {
              bottom:
                viewModel.jobs.length > 0
                  ? insets.bottom + 224
                  : insets.bottom + 68,
            },
          ]}
          pointerEvents='box-none'
        >
          <TouchableOpacity
            style={searchAreaStyles.pill}
            onPress={viewModel.searchInRegion}
            accessibilityRole='button'
            accessibilityLabel='Search this area'
            activeOpacity={0.8}
          >
            <Ionicons name='refresh' size={14} color={me.onBrand} />
            <Text style={searchAreaStyles.label}>Search this area</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Job count pill — bottom left (raised above carousel) */}
      <View
        style={[
          styles.jobCountPill,
          {
            bottom:
              viewModel.jobs.length > 0
                ? insets.bottom + 172
                : insets.bottom + 16,
          },
        ]}
      >
        <Text style={styles.jobCountText}>
          {viewModel.jobCount} job{viewModel.jobCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* My location button (raised above carousel) */}
      <TouchableOpacity
        style={[
          styles.locationButton,
          {
            bottom:
              viewModel.jobs.length > 0
                ? insets.bottom + 172
                : insets.bottom + 16,
          },
        ]}
        accessibilityRole='button'
        accessibilityLabel='Center on my location'
        onPress={viewModel.centerOnUser}
      >
        <Ionicons name='navigate' size={20} color={me.brand} />
      </TouchableOpacity>

      {/* 2026-05-27 audit-77 P2: empty-state guidance card. Renders
          only when we have a successful zero-result fetch — not for
          loading, verification-blocked, or API-error states (those
          have their own overlays). Live data has 4 posted jobs but
          2 are 142km outside the 25km default radius — without this
          card the contractor saw a blank map + "0 jobs" pill and
          had to guess whether to zoom out / change category / move
          the area. CTAs surface the three actionable next steps. */}
      {!viewModel.loading &&
        !viewModel.verificationRequired &&
        !viewModel.errorMessage &&
        viewModel.jobs.length === 0 && (
          <View
            style={[emptyStateStyles.wrapper, { bottom: insets.bottom + 24 }]}
            pointerEvents='box-none'
          >
            <View style={emptyStateStyles.card}>
              <View style={emptyStateStyles.iconWrap}>
                <Ionicons name='search-outline' size={18} color={me.brand} />
              </View>
              <Text style={emptyStateStyles.title}>No jobs in this area</Text>
              {/* 2026-05-27 audit-88 P2: be honest about the 25km
                  search radius. Without this, a contractor outside
                  the visible radius reads "No jobs in this area" as
                  "the app is broken" — when really we just stopped
                  looking 25km out. Pan the map to widen the search. */}
              <Text style={emptyStateStyles.body}>
                {viewModel.selectedCategory
                  ? 'Mintenance searches within ~25km of where the map is centred. Try removing the category filter or panning the map to a different area.'
                  : 'Mintenance searches within ~25km of where the map is centred. Try panning the map to a different location, then tap “Search again”.'}
              </Text>
              <View style={emptyStateStyles.ctaRow}>
                {viewModel.selectedCategory ? (
                  <TouchableOpacity
                    style={emptyStateStyles.ctaButton}
                    onPress={() => viewModel.handleCategorySelect(null)}
                    accessibilityRole='button'
                    accessibilityLabel='Clear category filter'
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name='close-circle'
                      size={14}
                      color={me.onBrand}
                    />
                    <Text style={emptyStateStyles.ctaText}>Clear category</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={emptyStateStyles.ctaButtonSecondary}
                  onPress={viewModel.refreshJobs}
                  accessibilityRole='button'
                  accessibilityLabel='Search this area again'
                  activeOpacity={0.85}
                >
                  <Ionicons name='refresh' size={14} color={me.ink} />
                  <Text style={emptyStateStyles.ctaTextSecondary}>
                    Search again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      {/* Horizontal job card carousel */}
      {viewModel.jobs.length > 0 && (
        <View
          style={[styles.carouselContainer, { bottom: insets.bottom + 12 }]}
        >
          <FlatList
            ref={carouselRef}
            data={viewModel.jobs}
            horizontal
            pagingEnabled={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate='fast'
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={handleCarouselScroll}
            // 2026-05-26 audit-49 P1: explicit failure handler for
            // scrollToIndex. Without this, tapping a marker for a card
            // that hasn't been measured yet (off-screen, just appeared
            // after a refetch) throws and crashes Find Jobs. Card width
            // is fixed at CARD_WIDTH + 12 gap, so we can compute the
            // offset directly and recover. setTimeout 0 + a retry of
            // scrollToIndex is the RN-recommended escape hatch.
            onScrollToIndexFailed={(info) => {
              const offset = info.index * (CARD_WIDTH + 12);
              carouselRef.current?.scrollToOffset({ offset, animated: true });
              setTimeout(() => {
                try {
                  carouselRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                  });
                } catch {
                  // Already scrolled via offset — no-op.
                }
              }, 100);
            }}
            // CARD_WIDTH + 12 mirrors snapToInterval; declaring it as
            // getItemLayout lets RN skip the measurement pass and the
            // crash window above narrows dramatically.
            getItemLayout={(_data, index) => ({
              length: CARD_WIDTH + 12,
              offset: (CARD_WIDTH + 12) * index,
              index,
            })}
            renderItem={({ item }) => (
              <CarouselCard
                job={item}
                isSelected={viewModel.selectedJob?.id === item.id}
                onPress={() => {
                  if (!shouldRenderNativeMap) {
                    handleViewDetails(item.id);
                    return;
                  }
                  viewModel.handleJobSelect(item);
                  if (
                    Number.isFinite(item.latitude) &&
                    Number.isFinite(item.longitude)
                  ) {
                    mapRef.current?.animateToRegion(
                      {
                        latitude: item.latitude,
                        longitude: item.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      },
                      300
                    );
                  }
                }}
                onBid={() => handleBidNow(item.id)}
                onDetails={() => handleViewDetails(item.id)}
              />
            )}
          />
        </View>
      )}
    </View>
  );
};
