/**
 * JobsMap ViewModel
 *
 * Business logic for map-based job discovery (contractor view).
 * Fetches posted jobs from Supabase, calculates distance, sorts by proximity.
 *
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import * as Location from 'expo-location';

export interface JobMapItem {
  id: string;
  title: string;
  category: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  latitude: number;
  longitude: number;
  distance: number;
  homeowner_name: string;
  created_at: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface JobsMapViewModel {
  region: MapRegion;
  jobs: JobMapItem[];
  searchQuery: string;
  selectedJob: JobMapItem | null;
  selectedCategory: string | null;
  loading: boolean;
  jobCount: number;
  locationGranted: boolean;
  handleRegionChange: (region: MapRegion) => void;
  handleSearch: (query: string) => void;
  handleJobSelect: (job: JobMapItem | null) => void;
  handleCategorySelect: (category: string | null) => void;
  handleFilterPress: () => void;
  centerOnUser: () => void;
  refreshJobs: () => void;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const useJobsMapViewModel = (): JobsMapViewModel => {
  const { user } = useAuth();
  const isMounted = useRef(true);
  const [region, setRegion] = useState<MapRegion>({
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });
  const [jobs, setJobs] = useState<JobMapItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobMapItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  // Get user location on mount
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        // Check existing permission first (non-prompting)
        const { status: existing } = await Location.getForegroundPermissionsAsync();
        let finalStatus = existing;

        if (existing !== 'granted') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          finalStatus = status;
        }

        if (!isMounted.current) return;

        if (finalStatus === 'granted') {
          setLocationGranted(true);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
          });
          if (!isMounted.current) return;
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(coords);
          setRegion((prev) => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
        }
      } catch (err) {
        logger.warn('Location permission denied or unavailable', err);
      }
    })();
    return () => { isMounted.current = false; };
  }, []);

  // Fetch posted jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, category, urgency, budget_min, budget_max,
          latitude, longitude, created_at,
          homeowner:homeowner_id ( first_name )
        `)
        .eq('status', 'posted')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error fetching jobs for map', error);
        return;
      }

      const refLat = userLocation?.latitude ?? region.latitude;
      const refLng = userLocation?.longitude ?? region.longitude;

      const mapped: JobMapItem[] = (data || []).map((row: Record<string, unknown>) => {
        const homeowner = row.homeowner as { first_name?: string } | null;
        const lat = row.latitude as number;
        const lng = row.longitude as number;
        return {
          id: row.id as string,
          title: row.title as string,
          category: (row.category as string) || 'general',
          urgency: (row.urgency as string) || 'medium',
          budget_min: row.budget_min as number | null,
          budget_max: row.budget_max as number | null,
          latitude: lat,
          longitude: lng,
          distance: calculateDistance(refLat, refLng, lat, lng),
          homeowner_name: homeowner?.first_name || 'Homeowner',
          created_at: row.created_at as string,
        };
      });

      mapped.sort((a, b) => a.distance - b.distance);
      setJobs(mapped);
    } catch (err) {
      logger.error('Failed to fetch jobs for map', err);
    } finally {
      setLoading(false);
    }
  }, [userLocation, region.latitude, region.longitude]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRegionChange = useCallback((newRegion: MapRegion) => {
    setRegion(newRegion);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleJobSelect = useCallback((job: JobMapItem | null) => {
    setSelectedJob(job);
  }, []);

  const handleCategorySelect = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const handleFilterPress = useCallback(() => {
    logger.info('Filter button pressed');
  }, []);

  const centerOnUser = useCallback(async () => {
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
        });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        setRegion((prev) => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }));
      }
    } catch (err) {
      logger.warn('Could not get current location', err);
    }
  }, []);

  // Filter jobs by search query and category
  const filteredJobs = jobs.filter((j) => {
    if (selectedCategory && j.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.category.toLowerCase().includes(q);
    }
    return true;
  });

  return {
    region,
    jobs: filteredJobs,
    searchQuery,
    selectedJob,
    selectedCategory,
    loading,
    jobCount: filteredJobs.length,
    locationGranted,
    handleRegionChange,
    handleSearch,
    handleJobSelect,
    handleCategorySelect,
    handleFilterPress,
    centerOnUser,
    refreshJobs: fetchJobs,
  };
};

// Keep backward-compatible export name
export const useExploreMapViewModel = useJobsMapViewModel;
