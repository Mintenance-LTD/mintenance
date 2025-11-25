/**
 * EnhancedHomeScreen Container
 * 
 * Main container for enhanced home screen with special offers and services.
 * Orchestrates components and delegates logic to ViewModel.
 * 
 * @filesize Target: <100 lines
 * @compliance MVVM - Thin container, delegates to ViewModel
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { theme } from '../../theme';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useEnhancedHomeViewModel } from './viewmodels/EnhancedHomeViewModel';
import {
  LocationHeader,
  SearchFilterBar,
  SpecialOffersCarousel,
  ServiceCategoryGrid,
  TopContractorsList,
} from './components';

export const EnhancedHomeScreen: React.FC = () => {
  const viewModel = useEnhancedHomeViewModel();

  // Loading state
  if (viewModel.loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Error state
  if (viewModel.error) {
    return (
      <ErrorView
        message={viewModel.error}
        onRetry={viewModel.handleRefresh}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <LocationHeader
        location={viewModel.location}
        onLocationPress={() => { }}
        onNotificationPress={() => { }}
        hasNotifications
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <SearchFilterBar
          value={viewModel.searchQuery}
          onChangeText={viewModel.handleSearch}
          onFilterPress={() => { }}
        />

        <SpecialOffersCarousel
          offers={viewModel.specialOffers}
          onOfferClaim={viewModel.handleOfferClaim}
        />

        <ServiceCategoryGrid
          services={viewModel.services}
          onServicePress={viewModel.handleServicePress}
        />

        <TopContractorsList
          contractors={viewModel.topContractors}
          onContractorPress={viewModel.handleContractorPress}
          onSeeAllPress={() => { }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
});

export default EnhancedHomeScreen;
