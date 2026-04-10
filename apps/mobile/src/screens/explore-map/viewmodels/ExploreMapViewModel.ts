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
  budget: number | null;
  budget_min: number | null;
  budget_max: number | null;
  latitude: number;
  longitude: number;
  distance: number;
  homeowner_name: string;
  created_at: string;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface JobsMapViewModel {
  region: MapRegion;
  jobs: JobMapItem[];
  searchQuery: string;
  selectedJob: JobMapItem | null;
  selectedCategory: string | null;
  loading: boolean;
  jobCount: number;
  locationGranted: boolean;
  hasPanned: boolean;
  userLocation: { latitude: number; longitude: number } | null;
  handleRegionChange: (region: MapRegion) => void;
  handleSearch: (query: string) => void;
  handleJobSelect: (job: JobMapItem | null) => void;
  handleCategorySelect: (category: string | null) => void;
  handleFilterPress: () => void;
  centerOnUser: () => void;
  refreshJobs: () => void;
  searchInRegion: () => void;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

const useJobsMapViewModel = (): JobsMapViewModel => {
  const { user } = useAuth();
  const isMounted = useRef(true);
  // Track initial region load so we don't fire hasPanned on mount
  const initialLoadDone = useRef(false);

  const [region, setRegion] = useState<MapRegion>({
    latitude: 51.5074,
    longitude: -0.1278,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });
  // Keep a ref so fetchJobs can read latest region without re-creating the callback
  const regionRef = useRef(region);
  regionRef.current = region;

  const [jobs, setJobs] = useState<JobMapItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<JobMapItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [hasPanned, setHasPanned] = useState(false);

  // Get user location on mount — prefers saved profile coordinates (home address), falls back to GPS
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        // Prefer the saved profile lat/lng — home maintenance is done at the user's home address.
        try {
          if (user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('latitude, longitude')
              .eq('id', user.id)
              .single();
            const lat = profile?.latitude;
            const lng = profile?.longitude;
            if (lat && lng && isMounted.current) {
              const coords = { latitude: lat, longitude: lng };
              setUserLocation(coords);
              setRegion((prev) => ({ ...prev, latitude: lat, longitude: lng }));
              logger.info('Map centered on saved profile coordinates');
              return;
            }
          }
        } catch {
          // Profile coords unavailable — fall through to GPS
        }

        if (!isMounted.current) return;

        const { status: existing } =
          await Location.getForegroundPermissionsAsync();
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
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
          setRegion((prev) => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }));
        }
        // If GPS denied and no profile coords, region stays as default (London)
      } catch (err) {
        logger.warn('Location initialisation failed', err);
      }
    })();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch jobs — uses regionRef so we don't re-create on every pan
  const fetchJobs = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    try {
      // Fetch posted jobs, then filter out ones this contractor already bid on
      const [jobsResult, bidsResult] = await Promise.all([
        supabase
          .from('jobs')
          .select(
            `
            id, title, category, urgency, budget, budget_min, budget_max,
            latitude, longitude, created_at,
            homeowner:homeowner_id ( first_name )
          `
          )
          .eq('status', 'posted')
          .is('contractor_id', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50),
        user?.id
          ? supabase.from('bids').select('job_id').eq('contractor_id', user.id)
          : Promise.resolve({ data: [] as { job_id: string }[], error: null }),
      ]);

      const { data, error } = jobsResult;
      const bidJobIds = new Set(
        (bidsResult.data ?? []).map((b: { job_id: string }) => b.job_id)
      );

      if (error) {
        logger.error('Error fetching jobs for map', error);
        return;
      }

      const refLat = userLocation?.latitude ?? regionRef.current.latitude;
      const refLng = userLocation?.longitude ?? regionRef.current.longitude;

      // Exclude jobs contractor already bid on
      const availableData = (data || []).filter(
        (row: Record<string, unknown>) => !bidJobIds.has(row.id as string)
      );

      const mapped: JobMapItem[] = availableData.map(
        (row: Record<string, unknown>) => {
          const homeowner = row.homeowner as { first_name?: string } | null;
          const lat = row.latitude as number;
          const lng = row.longitude as number;
          return {
            id: row.id as string,
            title: row.title as string,
            category: (row.category as string) || 'general',
            urgency: (row.urgency as string) || 'medium',
            budget: row.budget ? Number(row.budget) : null,
            budget_min: row.budget_min as number | null,
            budget_max: row.budget_max as number | null,
            latitude: lat,
            longitude: lng,
            distance: calculateDistance(refLat, refLng, lat, lng),
            homeowner_name: homeowner?.first_name || 'Homeowner',
            created_at: row.created_at as string,
          };
        }
      );

      mapped.sort((a, b) => a.distance - b.distance);

      // Jitter overlapping pins at the same coordinates
      const seen = new Map<string, number>();
      for (const job of mapped) {
        const key = `${job.latitude.toFixed(5)},${job.longitude.toFixed(5)}`;
        const count = seen.get(key) || 0;
        if (count > 0) {
          const angle = (count * 2 * Math.PI) / 6; // spread in a circle
          const offset = 0.0002; // ~20m
          job.latitude += offset * Math.cos(angle);
          job.longitude += offset * Math.sin(angle);
        }
        seen.set(key, count + 1);
      }

      if (isMounted.current) {
        setJobs(mapped);
        initialLoadDone.current = true;
      }
    } catch (err) {
      logger.error('Failed to fetch jobs for map', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [userLocation, user?.id]); // Depends on userLocation + user (to filter out own bids)

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Region change: set hasPanned only after initial load is done
  const handleRegionChange = useCallback((newRegion: MapRegion) => {
    setRegion(newRegion);
    if (initialLoadDone.current) {
      setHasPanned(true);
    }
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
      const { status: existing } =
        await Location.getForegroundPermissionsAsync();
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
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(coords);
        setRegion((prev) => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setHasPanned(false);
      }
    } catch (err) {
      logger.warn('Could not get current location', err);
    }
  }, []);

  // Search in the currently visible map region
  const searchInRegion = useCallback(() => {
    setHasPanned(false);
    fetchJobs();
  }, [fetchJobs]);

  // Filter jobs by search query and category
  const filteredJobs = jobs.filter((j) => {
    if (
      selectedCategory &&
      j.category.toLowerCase() !== selectedCategory.toLowerCase()
    )
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q)
      );
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
    hasPanned,
    userLocation,
    handleRegionChange,
    handleSearch,
    handleJobSelect,
    handleCategorySelect,
    handleFilterPress,
    centerOnUser,
    refreshJobs: fetchJobs,
    searchInRegion,
  };
};

// Keep backward-compatible export name
export const useExploreMapViewModel = useJobsMapViewModel;
