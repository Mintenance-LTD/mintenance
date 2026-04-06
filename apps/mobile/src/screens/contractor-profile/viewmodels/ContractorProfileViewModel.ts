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
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  date: string;
  comment: string;
  photos: string[];
}

export interface ContractorProfileState {
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
  };
  photos: string[];
  reviews: Review[];
  loading: boolean;
  error: string | null;
}

export interface ContractorProfileActions {
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
  portfolio_images?: string[];
}

interface ApiReview {
  id: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  created_at: string;
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
      // Cross-user read — only select publicly-safe columns (no phone/email/address)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, company_name, city, bio, skills, hourly_rate, verified, portfolio_images, rating, total_jobs_completed'
        )
        .eq('id', contractorId)
        .single();
      if (profileError) throw new Error(profileError.message);

      const data: ApiContractor = {
        id: profileData.id,
        name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
        company_name: profileData.company_name,
        city: profileData.city,
        bio: profileData.bio,
        rating: profileData.rating || 0,
        reviewCount: 0,
        total_jobs_completed: profileData.total_jobs_completed || 0,
        skills: profileData.skills,
        hourly_rate: profileData.hourly_rate,
        verified: profileData.verified,
        phone: undefined, // Phone not exposed in cross-user reads (PII protection)
        portfolio_images: profileData.portfolio_images,
      };

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
      });

      setPhotos(data.portfolio_images || []);

      // Fetch reviews
      try {
        const { data: reviewRows, error: reviewError } = await supabase
          .from('reviews')
          .select('id, reviewer_name, rating, comment, created_at')
          .eq('contractor_id', contractorId)
          .order('created_at', { ascending: false });
        if (reviewError) throw reviewError;
        setReviews(
          (reviewRows || []).map(
            (r: {
              id: string;
              reviewer_name?: string;
              rating: number;
              comment?: string;
              created_at: string;
            }) => ({
              id: r.id,
              reviewerName: r.reviewer_name || 'Anonymous',
              rating: r.rating,
              date: new Date(r.created_at).toLocaleDateString('en-GB', {
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
