/**
 * ExploreMapScreen - Job Discovery for Contractors
 *
 * Shows posted jobs as map markers. Contractors can tap a marker
 * to see job details and navigate to bid submission.
 *
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { theme } from '../../theme';
import { useExploreMapViewModel } from './viewmodels/ExploreMapViewModel';
import { MapSearchBar, JobPreviewCard } from './components';

const URGENCY_MARKER_COLORS: Record<string, string> = {
  low: theme.colors.success,
  medium: theme.colors.info,
  high: theme.colors.warning,
  emergency: theme.colors.error,
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
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={viewModel.region}
        onRegionChangeComplete={viewModel.handleRegionChange}
        showsUserLocation
        showsMyLocationButton
      >
        {viewModel.jobs.map((job) => {
          const color = URGENCY_MARKER_COLORS[job.urgency] || theme.colors.info;
          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              onPress={() => viewModel.handleJobSelect(job)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, { backgroundColor: color }]}>
                  <Text style={styles.markerText}>£</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <MapSearchBar
        value={viewModel.searchQuery}
        onChangeText={viewModel.handleSearch}
        onFilterPress={viewModel.handleFilterPress}
      />

      {viewModel.loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {viewModel.selectedJob && (
        <View style={styles.cardContainer}>
          <JobPreviewCard
            job={viewModel.selectedJob}
            onViewDetails={() => handleViewDetails(viewModel.selectedJob!.id)}
            onBidNow={() => handleBidNow(viewModel.selectedJob!.id)}
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
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.base,
  },
  markerText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.white,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 8,
    ...theme.shadows.base,
  },
});

export default ExploreMapScreen;
