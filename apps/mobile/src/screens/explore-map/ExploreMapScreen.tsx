/**
 * ExploreMapScreen - Job Discovery Map for Contractors
 *
 * Full-bleed map with floating search bar, category pills,
 * price-tag markers, and budget-first preview card.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  FlatList,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  useExploreMapViewModel,
  type JobMapItem,
} from './viewmodels/ExploreMapViewModel';
import { theme } from '../../theme';
import { styles, CARD_WIDTH, CATEGORY_MARKERS, CATEGORIES } from './styles';

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
  const budgetText = job.budget_min && job.budget_max && job.budget_max !== job.budget_min
    ? `£${job.budget_min.toLocaleString()} – £${job.budget_max.toLocaleString()}`
    : (job.budget_max ?? job.budget_min)
      ? `£${(job.budget_max ?? job.budget_min)!.toLocaleString()}`
      : 'TBD';
  const catKey = job.category.toLowerCase();
  const catMarker = CATEGORY_MARKERS[catKey] ?? CATEGORY_MARKERS.general;

  return (
    <TouchableOpacity
      style={[styles.carouselCard, isSelected && styles.carouselCardSelected]}
      onPress={onPress}
      activeOpacity={0.95}
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
        <TouchableOpacity style={styles.carouselBidBtn} onPress={onBid}>
          <Ionicons name='flash' size={13} color='#FFF' />
          <Text style={styles.carouselBidText}>Quick Bid</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.carouselDetailsBtn} onPress={onDetails}>
          <Text style={styles.carouselDetailsText}>Details</Text>
          <Ionicons
            name='arrow-forward'
            size={12}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12));
    const job = viewModel.jobs[index];
    if (job && job.id !== viewModel.selectedJob?.id) {
      viewModel.handleJobSelect(job);
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
  };

  const handleViewDetails = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('JobDetails', { jobId });
  };

  const handleBidNow = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('BidSubmission', { jobId });
  };

  const categorySubtitle = viewModel.selectedCategory
    ? viewModel.selectedCategory.charAt(0).toUpperCase() +
      viewModel.selectedCategory.slice(1)
    : 'All trades';

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' />

      {/* FULL-BLEED MAP — fills entire screen */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
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
          const isSelected = viewModel.selectedJob?.id === job.id;
          const cat =
            CATEGORY_MARKERS[job.category.toLowerCase()] ??
            CATEGORY_MARKERS.general;
          const isUrgent = job.urgency === 'urgent';

          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              onPress={() => {
                viewModel.handleJobSelect(job);
                const index = viewModel.jobs.findIndex((j) => j.id === job.id);
                if (index >= 0 && carouselRef.current) {
                  carouselRef.current.scrollToIndex({ index, animated: true });
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
                    color={isSelected ? cat.bg : theme.colors.textInverse}
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
            <Ionicons
              name='arrow-back'
              size={20}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.searchPill}>
            <Ionicons
              name='search'
              size={18}
              color={theme.colors.textPrimary}
            />
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
              <Ionicons
                name='options-outline'
                size={16}
                color={theme.colors.textPrimary}
              />
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
                  color={
                    isActive
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary
                  }
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
        <Ionicons name='navigate' size={20} color={theme.colors.primary} />
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
                  viewModel.handleJobSelect(item);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    },
                    300
                  );
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

export default ExploreMapScreen;
