/**
 * ExploreMap ViewModel
 * 
 * Business logic for map-based contractor discovery.
 * Handles location, search, and contractor selection.
 * 
 * @filesize Target: <120 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback } from 'react';
import { logger } from '../../../utils/logger';

export interface Contractor {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  distance: string;
  services: string[];
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface ExploreMapState {
  region: MapRegion;
  contractors: Contractor[];
  searchQuery: string;
  selectedContractor: Contractor | null;
}

export interface ExploreMapActions {
  handleRegionChange: (region: MapRegion) => void;
  handleSearch: (query: string) => void;
  handleContractorSelect: (contractor: Contractor | null) => void;
  handleFilterPress: () => void;
}

export interface ExploreMapViewModel extends ExploreMapState, ExploreMapActions {}

/**
 * Custom hook providing Explore Map screen logic
 */
export const useExploreMapViewModel = (): ExploreMapViewModel => {
  const [region, setRegion] = useState<MapRegion>({
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  // Mock contractors (in production, fetch based on region)
  const contractors: Contractor[] = [
    {
      id: '1',
      name: 'Elite Plumbing',
      rating: 4.8,
      reviewCount: 234,
      distance: '2.5 km',
      services: ['Plumbing', 'Emergency'],
      latitude: 40.7128,
      longitude: -74.006,
    },
    {
      id: '2',
      name: 'Pro Electricians',
      rating: 4.9,
      reviewCount: 189,
      distance: '3.1 km',
      services: ['Electrical'],
      latitude: 40.715,
      longitude: -74.01,
    },
  ];

  const handleRegionChange = useCallback((newRegion: MapRegion) => {
    setRegion(newRegion);
    logger.info('Map region changed', { region: newRegion });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    logger.info('Search query updated', { query });
  }, []);

  const handleContractorSelect = useCallback((contractor: Contractor | null) => {
    setSelectedContractor(contractor);
    logger.info('Contractor selected', { contractorId: contractor?.id });
  }, []);

  const handleFilterPress = useCallback(() => {
    logger.info('Filter button pressed');
    // Open filter modal
  }, []);

  return {
    // State
    region,
    contractors,
    searchQuery,
    selectedContractor,

    // Actions
    handleRegionChange,
    handleSearch,
    handleContractorSelect,
    handleFilterPress,
  };
};
