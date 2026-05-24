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
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;
  const shouldRenderNativeMap = Platform.OS !== 'android' || !!googleMapsApiKey;

  // 2026-05-24 audit-38 P2: refetch jobs every time the map regains
  // focus. Previously, after a contractor submitted a bid from
  // BidSubmissionScreen and tapped goBack, the map's local state
  // still showed the just-bid job — /api/jobs/discover already
  // excludes own-bid jobs server-side, so a fresh fetch resolves
  // it cleanly. This also covers the cases of returning from
  // JobDetails after acceptance/cancellation, navigating away to
  // another tab and back, etc. The view model's refreshJobs is
  // memoized so this is cheap when state hasn't changed.
  useFocusEffect(
    useCallback(() => {
      viewModel.refreshJobs();
    }, [viewModel])
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
                  if (index >= 0 && carouselRef.current) {
                    carouselRef.current.scrollToIndex({
                      index,
                      animated: true,
                    });
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
