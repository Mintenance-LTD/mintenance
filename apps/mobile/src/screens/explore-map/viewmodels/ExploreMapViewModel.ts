/**
 * JobsMap ViewModel
 *
 * Business logic for map-based job discovery (contractor view).
 * Fetches posted jobs from Supabase, calculates distance, sorts by proximity.
 *
 * @compliance MVVM - Business logic only
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/logger';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import * as Location from 'expo-location';
import { radiusKmForRegion } from '../constants';

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
  // 2026-06-09: false until region resolves from profile coords/GPS; the
  // screen waits on it so the map opens on the user's area, not London.
  regionResolved: boolean;
  jobs: JobMapItem[];
  searchQuery: string;
  selectedJob: JobMapItem | null;
  selectedCategory: string | null;
  loading: boolean;
  // 2026-05-26 audit-58 P2: distinct from `loading` and an empty
  // `jobs` array so the UI can tell "no jobs match this area" from
  // "the discover endpoint blew up". Cleared on each fetchJobs attempt.
  errorMessage: string | null;
  // 2026-05-27 audit-72 P1: /api/jobs/discover returns
  // { jobs: [], code: 'CONTRACTOR_NOT_VERIFIED' } for pending
  // contractors. Without surfacing this distinctly the screen shows a
  // normal empty marketplace with no path forward; the banner needs to
  // tell the user verification is required + offer a CTA.
  verificationRequired: boolean;
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
  // Gate map + first job query until the real region resolves.
  const [regionResolved, setRegionResolved] = useState(false);
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
  // 2026-05-26 audit-58 P2: surface real discover failures instead of
  // letting them masquerade as "0 jobs".
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 2026-05-27 audit-72 P1: distinct gate for the
  // CONTRACTOR_NOT_VERIFIED response code so the screen can render a
  // verification-blocked banner with a "Continue verification" CTA
  // instead of the standard "no jobs in this area" empty state.
  const [verificationRequired, setVerificationRequired] = useState(false);

  // Get user location on mount — prefers saved profile coordinates (home address), falls back to GPS
  useEffect(() => {
    isMounted.current = true;
    (async () => {
      try {
        // Prefer the saved profile lat/lng — home maintenance is done at
        // the user's home address. Routes through /api/users/profile so
        // the screen no longer reads the profiles table directly.
        try {
          if (user?.id) {
            // /api/users/profile returns `{ profile: { latitude, longitude, ... } }`.
            // Previous read used `profile?.latitude` directly — the shape
            // mismatch silently broke the saved-coords path, so the
            // screen ALWAYS fell through to GPS even when the user had a
            // saved home address. Fixed 2026-05-22.
            //
            // lat/lng come back from Supabase as strings (Postgres
            // NUMERIC), so coerce defensively before use.
            const response = await mobileApiClient.get<{
              profile?: {
                latitude?: number | string | null;
                longitude?: number | string | null;
              };
            }>('/api/users/profile');
            const rawLat = response?.profile?.latitude;
            const rawLng = response?.profile?.longitude;
            const lat = rawLat == null ? null : Number(rawLat);
            const lng = rawLng == null ? null : Number(rawLng);
            if (
              lat !== null &&
              lng !== null &&
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              isMounted.current
            ) {
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
      } finally {
        // Resolved in every path (coords / GPS / fallback / error).
        if (isMounted.current) setRegionResolved(true);
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
      // /api/jobs/discover does the posted+unassigned+geo-filter query
      // server-side and excludes jobs this contractor has bid on, so the
      // mobile screen no longer hits jobs/bids tables directly. The
      // text-search refinement still happens client-side via the
      // `filteredJobs` selector — too complex to push to a single ILIKE.
      //
      // Audit follow-up (2026-04-29): pass the current map region so
      // the server filters by distance (PostGIS-backed since the
      // 2026-07-17 cutover) instead of "newest 50 anywhere".
      const currentRegion = regionRef.current;
      const params = new URLSearchParams({ limit: '50' });
      if (selectedCategory) params.set('category', selectedCategory);
      if (
        currentRegion &&
        Number.isFinite(currentRegion.latitude) &&
        Number.isFinite(currentRegion.longitude)
      ) {
        params.set('latitude', String(currentRegion.latitude));
        params.set('longitude', String(currentRegion.longitude));
        // Zoom-aware radius — see radiusKmForRegion in ../constants.
        params.set('radiusKm', String(radiusKmForRegion(currentRegion)));
      }

      // Numeric columns may arrive as strings if the server forgets to
      // coerce — accept both so a server regression can't crash the
      // native Marker render.
      interface DiscoverRow {
        id: string;
        title: string;
        category: string;
        urgency: string;
        budget: number | string | null;
        budget_min: number | string | null;
        budget_max: number | string | null;
        latitude: number | string | null;
        longitude: number | string | null;
        created_at: string | null;
        homeowner_first_name: string | null;
      }

      let response: { jobs: DiscoverRow[]; code?: string };
      try {
        response = await mobileApiClient.get<{
          jobs: DiscoverRow[];
          code?: string;
        }>(`/api/jobs/discover?${params.toString()}`);
      } catch (err) {
        // 2026-05-26 audit-58 P2: previously logged + returned silently,
        // leaving `jobs` whatever stale set was on the map from the
        // last successful fetch. Contractors couldn't tell whether
        // the empty/stale view was real or a network/API failure.
        // Clear the list, raise an errorMessage the screen renders
        // as a retry banner, and stop the loading spinner so the
        // user gets out of the indeterminate state.
        logger.error('Error fetching jobs for map', err);
        const apiErr = err as { statusCode?: number; status?: number };
        const code = apiErr?.statusCode ?? apiErr?.status;
        const msg =
          code === 401 || code === 403
            ? 'You are signed out or do not have access to job discovery.'
            : 'Could not load nearby jobs. Tap to retry.';
        if (isMounted.current) {
          setJobs([]);
          setErrorMessage(msg);
          setLoading(false);
        }
        return;
      }
      // Successful fetch — clear any stale error banner.
      if (isMounted.current) setErrorMessage(null);

      // 2026-05-27 audit-72 P1: /api/jobs/discover returns
      // { jobs: [], code: 'CONTRACTOR_NOT_VERIFIED' } when the
      // contractor's verification_status isn't 'verified' and they
      // aren't admin_verified. Previously we read jobs ?? [] and
      // silently rendered an empty marketplace — indistinguishable
      // from "no jobs in your area". Surface the gate distinctly so
      // the screen can render a verification-blocked banner with a
      // CTA back to the verification flow.
      if (response.code === 'CONTRACTOR_NOT_VERIFIED') {
        if (isMounted.current) {
          setVerificationRequired(true);
          setJobs([]);
          initialLoadDone.current = true;
        }
        return;
      }
      if (isMounted.current) setVerificationRequired(false);

      const data = response.jobs ?? [];

      const refLat = userLocation?.latitude ?? regionRef.current.latitude;
      const refLng = userLocation?.longitude ?? regionRef.current.longitude;

      // Server already excludes jobs the contractor bid on, dropped
      // missing-coords rows, and applied the category filter — but
      // we still coerce-and-validate every numeric field client-side
      // because Postgres NUMERIC columns are JSON-serialised as strings
      // by supabase-js, and passing a string to `react-native-maps`
      // <Marker coordinate={{...}}> crashes the native module on Android.
      const toNum = (v: unknown): number | null => {
        if (v == null) return null;
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const mapped: JobMapItem[] = data
        .map((row) => {
          const lat = toNum(row.latitude);
          const lng = toNum(row.longitude);
          if (lat === null || lng === null) return null;
          return {
            id: row.id,
            title: row.title,
            category: row.category || 'general',
            urgency: row.urgency || 'medium',
            budget: toNum(row.budget),
            budget_min: toNum(row.budget_min),
            budget_max: toNum(row.budget_max),
            latitude: lat,
            longitude: lng,
            distance: calculateDistance(refLat, refLng, lat, lng),
            homeowner_name: row.homeowner_first_name || 'Homeowner',
            created_at: row.created_at ?? '',
          };
        })
        .filter((j): j is JobMapItem => j !== null);

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
      // Outer catch covers everything outside the inner mobileApiClient
      // try/catch above (geo math, mapping). Audit-58 P2: also surface
      // these so post-fetch crashes don't manifest as a silently empty
      // map.
      logger.error('Failed to fetch jobs for map', err);
      if (isMounted.current) {
        setJobs([]);
        setErrorMessage('Could not load nearby jobs. Tap to retry.');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [userLocation, user?.id, selectedCategory]); // Depends on userLocation + user + category

  useEffect(() => {
    // Wait for the real region so the first query uses the user's area.
    if (regionResolved) fetchJobs();
  }, [regionResolved, fetchJobs]);

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
    regionResolved,
    jobs: filteredJobs,
    searchQuery,
    selectedJob,
    selectedCategory,
    loading,
    errorMessage,
    verificationRequired,
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
