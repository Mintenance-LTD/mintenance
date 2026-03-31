/**
 * ContractorProfileScreen — Full redesign
 *
 * Full-bleed cover hero with overlapping avatar, trust signals,
 * impact stats, primary CTA, portfolio gallery, and review breakdown.
 */

import React, { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useContractorProfileViewModel } from './viewmodels/ContractorProfileViewModel';
import {
  ProfileHeader,
  ProfileStats,
  ProfileActionButtons,
  PhotoGallery,
  ReviewsList,
} from './components';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { theme } from '../../theme';

interface ContractorProfileScreenProps {
  navigation: { goBack: () => void };
  route?: {
    params?: {
      contractorId?: string;
      contractorName?: string;
    };
  };
}

export const ContractorProfileScreen: React.FC<
  ContractorProfileScreenProps
> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const viewModel = useContractorProfileViewModel(route?.params?.contractorId);

  // Check if the homeowner has an active job with this contractor (assigned/in_progress/completed)
  const contractorId = route?.params?.contractorId;
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['contractorActiveJobs', user?.id, contractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('homeowner_id', user!.id)
        .eq('contractor_id', contractorId!)
        .in('status', ['assigned', 'in_progress', 'completed']);
      return data || [];
    },
    enabled: !!user && !!contractorId,
  });

  const canMessage = activeJobs.length > 0;

  if (viewModel.loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle='light-content' />
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (viewModel.error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle='dark-content' />
        <View style={[styles.centered, { paddingTop: insets.top + 60 }]}>
          <View style={styles.errorIconWrap}>
            <Ionicons
              name='alert-circle-outline'
              size={28}
              color={theme.colors.error}
            />
          </View>
          <Text style={styles.errorText}>{viewModel.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={viewModel.refresh}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name='arrow-back'
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.loading}
            onRefresh={viewModel.refresh}
            tintColor='#FFFFFF'
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Full-bleed hero with avatar */}
        <ProfileHeader
          name={viewModel.contractor.name}
          location={viewModel.contractor.location}
          bio={viewModel.contractor.bio}
          verified={viewModel.contractor.verified}
          skills={viewModel.contractor.skills}
          topInset={insets.top}
          onBack={() => navigation.goBack()}
          onShare={viewModel.handleShare}
        />

        {/* Impact stats */}
        <ProfileStats
          jobsCompleted={viewModel.contractor.jobsCompleted}
          rating={viewModel.contractor.rating}
          reviewCount={viewModel.contractor.reviews}
        />

        {/* Primary CTA + secondary actions */}
        <ProfileActionButtons
          onMessage={viewModel.handleMessage}
          onCall={viewModel.handleCall}
          onVideo={viewModel.handleVideo}
          onShare={viewModel.handleShare}
          canMessage={canMessage}
        />

        {/* Portfolio gallery */}
        <PhotoGallery
          photos={viewModel.photos}
          onAddPhoto={viewModel.handleAddPhoto}
        />

        {/* Reviews with breakdown */}
        <ReviewsList
          reviews={viewModel.reviews}
          totalCount={viewModel.contractor.reviews}
          averageRating={viewModel.contractor.rating}
        />

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
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
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorText: {
    marginTop: 4,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default ContractorProfileScreen;
