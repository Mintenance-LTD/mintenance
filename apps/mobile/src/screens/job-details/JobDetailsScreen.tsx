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
import { useJobBids, useMyBidForJob } from '../../hooks/useJobs';
import { BidService } from '../../services/BidService';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { HostCard } from '../../components/ui/HostCard';
import { ContractorAssignment } from '../../components/ContractorAssignment';
import { AIAnalysisCard, JobLifecycleStepper } from './components';
import { JobRoomScope } from '../components/JobRoomScope';
import { ContractorLocationSection } from './components/ContractorLocationSection';
import { HomeownerLocationRequest } from './components/HomeownerLocationRequest';
import { JobLocationMap } from './components/JobLocationMap';
import { ContractorOnTheWayBanner } from './components/ContractorOnTheWayBanner';
import { useContractorLiveLocation } from '../../hooks/useContractorLiveLocation';
import {
  JobAccessCard,
  type PropertyAccess,
  type PropertyContact,
} from './components/JobAccessCard';
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
  // 2026-05-26 audit-58 P3: previously `const { jobId } = route.params`
  // would throw if a deep link / notification / fallback route landed
  // here without params (or with an empty/undefined jobId). The
  // ScreenErrorBoundary above caught it but the in-screen ErrorView
  // never got a chance to render — and the boundary doesn't know the
  // route's `fallbackRoute='JobsList'` until after the crash. Guard
  // here so a malformed entry shows an actionable error instead of
  // tearing the screen down.
  const jobId = route?.params?.jobId;
  const { user } = useAuth();
  // useJobDetailsViewModel safely handles empty/undefined jobId (the
  // underlying useQuery stays disabled until a real id arrives) but
  // we still short-circuit the rest of the screen below if jobId
  // never resolves — a missing id is a hard failure for this surface.
  const viewModel = useJobDetailsViewModel(jobId ?? '');
  const insets = useSafeAreaInsets();
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [withdrawingBid, setWithdrawingBid] = useState(false);
  // 2026-05-21 audit: the spinner could sit forever when the API was
  // slow/stuck with no feedback. After 15s of continuous loading we
  // surface a retry — the underlying query will still resolve in the
  // background if the request eventually returns.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  // 2026-05-23 audit: /api/jobs/:id/bids is homeowner-only (returns 403
  // for non-owners). Gate the bids fetch on ownership so contractors
  // viewing public job details don't spam 403s + retries on this
  // endpoint. Until the job loads we can't be sure of ownership, so
  // the hook stays disabled — once viewModel.job arrives we re-enable
  // for owners only.
  const isJobOwner =
    !!viewModel.job?.homeowner_id &&
    !!user?.id &&
    viewModel.job.homeowner_id === user.id;
  const { data: bidsData, refetch: refetchBids } = useJobBids(jobId, {
    enabled: isJobOwner,
  });
  // 2026-05-24 audit-26 P1: contractor-side parallel query. When a
  // contractor opens a job they don't own, /api/jobs/:id/bids 403s,
  // so useJobBids stays disabled and bidsArray is empty — that
  // collapses every "Bid Pending" / "Edit Bid" CTA back to a fresh
  // "Submit Bid", even after deep-link / notification re-entry. The
  // owner-scoped check `contractor_id = auth.uid()` on
  // /api/contractor/bids?jobId= safely returns just the caller's
  // single bid (or empty), which we merge into bidsArray below so
  // the existing CTA logic in JobDetailsCTA picks it up unchanged.
  const isContractorViewer =
    !!user?.id && user.role === 'contractor' && !isJobOwner;
  const { data: myBidData, refetch: refetchMyBid } = useMyBidForJob(jobId, {
    enabled: isContractorViewer,
  });

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

  // Live contractor position for the homeowner's "on the way" banner + map.
  // One subscription, fed to the banner, the ETA card and JobLocationMap.
  // Gated to the homeowner of an assigned/in_progress job with a contractor
  // so contractors and stale jobs never open a needless channel.
  const contractorLive = useContractorLiveLocation(job?.id, {
    enabled:
      isOwner &&
      !!job?.contractor_id &&
      (job?.status === 'assigned' || job?.status === 'in_progress'),
  });

  // Homeowners get the full list from useJobBids; contractors get
  // their own single bid (zero or one row) from useMyBidForJob. The
  // arrays never overlap because the two queries are mutually
  // exclusive (gated on isJobOwner vs isContractorViewer above).
  const ownerBids = (Array.isArray(bidsData) ? bidsData : []) as BidListItem[];
  const myBidArray: BidListItem[] = myBidData
    ? [myBidData as unknown as BidListItem]
    : [];
  const bidsArray: BidListItem[] =
    ownerBids.length > 0 ? ownerBids : myBidArray;
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
            // 2026-05-24 audit-26 P1: contractors hit the contractor-
            // scoped query, not /api/jobs/:id/bids, so the owner
            // refetch above is a no-op for them. Refetch the
            // contractor's own bid so the CTA flips back to
            // "Submit Bid" after a successful withdrawal.
            refetchMyBid();
            viewModel.refetchJob();
          } catch {
            Alert.alert('Error', 'Failed to withdraw bid. Please try again.');
          } finally {
            setWithdrawingBid(false);
          }
        },
      },
    ]);
  }, [myPendingBid, user?.id, refetchBids, refetchMyBid, viewModel, jobId]);

  // 2026-05-26 audit-58 P3: deep link / fallback route arrived
  // without a usable jobId. Render a clear error rather than
  // letting useJobDetailsViewModel sit in a permanent "loading"
  // state with a disabled query.
  if (!jobId) {
    return (
      <ErrorView
        message='Missing job reference. The link you opened did not include a job id.'
        onRetry={() => navigation.goBack()}
      />
    );
  }
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

        {isOwner && contractorLive.isTraveling && (
          <ContractorOnTheWayBanner eta={contractorLive.eta} />
        )}

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

        {/* 2026-05-22: JobPricingCard hidden — contractors set their own
            price on each bid and the homeowner picks from the bids.
            Kept the import so the component file stays referenced for
            historical reuse; the gate is what changed. */}
        {false && budget > 0 && (
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
                contractorLocation={contractorLive.position}
              />
            </View>
          </>
        ) : null}

        {/* 2026-05-23 audit: surface property access details to the
            assigned contractor (key_safe_code is server-gated by the
            1h-before-scheduled-start window — we just render
            whatever the API returns). Homeowners don't need this on
            the job detail (their property page owns the edit).
            2026-05-24 audit-30 P1: also pass propertyContacts so the
            "& contacts" half of the card actually renders. */}
        {isContractor && user?.id === job.contractor_id
          ? (() => {
              const enriched = job as unknown as {
                propertyAccess?: PropertyAccess | null;
                propertyContacts?: PropertyContact[] | null;
              };
              const hasAccess = !!enriched.propertyAccess;
              const hasContacts =
                Array.isArray(enriched.propertyContacts) &&
                enriched.propertyContacts.length > 0;
              if (!hasAccess && !hasContacts) return null;
              return (
                <>
                  <View style={styles.divider} />
                  <View style={styles.sectionPadded}>
                    <JobAccessCard
                      access={enriched.propertyAccess ?? null}
                      contacts={enriched.propertyContacts ?? null}
                    />
                  </View>
                </>
              );
            })()
          : null}

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
              <HomeownerLocationRequest jobId={job.id} live={contractorLive} />
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
          // 2026-05-24 audit-27 P1: the quick-action sign-off used to
          // open JobSignOffScreen which only shows text + an Approve
          // button — bypassing the before/after photo review. The main
          // sticky CTA already goes to PhotoReview (which has the same
          // Approve/Request Changes mutations PLUS the BeforeAfterSlider
          // homeowners are supposed to see before releasing escrow).
          // Route the quick action there too so both entry points
          // surface the photo evidence.
          onSignOffPress={() =>
            navigation.navigate('PhotoReview', { jobId: job.id })
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
        contractHomeownerSigned: viewModel.contractHomeownerSigned,
        escrowStatus: viewModel.escrowStatus,
        hasReviewed: viewModel.hasReviewed,
        beforePhotoCount: viewModel.beforePhotoCount,
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
