/**
 * ContractorProfileScreen — Full redesign
 *
 * Full-bleed cover hero with overlapping avatar, trust signals,
 * impact stats, primary CTA, portfolio gallery, and review breakdown.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
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
      source?: 'bidReview' | 'general';
      jobId?: string;
      bidId?: string;
    };
  };
}

export const ContractorProfileScreen: React.FC<
  ContractorProfileScreenProps
> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const viewModel = useContractorProfileViewModel(route?.params?.contractorId, {
    source: route?.params?.source,
    jobId: route?.params?.jobId,
    bidId: route?.params?.bidId,
  });

  // Check if the homeowner has an active job with this contractor (assigned/in_progress/completed)
  const contractorId = route?.params?.contractorId;
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['contractorActiveJobs', user?.id, contractorId],
    queryFn: async () => {
      if (!user?.id || !contractorId) return [];
      const { data } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('homeowner_id', user.id)
        .eq('contractor_id', contractorId)
        .in('status', ['assigned', 'in_progress', 'completed']);
      return data || [];
    },
    enabled: !!user && !!contractorId,
  });

  // Message button is visible when:
  //   - there's an active job between homeowner and contractor
  //     (post-assignment / mid-job / completed), OR
  //   - the user opened this profile from a bid review with a known
  //     jobId, since the messaging thread is keyed on jobId and the
  //     homeowner needs to be able to message the bidder during review.
  const fromBidReview =
    route?.params?.source === 'bidReview' && !!route?.params?.jobId;
  const canMessage = activeJobs.length > 0 || fromBidReview;

  // Check if the homeowner has any open or accepted bid from this
  // contractor on one of their jobs. When true the primary CTA flips
  // from "Request a Quote" to "Message Contractor" — asking for a
  // quote when they've already bid is the user-flagged UX issue.
  const { data: bidCount = 0 } = useQuery({
    queryKey: ['contractorBidsForMyJobs', user?.id, contractorId],
    queryFn: async () => {
      if (!user?.id || !contractorId) return 0;
      // Two-step: get this user's job ids, then count contractor bids
      // on those jobs in pending/accepted state. Two queries because
      // PostgREST doesn't support a JOIN-based filter directly.
      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('homeowner_id', user.id);
      const myJobIds = (myJobs ?? []).map((j: { id: string }) => j.id);
      if (myJobIds.length === 0) return 0;
      const { count } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
        .in('status', ['pending', 'accepted'])
        .in('job_id', myJobIds);
      return count ?? 0;
    },
    enabled: !!user && !!contractorId,
  });

  const hasActiveBid = bidCount > 0;

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
          profileImageUrl={viewModel.contractor.profileImageUrl}
          topInset={insets.top}
          onBack={() => navigation.goBack()}
          onShare={viewModel.handleShare}
          postcodePrefix={viewModel.contractor.postcodePrefix}
          postcodeProofCount={viewModel.contractor.postcodeProofCount}
          disputeHistory={viewModel.contractor.disputeHistory}
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
          hasActiveBid={hasActiveBid}
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
