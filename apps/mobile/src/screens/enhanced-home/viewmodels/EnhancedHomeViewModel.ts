/**
 * EnhancedHome ViewModel
 * 
 * Business logic and state management for Enhanced Home screen.
 * Handles special offers, services, and contractor data.
 * 
 * @filesize Target: <200 lines
 * @compliance MVVM pattern - Business logic only
 */

import { useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';

export interface SpecialOffer {
  id: string;
  title: string;
  discount: string;
  description: string;
  badge: string;
}

export interface Service {
  id: string;
  name: string;
  icon: keyof import('@expo/vector-icons/Ionicons').default['glyphMap'];
}

export interface TopContractor {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  services: string[];
  distance: string;
}

export interface EnhancedHomeState {
  location: string;
  searchQuery: string;
  specialOffers: SpecialOffer[];
  services: Service[];
  topContractors: TopContractor[];
  loading: boolean;
  error: string | null;
}

export interface EnhancedHomeActions {
  handleLocationChange: (location: string) => void;
  handleSearch: (query: string) => void;
  handleServicePress: (serviceId: string) => void;
  handleOfferClaim: (offerId: string) => void;
  handleContractorPress: (contractorId: string) => void;
  handleRefresh: () => Promise<void>;
}

export interface EnhancedHomeViewModel extends EnhancedHomeState, EnhancedHomeActions {}

/**
 * Custom hook providing Enhanced Home screen business logic
 */
export const useEnhancedHomeViewModel = (): EnhancedHomeViewModel => {
  // State
  const [location, setLocation] = useState('New York, USA');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data (in production, fetch from API)
  const specialOffers: SpecialOffer[] = [
    {
      id: '1',
      title: 'Get Special Discount',
      discount: '40%',
      description: 'All Services available | T&C Applied',
      badge: 'Limited time!',
    },
    {
      id: '2',
      title: 'First Time Customer',
      discount: '50%',
      description: 'New users only | Valid for 7 days',
      badge: 'New User',
    },
    {
      id: '3',
      title: 'Weekend Special',
      discount: '30%',
      description: 'Saturday & Sunday | All contractors',
      badge: 'Weekend',
    },
  ];

  const services: Service[] = [
    { id: '1', name: 'Plumbing', icon: 'water' },
    { id: '2', name: 'Electrical', icon: 'flash' },
    { id: '3', name: 'HVAC', icon: 'snow' },
    { id: '4', name: 'Carpentry', icon: 'hammer' },
    { id: '5', name: 'Painting', icon: 'color-palette' },
  ];

  const topContractors: TopContractor[] = [
    {
      id: '1',
      name: 'Elite Plumbing Co.',
      rating: 4.8,
      reviewCount: 234,
      services: ['Plumbing', 'Emergency'],
      distance: '2.5 km',
    },
    {
      id: '2',
      name: 'Pro Electricians',
      rating: 4.9,
      reviewCount: 189,
      services: ['Electrical', 'Wiring'],
      distance: '3.1 km',
    },
  ];

  // Actions
  const handleLocationChange = useCallback((newLocation: string) => {
    logger.info('Location changed', { location: newLocation });
    setLocation(newLocation);
  }, []);

  const handleSearch = useCallback((query: string) => {
    logger.info('Search query updated', { query });
    setSearchQuery(query);
  }, []);

  const handleServicePress = useCallback((serviceId: string) => {
    logger.info('Service selected', { serviceId });
    // Navigate to service screen or open modal
  }, []);

  const handleOfferClaim = useCallback((offerId: string) => {
    logger.info('Offer claimed', { offerId });
    // Handle offer claim logic
  }, []);

  const handleContractorPress = useCallback((contractorId: string) => {
    logger.info('Contractor selected', { contractorId });
    // Navigate to contractor profile
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('Data refreshed successfully');
    } catch (err) {
      logger.error('Failed to refresh data', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    location,
    searchQuery,
    specialOffers,
    services,
    topContractors,
    loading,
    error,

    // Actions
    handleLocationChange,
    handleSearch,
    handleServicePress,
    handleOfferClaim,
    handleContractorPress,
    handleRefresh,
  };
};
