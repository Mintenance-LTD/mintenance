/**
 * ExploreMapScreen - Job Discovery for Contractors
 *
 * Airbnb Explore/Map pattern: search pill at top, horizontal category tabs,
 * price-tag markers on map, listing preview card on marker tap.
 *
 * @compliance MVVM - Thin container
 */

import React, { useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useExploreMapViewModel } from './viewmodels/ExploreMapViewModel';
import { MapSearchBar, JobPreviewCard } from './components';

// Category tabs - same data as QuickServices for consistency
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

// Three-dot loading indicator
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

export const ExploreMapScreen: React.FC = () => {
  const viewModel = useExploreMapViewModel();
  const navigation = useNavigation<any>();

  const handleViewDetails = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('JobsTab', { screen: 'JobDetails', params: { jobId } });
  };

  const handleBidNow = (jobId: string) => {
    viewModel.handleJobSelect(null);
    navigation.navigate('JobsTab', { screen: 'BidSubmission', params: { jobId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search pill */}
      <MapSearchBar
        jobCount={viewModel.jobCount}
        selectedCategory={viewModel.selectedCategory}
        onFilterPress={viewModel.handleFilterPress}
      />

      {/* Category tabs */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = viewModel.selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id ?? 'all'}
                style={[styles.categoryTab, isActive && styles.categoryTabActive]}
                onPress={() => viewModel.handleCategorySelect(cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter by ${cat.name}`}
              >
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary}
                />
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.categoryDivider} />
      </View>

      {/* Job count */}
      <View style={styles.jobCountBar}>
        <View style={styles.jobCountLine} />
        <Text style={styles.jobCountText}>
          {viewModel.jobCount} job{viewModel.jobCount !== 1 ? 's' : ''}
        </Text>
        <View style={styles.jobCountLine} />
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={viewModel.region}
        onRegionChangeComplete={viewModel.handleRegionChange}
        onPress={() => viewModel.handleJobSelect(null)}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {viewModel.jobs.map((job) => {
          const isSelected = viewModel.selectedJob?.id === job.id;
          const budget = job.budget_max || job.budget_min;
          const label = budget ? `\u00A3${budget >= 1000 ? `${(budget / 1000).toFixed(budget % 1000 === 0 ? 0 : 1)}k` : budget}` : job.category.slice(0, 3).toUpperCase();

          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              onPress={() => viewModel.handleJobSelect(job)}
            >
              <View style={[
                styles.priceMarker,
                isSelected && styles.priceMarkerSelected,
              ]}>
                <Text style={[
                  styles.priceMarkerText,
                  isSelected && styles.priceMarkerTextSelected,
                ]}>
                  {label}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading dots */}
      {viewModel.loading && (
        <View style={styles.loadingOverlay}>
          <LoadingDots />
        </View>
      )}

      {/* My location button */}
      <TouchableOpacity
        style={styles.locationButton}
        accessibilityRole="button"
        accessibilityLabel="Center on my location"
        onPress={viewModel.centerOnUser}
      >
        <Ionicons name="navigate" size={20} color={theme.colors.textPrimary} />
      </TouchableOpacity>

      {/* Job preview card */}
      {viewModel.selectedJob && (
        <View style={styles.cardContainer}>
          <JobPreviewCard
            job={viewModel.selectedJob}
            onViewDetails={() => handleViewDetails(viewModel.selectedJob!.id)}
            onBidNow={() => handleBidNow(viewModel.selectedJob!.id)}
            onDismiss={() => viewModel.handleJobSelect(null)}
          />
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

  // Category tabs
  categoryBar: {
    marginTop: 72,
    backgroundColor: theme.colors.background,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 20,
  },
  categoryTab: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 52,
  },
  categoryTabActive: {
    borderBottomColor: theme.colors.textPrimary,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  categoryDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },

  // Job count
  jobCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
  },
  jobCountLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  jobCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    paddingHorizontal: 16,
  },

  // Map
  map: {
    flex: 1,
  },

  // Price tag markers (Airbnb style)
  priceMarker: {
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  priceMarkerSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#222222',
  },
  priceMarkerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceMarkerTextSelected: {
    color: '#222222',
  },

  // Loading dots
  loadingOverlay: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    zIndex: 5,
  },
  loadingDots: {
    flexDirection: 'row',
    backgroundColor: '#222222',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // My location button
  locationButton: {
    position: 'absolute',
    right: 16,
    top: 150,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },

  // Preview card
  cardContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
});

export default ExploreMapScreen;
