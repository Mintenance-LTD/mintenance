/**
 * JobDetailsScreen - Airbnb Listing-Style Layout
 *
 * Full-bleed hero image carousel, host card, pricing breakdown,
 * detail sections, and sticky bottom CTA.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useJobDetailsViewModel } from './viewmodels/JobDetailsViewModel';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { HostCard } from '../../components/ui/HostCard';
import { StickyBottomCTA } from '../../components/ui/StickyBottomCTA';
import { JobStatusTracker } from '../../components/JobStatusTracker';
import { ContractorAssignment } from '../../components/ContractorAssignment';
import { AIAnalysisCard, JobLifecycleStepper } from './components';
import { ContractorLocationSection } from './components/ContractorLocationSection';
import { useAuth } from '../../contexts/AuthContext';
import { JobsStackParamList } from '../../navigation/types';
import type { Job } from '@mintenance/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type JobDetailsScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'JobDetails'>;

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

export const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const viewModel = useJobDetailsViewModel(jobId);
  const insets = useSafeAreaInsets();
  const [showEscrowModal, setShowEscrowModal] = useState(false);

  if (viewModel.jobLoading) {
    return <LoadingSpinner message="Loading job details..." />;
  }

  if (viewModel.jobError) {
    return (
      <ErrorView
        message="Failed to load job details"
        onRetry={viewModel.refetchJob}
      />
    );
  }

  if (!viewModel.job) {
    return (
      <ErrorView
        message="Job not found"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const job = viewModel.job;
  const photos = job.photos || job.images || [];
  const hasPhotos = photos.length > 0;
  const locationStr = typeof job.location === 'string' ? job.location : job.city || '';
  const budget = job.budget || job.budget_min || 0;
  const urgency = job.urgency || job.priority || 'medium';
  const categoryIcon = CATEGORY_ICONS[job.category?.toLowerCase() || ''] || 'construct-outline';
  const isContractor = user?.role === 'contractor';
  const isOwner = user?.id === job.homeowner_id;

  const daysAgo = Math.floor(
    (Date.now() - new Date(job.created_at || job.createdAt || Date.now()).getTime()) /
      (1000 * 3600 * 24)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing[24] + theme.spacing[6] }}
      >
        {/* 1. Hero Image Section (full-bleed) */}
        {hasPhotos ? (
          <ImageCarousel
            images={photos}
            height={320}
            width={SCREEN_WIDTH}
            showDots
            gradientOverlay
          />
        ) : (
          <View style={styles.placeholderHero}>
            <Ionicons name={categoryIcon} size={64} color={theme.colors.textTertiary} />
          </View>
        )}

        {/* Back button overlay */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Share button overlay */}
        <TouchableOpacity
          style={[styles.shareButton, { top: insets.top + 8 }]}
          onPress={() => {
            Share.share({
              message: `${job.title} - Check out this job on Mintenance: https://mintenance.com/jobs/${job.id}`,
            });
          }}
          accessibilityRole="button"
          accessibilityLabel="Share this job"
        >
          <Ionicons name="share-outline" size={22} color={theme.colors.textPrimary} />
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
                <Ionicons name="flame" size={12} color={theme.colors.error} />
                <Text style={[styles.tagText, { color: theme.colors.error }]}>
                  {urgency === 'emergency' ? 'Emergency' : 'Urgent'}
                </Text>
              </View>
            )}
          </View>

          {locationStr ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>{locationStr}</Text>
            </View>
          ) : null}

          <Text style={styles.metaText}>
            Posted {daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* 3. Status Tracker */}
        <View style={styles.section}>
          <JobStatusTracker
            job={job}
            onStatusUpdate={viewModel.handleJobStatusUpdate}
          />
        </View>

        <View style={styles.divider} />

        {/* 4. Host Card (homeowner info) */}
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
              metadata={job.homeowner.jobs_count ? `${job.homeowner.jobs_count} jobs posted` : undefined}
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
                    {'\u00A3'}{budget.toLocaleString()}
                  </Text>
                  <Text style={styles.pricingLabel}>Estimated cost</Text>
                </View>
                <View style={styles.escrowBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.escrowText}>Escrow protected</Text>
                  <TouchableOpacity
                    onPress={() => setShowEscrowModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Learn how escrow protection works"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
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
            icon="grid-outline"
            label="Category"
            value={job.category ? job.category.charAt(0).toUpperCase() + job.category.slice(1) : 'General'}
          />
          <DetailRow
            icon="alert-circle-outline"
            label="Urgency"
            value={urgency ? urgency.charAt(0).toUpperCase() + urgency.slice(1) : 'Medium'}
          />
          <DetailRow
            icon="calendar-outline"
            label="Timeline"
            value={job.status === 'completed' ? 'Completed' : job.status === 'in_progress' ? 'In Progress' : 'Awaiting start'}
          />
        </View>

        <View style={styles.divider} />

        {/* 7. Description Section */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

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

        {/* 10. Location Tracking (contractor on active job) */}
        {isContractor && job.contractor_id === user?.id && job.status === 'in_progress' && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionPadded}>
              <ContractorLocationSection jobId={job.id} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Single priority-based CTA — only ever one renders */}
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
      })}

      {/* Escrow Explanation Modal */}
      <Modal
        visible={showEscrowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEscrowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityRole="none" accessibilityLabel="Escrow protection information">
            <Text style={styles.modalTitle}>How Escrow Protection Works</Text>

            <View style={styles.escrowStep}>
              <View style={styles.escrowStepIcon}>
                <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.escrowStepContent}>
                <Text style={styles.escrowStepTitle}>Payment Held Securely</Text>
                <Text style={styles.escrowStepDescription}>
                  Your payment is held in escrow until the job is complete
                </Text>
              </View>
            </View>

            <View style={styles.escrowStep}>
              <View style={styles.escrowStepIcon}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.escrowStepContent}>
                <Text style={styles.escrowStepTitle}>Approve Completed Work</Text>
                <Text style={styles.escrowStepDescription}>
                  Review before/after photos and approve the work
                </Text>
              </View>
            </View>

            <View style={styles.escrowStep}>
              <View style={styles.escrowStepIcon}>
                <Ionicons name="cash" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.escrowStepContent}>
                <Text style={styles.escrowStepTitle}>Payment Released</Text>
                <Text style={styles.escrowStepDescription}>
                  Funds are released to the contractor after your approval
                </Text>
              </View>
            </View>

            <Text style={styles.escrowFooterNote}>
              If you don't respond within 7 days, payment is automatically released.
            </Text>

            <TouchableOpacity
              style={styles.escrowModalButton}
              onPress={() => setShowEscrowModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close escrow information"
            >
              <Text style={styles.escrowModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Priority CTA helper — exactly one action shown at a time ──
//
// Contractor: submit bid → prepare contract → view contract → upload before photos → upload after photos
// Homeowner:  view bids → view contract → pay now → review work → leave review
interface CTAContext {
  job: Job & { bids?: { length: number }[]; completion_confirmed_by_homeowner?: boolean };
  isOwner: boolean;
  isContractor: boolean;
  userId: string | undefined;
  budget: number;
  navigation: JobDetailsScreenNavigationProp;
  contractStatus: string | null;
  escrowStatus: string | null;
  hasReviewed: boolean;
}

function getPriorityCTA({ job, isOwner, isContractor, userId, budget, navigation, contractStatus, escrowStatus, hasReviewed }: CTAContext): React.ReactElement | null {
  const isAssignedContractor = isContractor && job.contractor_id === userId;

  // ── Contractor flow ──

  if (isContractor && job.status === 'posted') {
    return (
      <StickyBottomCTA
        price={budget > 0 ? budget : undefined}
        priceLabel="Estimated budget"
        buttonText="Submit Bid"
        onPress={() => navigation.navigate('BidSubmission', { jobId: job.id })}
      />
    );
  }

  // Contractor: assigned + contract is draft → prepare contract
  if (isAssignedContractor && job.status === 'assigned' && contractStatus === 'draft') {
    return (
      <StickyBottomCTA
        buttonText="Prepare Contract"
        onPress={() => navigation.navigate('ContractPreparation', { jobId: job.id, jobTitle: job.title })}
        secondaryText="Fill in contract terms for homeowner"
      />
    );
  }

  // Contractor: assigned + contract pending (not yet accepted) → view contract
  if (isAssignedContractor && job.status === 'assigned' && contractStatus && contractStatus !== 'draft' && contractStatus !== 'accepted') {
    return (
      <StickyBottomCTA
        buttonText="View Contract"
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText="Review and sign contract"
      />
    );
  }

  // Contractor: assigned + contract accepted + escrow held → upload before photos
  if (isAssignedContractor && job.status === 'assigned' && contractStatus === 'accepted' && escrowStatus === 'held') {
    return (
      <StickyBottomCTA
        buttonText="Upload Before Photos"
        onPress={() => navigation.navigate('PhotoUpload', { jobId: job.id, photoType: 'before' })}
        secondaryText="Required before starting work"
      />
    );
  }

  // Contractor: in_progress → upload after photos
  if (isAssignedContractor && job.status === 'in_progress') {
    return (
      <StickyBottomCTA
        buttonText="Upload After Photos"
        onPress={() => navigation.navigate('PhotoUpload', { jobId: job.id, photoType: 'after' })}
        secondaryText="Document completed work"
      />
    );
  }

  // ── Homeowner flow ──

  if (isOwner && job.status === 'posted' && job.bids && job.bids.length > 0) {
    return (
      <StickyBottomCTA
        buttonText={`View ${job.bids.length} Bid${job.bids.length !== 1 ? 's' : ''}`}
        onPress={() => navigation.navigate('BidReview', { jobId: job.id })}
        secondaryText="Review contractor bids"
      />
    );
  }

  // Homeowner: assigned + contract pending_homeowner → view/sign contract
  if (isOwner && job.status === 'assigned' && contractStatus && contractStatus !== 'accepted') {
    return (
      <StickyBottomCTA
        buttonText="View Contract"
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText="Review and sign contract"
      />
    );
  }

  // Homeowner: assigned + contract accepted + escrow not funded → pay now
  if (isOwner && job.status === 'assigned' && contractStatus === 'accepted' && escrowStatus !== 'held' && budget > 0) {
    return (
      <StickyBottomCTA
        price={budget}
        priceLabel="Contract amount"
        buttonText="Pay Now"
        onPress={() => navigation.navigate('JobPayment', {
          jobId: job.id,
          amount: budget,
          contractorId: job.contractor_id || '',
        })}
        secondaryText="Secure payment in escrow"
      />
    );
  }

  // Homeowner: completed + not confirmed → review work (before/after photos)
  if (isOwner && job.status === 'completed' && !job.completion_confirmed_by_homeowner) {
    return (
      <StickyBottomCTA
        buttonText="Review Work"
        onPress={() => navigation.navigate('PhotoReview', { jobId: job.id })}
        secondaryText="Compare before & after photos"
      />
    );
  }

  // Homeowner: completed + confirmed + not reviewed → leave a review
  if (isOwner && job.status === 'completed' && job.completion_confirmed_by_homeowner && !hasReviewed) {
    return (
      <StickyBottomCTA
        buttonText="Leave a Review"
        onPress={() => navigation.navigate('ReviewSubmission', {
          jobId: job.id,
          jobTitle: job.title,
          contractorName: undefined,
        })}
        secondaryText="Rate your experience"
      />
    );
  }

  return null;
}

// ── Detail Row Component ──
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  placeholderHero: {
    height: 240,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: theme.spacing.md,
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlayWhite20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  shareButton: {
    position: 'absolute',
    right: theme.spacing.md,
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.overlayWhite20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing[5],
  },
  sectionPadded: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.lg,
  },

  // ── Title Section ──
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing.xs + 1,
    borderRadius: theme.borderRadius.sm + 2,
    gap: theme.spacing.xs,
  },
  urgentTag: {
    backgroundColor: theme.colors.error + '15',
  },
  tagText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  locationText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },

  // ── Pricing ──
  pricingCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  pricingMain: {
    marginBottom: theme.spacing[3],
  },
  pricingAmount: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  pricingLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm - 2,
  },
  escrowText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },

  // ── Details ──
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    minHeight: theme.spacing[12],
  },
  detailIconContainer: {
    width: theme.spacing[10],
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },

  // ── Description ──
  description: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },

  // ── Escrow Info Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayDark50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  escrowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[5],
    gap: theme.spacing[3] + 2,
  },
  escrowStepIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowStepContent: {
    flex: 1,
  },
  escrowStepTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  escrowStepDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  escrowFooterNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing[5],
    lineHeight: 18,
    fontStyle: 'italic',
  },
  escrowModalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl - 2,
    paddingVertical: theme.spacing[3] + 2,
    alignItems: 'center',
  },
  escrowModalButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
});

export default JobDetailsScreen;

