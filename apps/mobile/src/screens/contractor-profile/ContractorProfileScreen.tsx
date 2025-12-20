/**
 * ContractorProfileScreen Container
 * 
 * Displays contractor profile with tabs for photos and reviews.
 * 
 * @filesize Target: <90 lines
 * @compliance MVVM - Thin container
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
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
  navigation: any;
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={route?.params?.contractorName || 'Contractor Profile'}
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
});

export default ContractorProfileScreen;
