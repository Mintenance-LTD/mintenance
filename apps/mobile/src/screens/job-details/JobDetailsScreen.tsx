/**
 * JobDetailsScreen - Airbnb Listing-Style Layout
 *
 * Full-bleed hero image carousel, host card, pricing breakdown,
 * detail sections, and sticky bottom CTA.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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
import { AIAnalysisCard } from './components';
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
        contentContainerStyle={{ paddingBottom: 120 }}
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
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>

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
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                  <Text style={styles.escrowText}>Escrow protected</Text>
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
      </ScrollView>

      {/* Single priority-based CTA — only ever one renders */}
      {getPriorityCTA({ job: job as CTAContext['job'], isOwner, isContractor, userId: user?.id, budget, navigation })}
    </View>
  );
};

// ── Priority CTA helper — exactly one action shown at a time ──
//
// Priority order (highest first):
//   Contractor: submit bid → view contract → upload before photos → upload after photos
//   Homeowner:  view bids → view contract → pay now → review work
interface CTAContext {
  job: Job & { bids?: { length: number }[] };
  isOwner: boolean;
  isContractor: boolean;
  userId: string | undefined;
  budget: number;
  navigation: JobDetailsScreenNavigationProp;
}

function getPriorityCTA({ job, isOwner, isContractor, userId, budget, navigation }: CTAContext): React.ReactElement | null {
  const isAssignedContractor = isContractor && job.contractor_id === userId;

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

  if (isOwner && job.status === 'posted' && job.bids && job.bids.length > 0) {
    return (
      <StickyBottomCTA
        buttonText={`View ${job.bids.length} Bid${job.bids.length !== 1 ? 's' : ''}`}
        onPress={() => navigation.navigate('BidReview', { jobId: job.id })}
        secondaryText="Review contractor bids"
      />
    );
  }

  if (job.status === 'assigned' && (isOwner || isAssignedContractor)) {
    // Contract signing takes priority over pay/photos — it must happen first
    return (
      <StickyBottomCTA
        buttonText="View Contract"
        onPress={() => navigation.navigate('ContractView', { jobId: job.id })}
        secondaryText={isOwner ? 'Sign to unlock payment' : 'Sign to start work'}
      />
    );
  }

  if (isOwner && job.status === 'in_progress' && budget > 0) {
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

  if (isAssignedContractor && job.status === 'in_progress') {
    return (
      <StickyBottomCTA
        buttonText="Upload After Photos"
        onPress={() => navigation.navigate('PhotoUpload', { jobId: job.id, photoType: 'after' })}
        secondaryText="Document completed work"
      />
    );
  }

  if (isOwner && job.status === 'completed') {
    return (
      <StickyBottomCTA
        buttonText="Review Work"
        onPress={() => navigation.navigate('PhotoReview', { jobId: job.id })}
        secondaryText="Compare before & after photos"
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
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionPadded: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 24,
  },

  // ── Title Section ──
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  urgentTag: {
    backgroundColor: '#FEF2F2',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // ── Pricing ──
  pricingCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
  },
  pricingMain: {
    marginBottom: 12,
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  pricingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  escrowText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },

  // ── Details ──
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },

  // ── Description ──
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
});

export default JobDetailsScreen;

