/**
 * ExploreMapScreen Container
 * 
 * Map-based contractor discovery with location services.
 * 
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { theme } from '../../theme';
import { useExploreMapViewModel } from './viewmodels/ExploreMapViewModel';
import { MapSearchBar, ContractorCard } from './components';

export const ExploreMapScreen: React.FC = () => {
  const viewModel = useExploreMapViewModel();

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
        {viewModel.contractors.map((contractor) => (
          <Marker
            key={contractor.id}
            coordinate={{
              latitude: contractor.latitude,
              longitude: contractor.longitude,
            }}
            onPress={() => viewModel.handleContractorSelect(contractor)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker} />
            </View>
          </Marker>
        ))}
      </MapView>

      <MapSearchBar
        value={viewModel.searchQuery}
        onChangeText={viewModel.handleSearch}
        onFilterPress={viewModel.handleFilterPress}
      />

      {viewModel.selectedContractor && (
        <View style={styles.cardContainer}>
          <ContractorCard
            contractor={viewModel.selectedContractor}
            onPress={() => {
              // Navigate to contractor profile
              viewModel.handleContractorSelect(null);
            }}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.white,
    ...theme.shadows.base,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
});

export default ExploreMapScreen;
