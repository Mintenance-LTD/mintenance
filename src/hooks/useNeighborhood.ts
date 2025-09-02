import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { neighborhoodService, Neighborhood, NeighborhoodLeaderboard, ContractorRanking, NeighborReferral, CommunityEndorsement } from '../services/NeighborhoodService';
import { logger } from '../utils/logger';

// Query Keys
export const NEIGHBORHOOD_KEYS = {
  all: ['neighborhoods'] as const,
  neighborhood: (id: string) => ['neighborhoods', id] as const,
  leaderboard: (id: string) => ['neighborhoods', id, 'leaderboard'] as const,
  contractors: (id: string) => ['neighborhoods', id, 'contractors'] as const,
  activity: (id: string) => ['neighborhoods', id, 'activity'] as const,
  recommendations: (userId: string) => ['neighborhoods', 'recommendations', userId] as const,
  userNeighborhood: (userId: string) => ['neighborhoods', 'user', userId] as const,
};

// Hook for getting or creating user's neighborhood
export const useUserNeighborhood = (postcode?: string, latitude?: number, longitude?: number) => {
  return useQuery({
    queryKey: NEIGHBORHOOD_KEYS.userNeighborhood(postcode || ''),
    queryFn: async () => {
      if (!postcode || !latitude || !longitude) return null;
      return await neighborhoodService.getOrCreateNeighborhood(postcode, latitude, longitude);
    },
    enabled: Boolean(postcode && latitude && longitude),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for neighborhood leaderboard
export const useNeighborhoodLeaderboard = (neighborhoodId: string) => {
  return useQuery({
    queryKey: NEIGHBORHOOD_KEYS.leaderboard(neighborhoodId),
    queryFn: async () => await neighborhoodService.getNeighborhoodLeaderboard(neighborhoodId),
    enabled: Boolean(neighborhoodId),
    staleTime: 2 * 60 * 1000, // 2 minutes - leaderboards change frequently
  });
};

// Hook for top contractors in neighborhood
export const useTopContractors = (neighborhoodId: string, limit: number = 10) => {
  return useQuery({
    queryKey: [...NEIGHBORHOOD_KEYS.contractors(neighborhoodId), limit],
    queryFn: async () => await neighborhoodService.getTopContractors(neighborhoodId, limit),
    enabled: Boolean(neighborhoodId),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

// Hook for neighborhood activity feed
export const useNeighborhoodActivity = (neighborhoodId: string, limit: number = 20) => {
  return useQuery({
    queryKey: [...NEIGHBORHOOD_KEYS.activity(neighborhoodId), limit],
    queryFn: async () => await neighborhoodService.getNeighborhoodActivity(neighborhoodId, limit),
    enabled: Boolean(neighborhoodId),
    staleTime: 1 * 60 * 1000, // 1 minute - activity updates frequently
  });
};

// Hook for neighborhood-based contractor recommendations
export const useNeighborhoodRecommendations = (userId: string) => {
  return useQuery({
    queryKey: NEIGHBORHOOD_KEYS.recommendations(userId),
    queryFn: async () => await neighborhoodService.getNeighborhoodRecommendations(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for creating neighbor referrals
export const useCreateReferral = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      referrerId,
      contractorId,
      jobId,
      refereeContact
    }: {
      referrerId: string;
      contractorId: string;
      jobId: string;
      refereeContact: string;
    }) => {
      return await neighborhoodService.createNeighborReferral(
        referrerId,
        contractorId,
        jobId,
        refereeContact
      );
    },
    onSuccess: (data) => {
      // Invalidate activity feeds and recommendations
      queryClient.invalidateQueries({ 
        queryKey: NEIGHBORHOOD_KEYS.activity(data.neighborhood_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: NEIGHBORHOOD_KEYS.recommendations(data.referrer_id) 
      });
      
      logger.info('Neighbor referral created successfully', { 
        referralId: data.id 
      });
    },
    onError: (error) => {
      logger.error('Failed to create neighbor referral', error);
    }
  });
};

// Hook for adding community endorsements
export const useAddEndorsement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      endorserId,
      contractorId,
      skill,
      message
    }: {
      endorserId: string;
      contractorId: string;
      skill: string;
      message?: string;
    }) => {
      return await neighborhoodService.addCommunityEndorsement(
        endorserId,
        contractorId,
        skill,
        message
      );
    },
    onSuccess: (data) => {
      // Invalidate contractor rankings and activity feeds
      queryClient.invalidateQueries({ 
        queryKey: NEIGHBORHOOD_KEYS.contractors(data.neighborhood_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: NEIGHBORHOOD_KEYS.leaderboard(data.neighborhood_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: NEIGHBORHOOD_KEYS.activity(data.neighborhood_id) 
      });
      
      logger.info('Community endorsement added successfully', { 
        endorsementId: data.id 
      });
    },
    onError: (error) => {
      logger.error('Failed to add community endorsement', error);
    }
  });
};

// Hook for calculating community score
export const useCommunityScore = (neighborhoodId: string) => {
  return useQuery({
    queryKey: ['neighborhoods', neighborhoodId, 'community-score'],
    queryFn: async () => await neighborhoodService.calculateCommunityScore(neighborhoodId),
    enabled: Boolean(neighborhoodId),
    staleTime: 10 * 60 * 1000, // 10 minutes - scores don't change rapidly
  });
};

// Helper hook for formatting neighborhood data
export const useNeighborhoodFormatters = () => {
  const formatPostcode = (postcode: string): string => {
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatCommunityScore = (score: number): {
    score: number;
    level: 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Outstanding';
    color: string;
  } => {
    let level: 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'Outstanding';
    let color: string;

    if (score >= 80) {
      level = 'Outstanding';
      color = '#10B981'; // Green-500
    } else if (score >= 65) {
      level = 'Excellent';
      color = '#059669'; // Green-600
    } else if (score >= 50) {
      level = 'Good';
      color = '#F59E0B'; // Yellow-500
    } else if (score >= 30) {
      level = 'Fair';
      color = '#EF4444'; // Red-500
    } else {
      level = 'Poor';
      color = '#DC2626'; // Red-600
    }

    return { score, level, color };
  };

  const formatResponseTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatRankPosition = (position: number): string => {
    const suffix = position === 1 ? 'st' : 
                  position === 2 ? 'nd' : 
                  position === 3 ? 'rd' : 'th';
    return `${position}${suffix}`;
  };

  const getChampionBadgeEmoji = (championType: string): string => {
    switch (championType) {
      case 'referral_master': return '🤝';
      case 'review_hero': return '⭐';
      case 'quality_advocate': return '🏆';
      case 'helpful_neighbor': return '💪';
      default: return '🏅';
    }
  };

  const getBadgeLevelColor = (level: string): string => {
    switch (level) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#8B8B8B';
    }
  };

  return {
    formatPostcode,
    formatDistance,
    formatCommunityScore,
    formatResponseTime,
    formatRankPosition,
    getChampionBadgeEmoji,
    getBadgeLevelColor
  };
};

// Custom error types for neighborhood operations
export class NeighborhoodError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NeighborhoodError';
  }
}

export class EndorsementError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EndorsementError';
  }
}

export class ReferralError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ReferralError';
  }
}

// Utility functions for neighborhood operations
export const neighborhoodUtils = {
  isValidPostcode: (postcode: string): boolean => {
    const ukPostcodeRegex = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
    return ukPostcodeRegex.test(postcode.trim());
  },

  extractPostcodeArea: (postcode: string): string => {
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z]{1,2}[0-9]{1,2})/);
    return match ? match[1] : '';
  },

  isLondonPostcode: (postcode: string): boolean => {
    const area = neighborhoodUtils.extractPostcodeArea(postcode);
    const londonPrefixes = ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'];
    return londonPrefixes.some(prefix => area.startsWith(prefix));
  },

  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  getContractorSpecialtyIcon: (specialty: string): string => {
    const icons: Record<string, string> = {
      plumbing: '🔧',
      electrical: '⚡',
      painting: '🎨',
      carpentry: '🔨',
      gardening: '🌱',
      cleaning: '🧹',
      roofing: '🏠',
      heating: '🔥',
      flooring: '📐',
      handyman: '🛠️'
    };
    return icons[specialty.toLowerCase()] || '🔧';
  }
};