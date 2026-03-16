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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useExploreMapViewModel } from './viewmodels/ExploreMapViewModel';
import { JobPreviewCard } from './components';
import { theme } from '../../theme';

// Category marker config — icon + color per trade
const CATEGORY_MARKERS: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string }> = {
  plumbing:    { icon: 'water',           bg: theme.colors.primary },
  electrical:  { icon: 'flash',           bg: theme.colors.accent },
  roofing:     { icon: 'home',            bg: theme.colors.primary },
  painting:    { icon: 'color-palette',   bg: '#3B82F6' },
  carpentry:   { icon: 'hammer',          bg: theme.colors.accent },
  cleaning:    { icon: 'sparkles',        bg: '#3B82F6' },
  hvac:        { icon: 'thermometer',     bg: theme.colors.error },
  landscaping: { icon: 'leaf',            bg: theme.colors.primary },
  appliance:   { icon: 'settings',        bg: theme.colors.accent },
  general:     { icon: 'construct',       bg: theme.colors.textSecondary },
};

// Category tabs
const CATEGORIES = [
  { id: null, name: 'All', icon: 'grid-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'plumbing', name: 'Plumbing', icon: 'water-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'electrical', name: 'Electrical', icon: 'flash-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'appliance', name: 'Appliances', icon: 'home-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'hvac', name: 'HVAC', icon: 'snow-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'roofing', name: 'Roofing', icon: 'home-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'painting', name: 'Painting', icon: 'color-palette-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'carpentry', name: 'Carpentry', icon: 'hammer-outline' as keyof typeof Ionicons.glyphMap },
  { id: 'cleaning', name: 'Cleaning', icon: 'sparkles-outline' as keyof typeof Ionicons.glyphMap },
];

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
          Animated.timing(dot, { toValue: 1, duration: 300, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, easing: Easing.ease, useNativeDriver: true }),
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

interface ExploreMapScreenProps {
  onBackToList?: () => void;
}

export const ExploreMapScreen: React.FC<ExploreMapScreenProps> = ({ onBackToList }) => {
  const insets = useSafeAreaInsets();
  const viewModel = useExploreMapViewModel();
  const navigation = useNavigation<NativeStackNavigationProp<JobsStackParamList>>();

  const handleViewDetails = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('JobDetails', { jobId });
  };

  const handleBidNow = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('BidSubmission', { jobId });
  };

  const categorySubtitle = viewModel.selectedCategory
    ? viewModel.selectedCategory.charAt(0).toUpperCase() + viewModel.selectedCategory.slice(1)
    : 'All trades';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* FULL-BLEED MAP — fills entire screen */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        region={viewModel.region}
        onRegionChangeComplete={viewModel.handleRegionChange}
        onPress={() => viewModel.handleJobSelect(null)}
        showsUserLocation={viewModel.locationGranted}
        showsMyLocationButton={false}
      >
        {viewModel.jobs.map((job) => {
          const isSelected = viewModel.selectedJob?.id === job.id;
          const cat = CATEGORY_MARKERS[job.category.toLowerCase()] ?? CATEGORY_MARKERS.general;
          const isUrgent = job.urgency === 'urgent';

          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              onPress={() => viewModel.handleJobSelect(job)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerWrapper}>
                {/* Outer ring when selected */}
                <View style={[
                  styles.markerPin,
                  { backgroundColor: isSelected ? '#FFFFFF' : cat.bg },
                  isSelected && { borderColor: cat.bg, borderWidth: 3 },
                ]}>
                  <Ionicons
                    name={cat.icon}
                    size={isSelected ? 18 : 16}
                    color={isSelected ? cat.bg : theme.colors.textInverse}
                  />
                </View>
                {/* Arrow */}
                <View style={[
                  styles.markerArrow,
                  { borderTopColor: isSelected ? '#FFFFFF' : cat.bg },
                ]} />
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
          {onBackToList && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackToList}
              accessibilityRole="button"
              accessibilityLabel="Back to list"
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color={theme.colors.textPrimary} />
            <View style={styles.searchTextWrap}>
              <Text style={styles.searchTitle}>Near you</Text>
              <Text style={styles.searchSubtitle} numberOfLines={1}>
                {categorySubtitle} · {viewModel.jobCount} job{viewModel.jobCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={viewModel.handleFilterPress}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
            >
              <Ionicons name="options-outline" size={16} color={theme.colors.textPrimary} />
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
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => viewModel.handleCategorySelect(cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? theme.colors.textInverse : theme.colors.textSecondary}
                />
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MAP OVERLAYS ─────────────────────────────────────────────────── */}

      {/* "Search this area" pill */}
      {viewModel.hasPanned && !viewModel.loading && (
        <TouchableOpacity
          style={styles.searchAreaPill}
          onPress={viewModel.searchInRegion}
          accessibilityRole="button"
          accessibilityLabel="Search jobs in this area"
        >
          <Ionicons name="refresh" size={14} color={theme.colors.textInverse} />
          <Text style={styles.searchAreaText}>Search this area</Text>
        </TouchableOpacity>
      )}

      {/* Loading dots */}
      {viewModel.loading && (
        <View style={styles.loadingOverlay}>
          <LoadingDots />
        </View>
      )}

      {/* Job count pill — bottom left */}
      <View style={[styles.jobCountPill, { bottom: viewModel.selectedJob ? 200 : insets.bottom + 16 }]}>
        <Text style={styles.jobCountText}>
          {viewModel.jobCount} job{viewModel.jobCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* My location button */}
      <TouchableOpacity
        style={[styles.locationButton, { bottom: viewModel.selectedJob ? 200 : insets.bottom + 16 }]}
        accessibilityRole="button"
        accessibilityLabel="Center on my location"
        onPress={viewModel.centerOnUser}
      >
        <Ionicons name="navigate" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Job preview card */}
      {viewModel.selectedJob && (
        <View style={[styles.cardContainer, { bottom: insets.bottom + 12 }]}>
          <JobPreviewCard
            job={viewModel.selectedJob}
            onViewDetails={() => handleViewDetails(viewModel.selectedJob!.id)}
            onBidNow={() => handleBidNow(viewModel.selectedJob!.id)}
            onDismiss={() => viewModel.handleJobSelect(null)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },

  // ── Floating top bar ───────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
  },
  searchTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  searchSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // ── Category pills ─────────────────────────────────────────────────────────
  categoryRow: {
    maxHeight: 38,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: theme.colors.textInverse,
  },

  // ── Category icon pin markers ─────────────────────────────────────────────
  markerWrapper: {
    alignItems: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  urgentDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },

  // ── Search this area ───────────────────────────────────────────────────────
  searchAreaPill: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6,
    zIndex: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  searchAreaText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },

  // ── Loading dots ───────────────────────────────────────────────────────────
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 5,
  },
  loadingDots: {
    flexDirection: 'row',
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
  },

  // ── Job count pill ─────────────────────────────────────────────────────────
  jobCountPill: {
    position: 'absolute',
    left: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 5,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  jobCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  // ── My location button ─────────────────────────────────────────────────────
  locationButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },

  // ── Preview card ───────────────────────────────────────────────────────────
  cardContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
});

export default ExploreMapScreen;
