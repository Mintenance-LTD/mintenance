import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import { useJobBids } from '../../hooks/useJobs';
import { BidService } from '../../services/BidService';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { HostCard } from '../../components/ui/HostCard';
import { ContractorAssignment } from '../../components/ContractorAssignment';
import { AIAnalysisCard, JobLifecycleStepper } from './components';
import { JobRoomScope } from '../components/JobRoomScope';
import { ContractorLocationSection } from './components/ContractorLocationSection';
import { HomeownerLocationRequest } from './components/HomeownerLocationRequest';
import { JobLocationMap } from './components/JobLocationMap';
import { JobPricingCard } from './components/JobPricingCard';
import { JobTitleSection } from './components/JobTitleSection';
import { JobDetailsList } from './components/JobDetailsList';
import { JobBidsList, type BidListItem } from './components/JobBidsList';
import { JobQuickActions } from './components/JobQuickActions';
import { LogExpenseRow } from './components/LogExpenseRow';
import { WithdrawBidButton } from './components/WithdrawBidButton';
import { TipsReceivedSection } from './components/TipsReceivedSection';
import { useAuth } from '../../contexts/AuthContext';
import type { JobsStackParamList } from '../../navigation/types';
import { normalizePhotoUrls } from '../../utils/photoUrls';
import { me } from '../../design-system/mint-editorial';
import { getPriorityCTA, type CTAContext } from './JobDetailsCTA';
import { EscrowInfoModal } from './EscrowInfoModal';
import { styles } from './jobDetailsStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_CAROUSEL_HEIGHT = Math.round(SCREEN_WIDTH * 0.75);

const CAT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  roofing: 'home-outline',
  painting: 'color-palette-outline',
  carpentry: 'hammer-outline',
  landscaping: 'leaf-outline',
  cleaning: 'sparkles-outline',
  hvac: 'thermometer-outline',
  general: 'construct-outline',
};

type ScreenRoute = RouteProp<JobsStackParamList, 'JobDetails'>;
type ScreenNav = NativeStackNavigationProp<JobsStackParamList, 'JobDetails'>;
interface Props {
  route: ScreenRoute;
  navigation: ScreenNav;
}

/**
 * Job details page. Was a 717-line monolith. Split 2026-05-09
 * (AUDIT_PUNCH_LIST P2 #44c) into typed sub-components under
 * `job-details/components/` (`JobTitleSection`, `JobDetailsList`,
 * `JobBidsList`, `JobQuickActions`, `LogExpenseRow`,
 * `WithdrawBidButton`, `DetailRow`) and a shared bid-status-colour
 * helper at `job-details/bidStatusColors.ts`. Public behaviour
 * preserved; only the orchestration + state remain here.
 */
export const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const viewModel = useJobDetailsViewModel(jobId);
  const insets = useSafeAreaInsets();
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [withdrawingBid, setWithdrawingBid] = useState(false);
  // 2026-05-21 audit: the spinner could sit forever when the API was
  // slow/stuck with no feedback. After 15s of continuous loading we
  // surface a retry — the underlying query will still resolve in the
  // background if the request eventually returns.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const { data: bidsData, refetch: refetchBids } = useJobBids(jobId);

  useEffect(() => {
    if (!viewModel.jobLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const handle = setTimeout(() => setLoadingTimedOut(true), 15_000);
    return () => clearTimeout(handle);
  }, [viewModel.jobLoading]);

  const job = viewModel.job;
  const isContractor = user?.role === 'contractor';
  const isOwner = user?.id === job?.homeowner_id;

  const bidsArray = (Array.isArray(bidsData) ? bidsData : []) as BidListItem[];
  const myPendingBid =
    isContractor && user?.id
      ? bidsArray.find(
          (b) =>
            (b.contractorId === user.id || b.contractor_id === user.id) &&
            b.status === 'pending'
        )
      : null;

  const handleWithdrawBid = useCallback(() => {
    if (!myPendingBid || !user?.id) return;
    Alert.alert('Withdraw Bid', 'Are you sure you want to withdraw your bid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setWithdrawingBid(true);
          try {
            // Audit step 11 (2026-04-29): pass jobId from route params
            // so BidService doesn't need a server-side bid → job lookup.
            await BidService.withdrawBid(myPendingBid.id, jobId);
            Alert.alert(
              'Bid Withdrawn',
              'Your bid has been withdrawn successfully.'
            );
            refetchBids();
            viewModel.refetchJob();
          } catch {
            Alert.alert('Error', 'Failed to withdraw bid. Please try again.');
          } finally {
            setWithdrawingBid(false);
          }
        },
      },
    ]);
  }, [myPendingBid, user?.id, refetchBids, viewModel, jobId]);

  if (viewModel.jobLoading && !loadingTimedOut) {
    return <LoadingSpinner message='Loading job details...' />;
  }
  if (viewModel.jobError || (viewModel.jobLoading && loadingTimedOut)) {
    return (
      <ErrorView
        message={
          viewModel.jobError
            ? 'Failed to load job details'
            : 'Still loading — check your connection?'
        }
        onRetry={() => {
          setLoadingTimedOut(false);
          viewModel.refetchJob();
        }}
      />
    );
  }
  if (!job) {
    return (
      <ErrorView message='Job not found' onRetry={() => navigation.goBack()} />
    );
  }

  // Normalize the mixed photo shapes the API returns. Job rows can
  // carry photos either as plain URL strings or as `{file_url|...}`
  // objects depending on which read path served them.
  const photos = normalizePhotoUrls(job.photos ?? job.images);
  const hasPhotos = photos.length > 0;
  const locationStr =
    typeof job.location === 'string' ? job.location : job.city || '';
  const budget = job.budget || job.budget_min || 0;
  const urgency = job.urgency || job.priority || 'medium';
  const categoryIcon =
    CAT_ICONS[job.category?.toLowerCase() || ''] || 'construct-outline';
  const daysAgo = Math.floor(
    (Date.now() -
      new Date(job.created_at || job.createdAt || Date.now()).getTime()) /
      (1000 * 3600 * 24)
  );

  // 2026-05-01 audit P0 (`contractor_locations = 0` root cause): the
  // location section was previously gated on `in_progress` only, but
  // production has never had a job in that state. Showing it on
  // `assigned` too lets the contractor share location during travel —
  // the actual product intent. Auto-start still requires permission.
  const showLocationTracking =
    job.status === 'assigned' || job.status === 'in_progress';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {hasPhotos ? (
          <ImageCarousel
            images={photos}
            height={IMAGE_CAROUSEL_HEIGHT}
            width={SCREEN_WIDTH}
            showDots
            gradientOverlay
          />
        ) : (
          <View style={styles.placeholderHero}>
            <Ionicons name={categoryIcon} size={64} color={me.ink3} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={24} color={me.onBrand} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareButton, { top: insets.top + 8 }]}
          onPress={() => {
            Share.share({
              message: `${job.title} - Check out this job on Mintenance: https://mintenance.com/jobs/${job.id}`,
            });
          }}
          accessibilityRole='button'
          accessibilityLabel='Share this job'
        >
          <Ionicons name='share-outline' size={22} color={me.onBrand} />
        </TouchableOpacity>

        <JobLifecycleStepper
          jobStatus={job.status}
          contractStatus={viewModel.contractStatus}
        />

        <JobTitleSection
          title={job.title}
          category={job.category}
          urgency={urgency}
          locationStr={locationStr}
          daysAgo={daysAgo}
        />

        <View style={styles.divider} />

        {job.homeowner && (
          <View style={styles.sectionPadded}>
            <Text style={styles.sectionLabel}>Posted by</Text>
            <HostCard
              name={
                [job.homeowner.first_name, job.homeowner.last_name]
                  .filter(Boolean)
                  .join(' ') || 'Homeowner'
              }
              avatar={job.homeowner.profile_image_url}
              rating={job.homeowner.rating}
              metadata={
                job.homeowner.jobs_count
                  ? `${job.homeowner.jobs_count} jobs posted`
                  : undefined
              }
            />
          </View>
        )}

        {budget > 0 && (
          <JobPricingCard
            budget={budget}
            onEscrowInfo={() => setShowEscrowModal(true)}
          />
        )}

        <View style={styles.divider} />

        <JobDetailsList
          category={job.category}
          urgency={urgency}
          status={job.status}
        />

        <View style={styles.divider} />

        <View style={styles.sectionPadded}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {job.latitude != null && job.longitude != null && locationStr ? (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <JobLocationMap
                address={locationStr}
                latitude={job.latitude}
                longitude={job.longitude}
              />
            </View>
          </>
        ) : null}

        {isOwner && bidsArray.length > 0 && (
          <>
            <View style={styles.divider} />
            <JobBidsList bids={bidsArray} />
          </>
        )}

        {(viewModel.aiAnalysis || viewModel.aiLoading) && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <AIAnalysisCard
                aiAnalysis={viewModel.aiAnalysis}
                aiLoading={viewModel.aiLoading}
              />
            </View>
          </>
        )}

        {/* Property Rooms Slice 3 — frozen room scope.
            JobRoomScope self-renders nothing for jobs with no scope,
            so the layout is unchanged for legacy jobs. */}
        {job.id ? (
          <View style={styles.sectionPadded}>
            <JobRoomScope jobId={job.id} />
          </View>
        ) : null}

        {isOwner && job.status === 'posted' && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <ContractorAssignment
                job={job}
                onContractorAssigned={viewModel.handleContractorAssigned}
              />
            </View>
          </>
        )}

        {myPendingBid && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <WithdrawBidButton
                withdrawing={withdrawingBid}
                onPress={handleWithdrawBid}
              />
            </View>
          </>
        )}

        {isContractor &&
          job.contractor_id === user?.id &&
          showLocationTracking && (
            <>
              <View style={styles.divider} />
              <View style={styles.sectionPadded}>
                <ContractorLocationSection
                  jobId={job.id}
                  destination={
                    job.latitude != null && job.longitude != null
                      ? { latitude: job.latitude, longitude: job.longitude }
                      : undefined
                  }
                />
              </View>
            </>
          )}

        {isOwner && showLocationTracking && job.contractor_id && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <HomeownerLocationRequest jobId={job.id} />
            </View>
          </>
        )}

        {isContractor &&
          job.contractor_id === user?.id &&
          showLocationTracking && (
            <>
              <View style={styles.divider} />
              <View style={styles.sectionPadded}>
                <LogExpenseRow
                  onPress={() => {
                    // Expenses lives under ProfileTab → ProfileStack →
                    // Expenses. Cross-stack navigate through the parent
                    // tab navigator.
                    const parent = navigation.getParent?.() as
                      | { navigate: (name: string, params?: unknown) => void }
                      | undefined;
                    parent?.navigate('ProfileTab', {
                      screen: 'Expenses',
                      params: { jobId: job.id, jobTitle: job.title },
                    });
                  }}
                />
              </View>
            </>
          )}

        <View style={styles.divider} />

        <JobQuickActions
          jobId={job.id}
          jobTitle={job.title}
          isOwner={isOwner}
          status={job.status}
          isCompletionConfirmedByHomeowner={
            !!(job as CTAContext['job']).completion_confirmed_by_homeowner
          }
          onTimelinePress={() =>
            navigation.navigate('JobTimeline', { jobId: job.id })
          }
          onEditPress={() => navigation.navigate('JobEdit', { jobId: job.id })}
          onSignOffPress={() =>
            navigation.navigate('JobSignOff', { jobId: job.id })
          }
          onDisputePress={() =>
            navigation.navigate('Dispute', {
              jobId: job.id,
              jobTitle: job.title,
            })
          }
        />

        {/* Tips received (contractor read-only mirror of the web
            TipJarCard). Gated on completed + contractor — the GET
            in TipsReceivedSection is also RLS-scoped so a homeowner
            can't bypass and see the section. Renders null with no
            completed tips landed (silent UX). */}
        <TipsReceivedSection
          jobId={job.id}
          visible={
            isContractor &&
            job.contractor_id === user?.id &&
            job.status === 'completed'
          }
        />
      </ScrollView>

      {getPriorityCTA({
        job: job as CTAContext['job'],
        isOwner,
        isContractor,
        userId: user?.id,
        budget,
        navigation,
        contractStatus: viewModel.contractStatus,
        escrowStatus: viewModel.escrowStatus,
        hasReviewed: viewModel.hasReviewed,
        bidsArray,
      })}

      <EscrowInfoModal
        visible={showEscrowModal}
        onClose={() => setShowEscrowModal(false)}
      />
    </View>
  );
};

export default JobDetailsScreen;
