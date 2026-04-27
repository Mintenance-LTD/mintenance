/**
 * ContractorProfile ViewModel
 *
 * Business logic for contractor profile management.
 * Fetches real contractor data from the API.
 *
 * @filesize Target: <150 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback, useEffect } from 'react';
import { Share, Linking, Alert } from 'react-native';
import { logger } from '../../../utils/logger';
import { mobileApiClient } from '../../../utils/mobileApiClient';

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  date: string;
  comment: string;
  photos: string[];
}

interface ContractorProfileState {
  activeTab: 'photos' | 'reviews';
  contractor: {
    id: string;
    name: string;
    location: string;
    jobsCompleted: number;
    rating: number;
    reviews: number;
    bio?: string;
    skills?: string[];
    hourlyRate?: number;
    verified?: boolean;
    companyName?: string;
    phone?: string;
    profileImageUrl?: string | null;
    // R7 #9 + #11 trust signals (lazy-loaded from /api/contractors/:id)
    postcodePrefix?: string | null;
    postcodeProofCount?: number | null;
    disputeHistory?: {
      resolvedCount: number;
      unresolvedCount: number;
      avgResolutionHours?: number | null;
    };
  };
  photos: string[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
}

interface ContractorProfileActions {
  setActiveTab: (tab: 'photos' | 'reviews') => void;
  handleMessage: () => void;
  handleCall: () => void;
  handleVideo: () => void;
  handleShare: () => void;
  handleAddPhoto: () => void;
  refresh: () => Promise<void>;
}

export interface ContractorProfileViewModel
  extends ContractorProfileState, ContractorProfileActions {}

interface ApiContractor {
  id: string;
  name: string;
  company_name?: string;
  city?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  total_jobs_completed: number;
  skills?: string[];
  hourly_rate?: number;
  verified?: boolean;
  phone?: string;
  avatarUrl?: string | null;
  profile_image_url?: string | null;
  portfolio_images?: string[];
  postcode_prefix?: string | null;
  postcode_proof_count?: number | null;
  dispute_history?: {
    resolved_count: number;
    unresolved_count: number;
    avg_resolution_hours: number | null;
  };
}

const DEFAULT_CONTRACTOR: ContractorProfileState['contractor'] = {
  id: '',
  name: 'Loading...',
  location: '',
  jobsCompleted: 0,
  rating: 0,
  reviews: 0,
};

export const useContractorProfileViewModel = (
  contractorId?: string
): ContractorProfileViewModel => {
  const [activeTab, setActiveTab] = useState<'photos' | 'reviews'>('photos');
  const [contractor, setContractor] =
    useState<ContractorProfileState['contractor']>(DEFAULT_CONTRACTOR);
  const [photos, setPhotos] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!contractorId) {
      setError('No contractor ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { contractor: data } = await mobileApiClient.get<{
        contractor: ApiContractor;
      }>(`/api/contractors/${contractorId}`);

      setContractor({
        id: data.id,
        name: data.company_name || data.name,
        location: data.city || '',
        jobsCompleted: data.total_jobs_completed || 0,
        rating: data.rating || 0,
        reviews: data.reviewCount || 0,
        bio: data.bio,
        skills: data.skills,
        hourlyRate: data.hourly_rate,
        verified: data.verified,
        companyName: data.company_name,
        phone: data.phone,
        profileImageUrl: data.avatarUrl ?? data.profile_image_url ?? null,
        postcodePrefix: data.postcode_prefix ?? null,
        postcodeProofCount: data.postcode_proof_count ?? null,
        disputeHistory: data.dispute_history
          ? {
              resolvedCount: data.dispute_history.resolved_count,
              unresolvedCount: data.dispute_history.unresolved_count,
              avgResolutionHours: data.dispute_history.avg_resolution_hours,
            }
          : undefined,
      });

      setPhotos(
        (data.portfolio_images || []).filter(
          (url): url is string => typeof url === 'string' && url.length > 0
        )
      );

      // Fetch reviews
      try {
        const { reviews: reviewRows = [] } = await mobileApiClient.get<{
          reviews?: Array<{
            id: string;
            author?: string;
            rating: number;
            comment?: string;
            date: string;
          }>;
        }>(`/api/contractors/${contractorId}/reviews`);
        setReviews(
          (reviewRows || []).map(
            (r: {
              id: string;
              author?: string;
              rating: number;
              comment?: string;
              date: string;
            }) => ({
              id: r.id,
              reviewerName: r.author || 'Anonymous',
              rating: r.rating,
              date: new Date(r.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
              comment: r.comment || '',
              photos: [],
            })
          )
        );
        setContractor((prev) => ({
          ...prev,
          reviews: (reviewRows || []).length,
        }));
      } catch (reviewErr) {
        logger.warn('Failed to fetch reviews', reviewErr);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile';
      setError(msg);
      logger.error('Failed to fetch contractor profile', err);
    } finally {
      setLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleMessage = useCallback(() => {
    // Messaging requires an accepted bid / assigned job between homeowner and contractor.
    // The screen container controls visibility of the Message button based on `canMessage`.
    // Navigation to the messaging thread is handled by the screen when the button is shown.
    logger.info('Message contractor', { contractorId: contractor.id });
  }, [contractor.id]);

  const handleCall = useCallback(() => {
    if (contractor.phone) {
      Linking.openURL(`tel:${contractor.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to make a phone call');
      });
    } else {
      Alert.alert(
        'No Phone Number',
        'This contractor has not provided a phone number.'
      );
    }
  }, [contractor.phone]);

  const handleVideo = useCallback(() => {
    Alert.alert(
      'Coming Soon',
      'Video calls will be available in a future update.'
    );
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out ${contractor.name} on Mintenance!`,
        title: contractor.name,
      });
    } catch (err) {
      logger.error('Failed to share profile', err);
    }
  }, [contractor.name]);

  const handleAddPhoto = useCallback(() => {
    logger.info('Add photo to gallery', { contractorId: contractor.id });
  }, [contractor.id]);

  return {
    activeTab,
    contractor,
    photos,
    reviews,
    loading,
    error,
    setActiveTab,
    handleMessage,
    handleCall,
    handleVideo,
    handleShare,
    handleAddPhoto,
    refresh: fetchProfile,
  };
};
