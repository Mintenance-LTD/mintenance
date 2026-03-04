/**
 * ContractorProfileScreen Container
 *
 * Displays contractor profile with tabs for photos and reviews.
 * Fetches real data from the API.
 *
 * @filesize Target: <120 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ScreenHeader } from '../../components/shared';
import { useContractorProfileViewModel } from './viewmodels/ContractorProfileViewModel';
import {
  ProfileHeader,
  ProfileStats,
  ProfileActionButtons,
  ProfileTabs,
  PhotoGallery,
  ReviewsList,
} from './components';

interface ContractorProfileScreenProps {
  navigation: { goBack: () => void };
  route?: {
    params?: {
      contractorId?: string;
      contractorName?: string;
    };
  };
}

export const ContractorProfileScreen: React.FC<ContractorProfileScreenProps> = ({
  navigation,
  route,
}) => {
  const viewModel = useContractorProfileViewModel(route?.params?.contractorId);

  if (viewModel.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title={route?.params?.contractorName || 'Contractor Profile'}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (viewModel.error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Contractor Profile"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{viewModel.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={viewModel.refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={route?.params?.contractorName || viewModel.contractor.name}
        onBackPress={() => navigation.goBack()}
        rightAction={
          <ProfileActionButtons
            onMessage={viewModel.handleMessage}
            onCall={viewModel.handleCall}
            onVideo={viewModel.handleVideo}
            onShare={viewModel.handleShare}
          />
        }
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.loading}
            onRefresh={viewModel.refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <ProfileHeader
          name={viewModel.contractor.name}
          location={viewModel.contractor.location}
        />

        <ProfileStats
          jobsCompleted={viewModel.contractor.jobsCompleted}
          rating={viewModel.contractor.rating}
          reviewCount={viewModel.contractor.reviews}
        />

        <ProfileTabs
          activeTab={viewModel.activeTab}
          onTabChange={viewModel.setActiveTab}
        />

        {viewModel.activeTab === 'photos' ? (
          <PhotoGallery
            photos={viewModel.photos}
            onAddPhoto={viewModel.handleAddPhoto}
          />
        ) : (
          <ReviewsList reviews={viewModel.reviews} />
        )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ContractorProfileScreen;
