/**
 * JobDetailsScreen - Airbnb Listing-Style Layout
 *
 * Full-bleed hero image carousel, host card, pricing breakdown,
 * detail sections, and sticky bottom CTA.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import { useJobBids } from '../../hooks/useJobs';
import { BidService } from '../../services/BidService';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { HostCard } from '../../components/ui/HostCard';
import { ContractorAssignment } from '../../components/ContractorAssignment';
import { AIAnalysisCard, JobLifecycleStepper } from './components';
import { ContractorLocationSection } from './components/ContractorLocationSection';
import { HomeownerLocationRequest } from './components/HomeownerLocationRequest';
import { useAuth } from '../../contexts/AuthContext';
import { JobsStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { getPriorityCTA, CTAContext } from './JobDetailsCTA';
import { EscrowInfoModal } from './EscrowInfoModal';
import { styles } from './jobDetailsStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_CAROUSEL_HEIGHT = Math.round(SCREEN_WIDTH * 0.75);

type JobDetailsScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = NativeStackNavigationProp<
  JobsStackParamList,
  'JobDetails'
>;

interface Props {
  route: JobDetailsScreenRouteProp;
  navigation: JobDetailsScreenNavigationProp;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
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

/** Small helper row used in the Details section */
const DetailRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconContainer}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

/** Color mapping for bid status badges */
function bidStatusColors(status: string | undefined) {
  if (status === 'accepted')
    return { bg: '#D1FAE5', text: '#065F46', label: 'Accepted' };
  if (status === 'rejected')
    return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
  return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
}

export const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const viewModel = useJobDetailsViewModel(jobId);
  const insets = useSafeAreaInsets();
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [withdrawingBid, setWithdrawingBid] = useState(false);
  const { data: bidsData, refetch: refetchBids } = useJobBids(jobId);

  const job = viewModel.job;
  const isContractor = user?.role === 'contractor';
  const isOwner = user?.id === job?.homeowner_id;

  // Find the logged-in contractor's pending bid on this job
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bids come from both camelCase (Bid type) and snake_case (raw Supabase) formats
  const bidsArray = (Array.isArray(bidsData) ? bidsData : []) as Array<{
    id: string;
    contractorId?: string;
    contractor_id?: string;
    status?: string;
    amount?: number;
    description?: string;
    message?: string;
    contractor?: {
      first_name?: string;
      last_name?: string;
      company_name?: string;
      profile_image_url?: string;
    };
  }>;
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
            await BidService.withdrawBid(myPendingBid.id, user.id);
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
  }, [myPendingBid, user?.id, refetchBids, viewModel]);

  if (viewModel.jobLoading) {
    return <LoadingSpinner message='Loading job details...' />;
  }

  if (viewModel.jobError) {
    return (
      <ErrorView
        message='Failed to load job details'
        onRetry={viewModel.refetchJob}
      />
    );
  }

  if (!job) {
    return (
      <ErrorView message='Job not found' onRetry={() => navigation.goBack()} />
    );
  }

  const photos = job.photos || job.images || [];
  const hasPhotos = photos.length > 0;
  const locationStr =
    typeof job.location === 'string' ? job.location : job.city || '';
  const budget = job.budget || job.budget_min || 0;
  const urgency = job.urgency || job.priority || 'medium';
  const categoryIcon =
    CATEGORY_ICONS[job.category?.toLowerCase() || ''] || 'construct-outline';

  const daysAgo = Math.floor(
    (Date.now() -
      new Date(job.created_at || job.createdAt || Date.now()).getTime()) /
      (1000 * 3600 * 24)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 1. Hero Image Section (full-bleed) */}
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
            <Ionicons
              name={categoryIcon}
              size={64}
              color={theme.colors.textTertiary}
            />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Share button overlay */}
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
          <Ionicons
            name='share-outline'
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        {/* Lifecycle Stepper */}
        <JobLifecycleStepper
          jobStatus={job.status}
          contractStatus={viewModel.contractStatus}
        />

        {/* 2. Title Section */}
        <View style={styles.section}>
          <Text style={styles.title}>{job.title}</Text>

          <View style={styles.tagRow}>
            {job.category && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
                </Text>
              </View>
            )}
            {urgency !== 'low' && urgency !== 'medium' && (
              <View style={[styles.tag, styles.urgentTag]}>
                <Ionicons name='flame' size={12} color={theme.colors.error} />
                <Text style={[styles.tagText, { color: theme.colors.error }]}>
                  {urgency === 'emergency' ? 'Emergency' : 'Urgent'}
                </Text>
              </View>
            )}
          </View>

          {locationStr ? (
            <View style={styles.locationRow}>
              <Ionicons
                name='location-outline'
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.locationText}>{locationStr}</Text>
            </View>
          ) : null}

          <Text style={styles.metaText}>
            Posted{' '}
            {daysAgo === 0
              ? 'today'
              : daysAgo === 1
                ? '1 day ago'
                : `${daysAgo} days ago`}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 3. Host Card (homeowner info) */}
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

        {/* 5. Pricing Section */}
        {budget > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <Text style={styles.sectionLabel}>Budget</Text>
              <View style={styles.pricingCard}>
                <View style={styles.pricingMain}>
                  <Text style={styles.pricingAmount}>
                    {'\u00A3'}
                    {budget.toLocaleString()}
                  </Text>
                  <Text style={styles.pricingLabelText}>Estimated cost</Text>
                </View>
                <View style={styles.escrowBadge}>
                  <Ionicons
                    name='shield-checkmark'
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.escrowText}>Escrow protected</Text>
                  <TouchableOpacity
                    onPress={() => setShowEscrowModal(true)}
                    accessibilityRole='button'
                    accessibilityLabel='Learn how escrow protection works'
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name='information-circle-outline'
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* 6. Details Section */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionLabel}>Details</Text>
          <DetailRow
            icon='grid-outline'
            label='Category'
            value={
              job.category
                ? job.category.charAt(0).toUpperCase() + job.category.slice(1)
                : 'General'
            }
          />
          <DetailRow
            icon='alert-circle-outline'
            label='Urgency'
            value={
              urgency
                ? urgency.charAt(0).toUpperCase() + urgency.slice(1)
                : 'Medium'
            }
          />
          <DetailRow
            icon='calendar-outline'
            label='Timeline'
            value={
              job.status === 'completed'
                ? 'Completed'
                : job.status === 'in_progress'
                  ? 'In Progress'
                  : 'Awaiting start'
            }
          />
        </View>

        <View style={styles.divider} />

        {/* 7. Description Section */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* 7b. Bids Section (homeowner sees bids on their job) */}
        {isOwner && bidsArray.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <Text style={styles.sectionLabel}>Bids ({bidsArray.length})</Text>
              {bidsArray.map((bid) => {
                const sc = bidStatusColors(bid.status);
                return (
                  <View key={bid.id} style={styles.bidCard}>
                    <View style={styles.bidRow}>
                      <Text style={styles.bidContractorName}>
                        {bid.contractor?.first_name
                          ? `${bid.contractor.first_name} ${bid.contractor.last_name || ''}`.trim()
                          : bid.contractor?.company_name || 'Contractor'}
                      </Text>
                      <View style={styles.bidAmountRow}>
                        <Text style={styles.bidAmount}>
                          £
                          {typeof bid.amount === 'number'
                            ? bid.amount.toFixed(2)
                            : bid.amount}
                        </Text>
                        <View
                          style={[
                            styles.bidStatusBadge,
                            { backgroundColor: sc.bg },
                          ]}
                        >
                          <Text
                            style={[styles.bidStatusText, { color: sc.text }]}
                          >
                            {sc.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {(bid.description || bid.message) && (
                      <Text style={styles.bidMessage} numberOfLines={2}>
                        {bid.description || bid.message}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 8. AI Analysis (if available) */}
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

        {/* 9. Contractor Assignment */}
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

        {/* 9b. Withdraw Bid (contractor with pending bid) */}
        {myPendingBid && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <TouchableOpacity
                style={[
                  styles.withdrawBidButton,
                  withdrawingBid && { opacity: 0.5 },
                ]}
                onPress={handleWithdrawBid}
                disabled={withdrawingBid}
                accessibilityRole='button'
                accessibilityLabel='Withdraw your bid'
              >
                {withdrawingBid ? (
                  <ActivityIndicator color={theme.colors.error} size='small' />
                ) : (
                  <>
                    <Ionicons
                      name='close-circle-outline'
                      size={20}
                      color={theme.colors.error}
                    />
                    <Text style={styles.withdrawBidText}>Withdraw Bid</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 10. Location Tracking (contractor on active job) */}
        {isContractor &&
          job.contractor_id === user?.id &&
          job.status === 'in_progress' && (
            <>
              <View style={styles.divider} />
              <View style={styles.sectionPadded}>
                <ContractorLocationSection jobId={job.id} />
              </View>
            </>
          )}

        {/* 10b. Homeowner: Request contractor location */}
        {isOwner && job.status === 'in_progress' && job.contractor_id && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <HomeownerLocationRequest jobId={job.id} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Single priority-based CTA -- only ever one renders */}
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

      {/* Escrow Explanation Modal */}
      <EscrowInfoModal
        visible={showEscrowModal}
        onClose={() => setShowEscrowModal(false)}
      />
    </View>
  );
};

export default JobDetailsScreen;
