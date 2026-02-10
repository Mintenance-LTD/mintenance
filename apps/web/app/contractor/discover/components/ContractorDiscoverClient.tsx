'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { DynamicGoogleMap } from '@/components/maps';
import { LocationPromptModal } from './LocationPromptModal';
import toast from 'react-hot-toast';
import { MapPin, List, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@mintenance/shared';

// Helper function to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

interface AIAssessment {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  created_at?: string;
  assessment_data?: {
    contractorAdvice?: {
      estimatedCost?: {
        min: number;
        max: number;
        recommended: number;
      };
      complexity?: 'low' | 'medium' | 'high';
    };
    safetyHazards?: {
      hasCriticalHazards: boolean;
      overallSafetyScore: number;
    };
  };
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  photos: string[] | null;
  created_at: string;
  homeowner: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    postcode: string;
  } | null;
  matchScore: number;
  building_assessments?: AIAssessment[] | null;
}

interface ContractorLocation {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  address?: string | null;
  postcode?: string | null;
}

interface ContractorDiscoverClientProps {
  jobs: Job[];
  contractorId: string;
  contractorLocation?: ContractorLocation | null;
}

export function ContractorDiscoverClient({
  jobs,
  contractorId,
  contractorLocation: initialContractorLocation,
}: ContractorDiscoverClientProps) {
  // Debug logging - track props received from server
  logger.info('[CLIENT] ContractorDiscoverClient Props', {
    totalJobs: jobs.length,
    contractorId,
    contractorLocation: initialContractorLocation,
    firstJob: jobs[0] ? {
      id: jobs[0].id,
      title: jobs[0].title,
      lat: (jobs[0] as Job & { latitude?: number }).latitude,
      lng: (jobs[0] as Job & { longitude?: number }).longitude,
      property: jobs[0].property
    } : null,
    service: 'ui',
  });

  const router = useRouter();
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [skippedJobIds, setSkippedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'cards'>('map');
  const [jobsWithCoordinates, setJobsWithCoordinates] = useState<(Job & { lat?: number; lng?: number; distance?: number })[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState<number>(10); // Default 10km radius
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [contractorLocation, setContractorLocation] = useState<ContractorLocation | null | undefined>(initialContractorLocation);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const geocodedJobIdsRef = useRef<Set<string>>(new Set());

  // Load saved jobs on mount
  useEffect(() => {
    loadSavedJobs();
  }, []);

  // Check if we should show location prompt
  useEffect(() => {
    const hasLocation = contractorLocation?.latitude && contractorLocation?.longitude;
    const isDismissed = localStorage.getItem('location-prompt-dismissed') === 'true';

    if (!hasLocation && !isDismissed) {
      // Show prompt after a short delay for better UX
      const timer = setTimeout(() => {
        setShowLocationPrompt(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [contractorLocation]);

  const loadSavedJobs = async () => {
    try {
      const response = await fetch('/api/contractor/saved-jobs');
      if (response.ok) {
        const data = await response.json();
        const savedIds = new Set<string>(data.jobIds || []);
        setSavedJobIds(savedIds);
      }
    } catch (error) {
      logger.error('Error loading saved jobs', error, { service: 'ui' });
    } finally {
      setLoadingSavedJobs(false);
    }
  };

  // Filter out only skipped jobs (saved jobs should remain visible with saved state)
  const availableJobs = useMemo(() =>
    jobs.filter(job => !skippedJobIds.has(job.id)),
    [jobs, skippedJobIds]
  );

  // Filter jobs by radius
  const filteredJobsByRadius = useMemo(() => {
    // If contractor has no location, show ALL jobs with coordinates
    if (!contractorLocation?.latitude || !contractorLocation?.longitude) {
      const filtered = jobsWithCoordinates.filter(job => job.lat && job.lng);
      logger.info('[CLIENT] Filtering (no contractor location)', {
        input: jobsWithCoordinates.length,
        output: filtered.length,
        contractorHasLocation: false,
        service: 'ui',
      });
      return filtered;
    }

    // If contractor has location, filter by radius
    const filtered = jobsWithCoordinates.filter(job => {
      if (!job.lat || !job.lng) return false; // Exclude jobs without coordinates
      if (!job.distance) return true; // Include jobs where distance calculation failed
      return job.distance <= selectedRadius;
    });

    logger.info('[CLIENT] Filtering (with contractor location)', {
      input: jobsWithCoordinates.length,
      output: filtered.length,
      radius: selectedRadius,
      contractorLocation: {
        lat: contractorLocation.latitude,
        lng: contractorLocation.longitude
      },
      service: 'ui',
    });

    return filtered;
  }, [jobsWithCoordinates, selectedRadius, contractorLocation]);

  const handleSaveToggle = async (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setIsLoading(jobId);
    const isCurrentlySaved = savedJobIds.has(jobId);

    try {
      if (isCurrentlySaved) {
        // Unsave the job
        const response = await fetch(`/api/contractor/saved-jobs?jobId=${jobId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': ((window as Window & { csrfToken?: string }).csrfToken) || '',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to unsave job');
        }

        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success('Job removed from saved');
      } else {
        // Save the job
        const response = await fetch('/api/contractor/saved-jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': ((window as Window & { csrfToken?: string }).csrfToken) || '',
          },
          body: JSON.stringify({ jobId }),
        });

        if (!response.ok) {
          const error = await response.json();
          // If already saved, still mark as saved locally
          if (response.status === 409) {
            setSavedJobIds(prev => new Set(prev).add(jobId));
            return;
          }
          throw new Error(error.error || 'Failed to save job');
        }

        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Job saved! You can view it in your saved jobs.');
      }
    } catch (error) {
      logger.error('Error toggling save', error, { service: 'ui' });
      toast.error(isCurrentlySaved ? 'Failed to unsave job' : 'Failed to save job');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSkip = (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSkippedJobIds(prev => new Set(prev).add(jobId));
  };

  const getUrgencyColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-600';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-600';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-600';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-600';
    }
  };

  const formatLocation = (property: Job['property']) => {
    if (!property) return 'Location not specified';
    return property.address.split(',')[0] || property.postcode || 'UK';
  };

  // Use stored coordinates from database and calculate distances
  useEffect(() => {
    // Jobs should already have latitude and longitude from the database
    const jobsWithCoords = availableJobs.map(job => {
      const jobWithCoords = job as Job & { latitude?: number; lat?: number; longitude?: number; lng?: number };
      const lat = jobWithCoords.latitude || jobWithCoords.lat;
      const lng = jobWithCoords.longitude || jobWithCoords.lng;

      // Calculate distance if contractor has location
      let distance: number | undefined;
      if (contractorLocation?.latitude && contractorLocation?.longitude && lat && lng) {
        distance = calculateDistance(
          contractorLocation.latitude,
          contractorLocation.longitude,
          lat,
          lng
        );
      }

      return {
        ...job,
        lat,
        lng,
        distance,
      };
    });

    logger.info('[CLIENT] Jobs with coordinates', {
      total: jobsWithCoords.length,
      withCoords: jobsWithCoords.filter(j => j.lat && j.lng).length,
      withoutCoords: jobsWithCoords.filter(j => !j.lat || !j.lng).length,
      sample: jobsWithCoords.slice(0, 2).map(j => ({
        id: j.id,
        title: j.title,
        lat: j.lat,
        lng: j.lng,
        distance: j.distance
      })),
      service: 'ui',
    });

    setJobsWithCoordinates(jobsWithCoords);
    setIsGeocoding(false);
  }, [availableJobs, contractorLocation]);

  // Handle map load
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMapMarkers();
  };

  // Update markers when jobs change
  useEffect(() => {
    if (mapRef.current && !isGeocoding) {
      updateMapMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobsByRadius, isGeocoding]);

  // Get custom marker icon based on job category and priority
  const getMarkerIcon = (category: string | null, priority: string | null) => {
    // Map categories to colors
    const categoryColors: Record<string, string> = {
      plumbing: '#3B82F6', // Blue
      electrical: '#F59E0B', // Yellow
      hvac: '#10B981', // Green
      roofing: '#DC2626', // Red
      landscaping: '#059669', // Emerald
      renovation: '#7C3AED', // Purple
      construction: '#EA580C', // Orange
      bathroom: '#06B6D4', // Cyan
      windows: '#6366F1', // Indigo
      commercial: '#EC4899', // Pink
    };

    const color = categoryColors[category?.toLowerCase() || ''] || '#14B8A6'; // Teal default
    const scale = priority === 'high' ? 12 : priority === 'low' ? 8 : 10;

    // Use Google Maps symbols with custom colors
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: scale,
    };
  };

  const updateMapMarkers = () => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    const bounds = new google.maps.LatLngBounds();

    // Add contractor's location marker if available
    if (contractorLocation?.latitude && contractorLocation?.longitude) {
      const contractorMarker = new google.maps.Marker({
        position: {
          lat: contractorLocation.latitude,
          lng: contractorLocation.longitude
        },
        map: mapRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: '#14B8A6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
        zIndex: 1000, // Make sure it's on top
      });

      const contractorInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h4 style="font-weight: bold; margin: 0 0 4px 0;">Your Location</h4>
            <p style="margin: 0; color: #666; font-size: 12px;">
              ${contractorLocation.address || contractorLocation.postcode || 'Current location'}
            </p>
          </div>
        `,
      });

      contractorMarker.addListener('click', () => {
        contractorInfoWindow.open(mapRef.current, contractorMarker);
      });

      markersRef.current.push(contractorMarker);
      bounds.extend({ lat: contractorLocation.latitude, lng: contractorLocation.longitude });
    }

    // GROUP JOBS BY LOCATION: Group jobs that are at the same/similar coordinates
    // This allows multiple jobs from same homeowner/location to be shown in a carousel
    const LOCATION_THRESHOLD_KM = 0.05; // Jobs within 50 meters considered same location
    const locationGroups = new Map<string, typeof filteredJobsByRadius>();

    filteredJobsByRadius.forEach(job => {
      if (job.lat && job.lng) {
        // Find existing group within threshold
        let addedToGroup = false;
        for (const [groupKey, jobs] of locationGroups.entries()) {
          const [groupLat, groupLng] = groupKey.split(',').map(Number);
          const distance = calculateDistance(job.lat, job.lng, groupLat, groupLng);

          if (distance < LOCATION_THRESHOLD_KM) {
            jobs.push(job);
            addedToGroup = true;
            break;
          }
        }

        // Create new group if not added to existing
        if (!addedToGroup) {
          const key = `${job.lat},${job.lng}`;
          locationGroups.set(key, [job]);
        }
      }
    });

    let markersCreated = 0;
    // Create one marker per location group
    locationGroups.forEach((jobsAtLocation, locationKey) => {
      const [lat, lng] = locationKey.split(',').map(Number);
      const primaryJob = jobsAtLocation[0]; // Use first job for marker appearance
      const carouselId = `carousel-${markersCreated}`; // Unique ID for each carousel

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current,
        title: jobsAtLocation.length > 1
          ? `${jobsAtLocation.length} jobs at this location`
          : primaryJob.title,
        icon: getMarkerIcon(primaryJob.category, primaryJob.priority),
        animation: primaryJob.priority === 'high' ? google.maps.Animation.BOUNCE : undefined,
        label: jobsAtLocation.length > 1 ? {
          text: String(jobsAtLocation.length),
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
        } : undefined,
      });

      markersCreated++;

      // CAROUSEL FOR MULTIPLE JOBS: Create carousel UI if multiple jobs at same location
      const createJobCard = (job: typeof primaryJob, index: number, total: number) => {
        const categoryDisplay = job.category ? job.category.charAt(0).toUpperCase() + job.category.slice(1) : '';
        const priorityColor = job.priority === 'high' ? '#DC2626' : job.priority === 'low' ? '#059669' : '#F59E0B';
        const aiAssessment = job.building_assessments && job.building_assessments.length > 0
          ? job.building_assessments.sort((a, b) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )[0]
          : null;
        const severityBadge = aiAssessment ? {
          early: { color: '#10b981', label: 'Minor' },
          midway: { color: '#f59e0b', label: 'Moderate' },
          full: { color: '#ef4444', label: 'Severe' }
        }[aiAssessment.severity] : null;

        return `
          <div class="${carouselId}-job-card-${index}" style="display: ${index === 0 ? 'block' : 'none'}; animation: fadeIn 0.3s;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
              ${job.priority ? `<span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${job.priority.toUpperCase()}</span>` : ''}
              ${categoryDisplay ? `<span style="background: #F3F4F6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${categoryDisplay}</span>` : ''}
              ${aiAssessment ? `<span style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AI</span>` : ''}
              ${severityBadge ? `<span style="background: ${severityBadge.color}20; color: ${severityBadge.color}; border: 1px solid ${severityBadge.color}40; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${severityBadge.label}</span>` : ''}
            </div>
            <h3 style="font-weight: bold; margin: 0 0 8px 0; color: #111827; font-size: 16px;">${job.title}</h3>
            <p style="color: #6B7280; margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;">${job.description.substring(0, 120)}...</p>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <p style="font-weight: bold; color: #14b8a6; margin: 0; font-size: 18px;">£${Number(job.budget).toLocaleString()}</p>
              <p style="color: #9CA3AF; margin: 0; font-size: 12px;">${formatLocation(job.property)}</p>
            </div>
            ${aiAssessment && aiAssessment.assessment_data?.contractorAdvice?.estimatedCost ? `
              <div style="background: linear-gradient(135deg, #ede9fe, #fae8ff); border: 1px solid #ddd6fe; padding: 6px 8px; border-radius: 6px; margin-bottom: 12px;">
                <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">AI Repair Estimate</div>
                <div style="font-size: 13px; font-weight: 600; color: #1f2937;">£${aiAssessment.assessment_data.contractorAdvice.estimatedCost.min.toLocaleString()}-${aiAssessment.assessment_data.contractorAdvice.estimatedCost.max.toLocaleString()}</div>
              </div>
            ` : ''}
            <button
              onclick="window.open('/contractor/bid/${job.id}/details', '_self')"
              style="width: 100%; background: #14b8a6; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;"
              onmouseover="this.style.background='#0D9488'"
              onmouseout="this.style.background='#14b8a6'"
            >
              View Details
            </button>
          </div>
        `;
      };

      const carouselHTML = `
        <div style="padding: 12px; max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          ${jobsAtLocation.length > 1 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: #f9fafb; padding: 8px 12px; border-radius: 8px;">
              <span style="font-size: 13px; font-weight: 600; color: #374151;">
                <span id="${carouselId}-index">1</span> of ${jobsAtLocation.length} jobs here
              </span>
              <div style="display: flex; gap: 6px;">
                <button
                  onclick="window.${carouselId}_prev()"
                  style="background: white; border: 1px solid #d1d5db; color: #374151; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"
                  onmouseover="this.style.background='#f3f4f6'"
                  onmouseout="this.style.background='white'"
                >
                  ‹
                </button>
                <button
                  onclick="window.${carouselId}_next()"
                  style="background: white; border: 1px solid #d1d5db; color: #374151; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"
                  onmouseover="this.style.background='#f3f4f6'"
                  onmouseout="this.style.background='white'"
                >
                  ›
                </button>
              </div>
            </div>
          ` : ''}
          <div id="${carouselId}-container">
            ${jobsAtLocation.map((job, i) => createJobCard(job, i, jobsAtLocation.length)).join('')}
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: carouselHTML,
      });

      // Carousel navigation logic - use unique function names per marker
      let currentIndex = 0;
      const windowWithCarousel = window as unknown as Record<string, unknown>;
      windowWithCarousel[`${carouselId}_next`] = () => {
        document.querySelector(`.${carouselId}-job-card-${currentIndex}`)?.setAttribute('style', 'display: none');
        currentIndex = (currentIndex + 1) % jobsAtLocation.length;
        document.querySelector(`.${carouselId}-job-card-${currentIndex}`)?.setAttribute('style', 'display: block; animation: fadeIn 0.3s');
        const indexEl = document.getElementById(`${carouselId}-index`);
        if (indexEl) indexEl.textContent = String(currentIndex + 1);
      };

      windowWithCarousel[`${carouselId}_prev`] = () => {
        document.querySelector(`.${carouselId}-job-card-${currentIndex}`)?.setAttribute('style', 'display: none');
        currentIndex = (currentIndex - 1 + jobsAtLocation.length) % jobsAtLocation.length;
        document.querySelector(`.${carouselId}-job-card-${currentIndex}`)?.setAttribute('style', 'display: block; animation: fadeIn 0.3s');
        const indexEl = document.getElementById(`${carouselId}-index`);
        if (indexEl) indexEl.textContent = String(currentIndex + 1);
      };

      marker.addListener('click', () => {
        currentIndex = 0; // Reset to first job when opening
        infoWindow.open(mapRef.current, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });

    // Fit map to markers
    if (markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds);
      // Prevent too much zoom
      const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
        const zoom = mapRef.current?.getZoom?.();
        if (zoom && zoom > 15 && mapRef.current) {
          mapRef.current.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  };

  const getHomeownerName = (homeowner: Job['homeowner']) => {
    if (!homeowner) return 'Homeowner';
    return `${homeowner.first_name} ${homeowner.last_name}`;
  };

  const getHomeownerInitial = (homeowner: Job['homeowner']) => {
    if (!homeowner || !homeowner.first_name) return 'H';
    return homeowner.first_name.charAt(0).toUpperCase();
  };

  // Handle location set from modal
  const handleLocationSet = (location: ContractorLocation) => {
    setContractorLocation(location);
    toast.success('Location saved successfully!');
    // Refresh the page to reload jobs with new location context
    router.refresh();
  };

  return (
    <ContractorPageWrapper>
      {/* Quick Stats Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Browse available projects and save your favorites
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {filteredJobsByRadius.length}
            </div>
            <div className="text-gray-600 text-xs">
              Available Jobs
              {contractorLocation?.latitude && contractorLocation?.longitude && (
                <span className="ml-1">within {selectedRadius}km</span>
              )}
            </div>
          </div>
          {savedJobIds.size > 0 && (
            <div className="text-right">
              <div className="text-lg font-semibold text-teal-600">
                {savedJobIds.size}
              </div>
              <div className="text-gray-600 text-xs">
                Saved
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {filteredJobsByRadius.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {contractorLocation?.latitude && selectedRadius < 100
                ? 'No Jobs in This Area'
                : 'You\'re All Caught Up!'}
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              {contractorLocation?.latitude && selectedRadius < 100
                ? `No jobs found within ${selectedRadius}km. Try increasing the radius.`
                : jobs.length === 0
                  ? 'No jobs available right now. Check back soon!'
                  : 'No more jobs to review right now'}
            </p>
            {jobs.length > 0 && (
              <button
                onClick={() => {
                  setSavedJobIds(new Set());
                  setSkippedJobIds(new Set());
                }}
                className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all"
              >
                Review Again
              </button>
            )}
          </div>
        ) : (
          // Split View - Map and Cards Side by Side
          <div className="flex gap-6">
            {/* Left Side - Job Cards (Scrollable) */}
            <div className="w-1/3 space-y-4 overflow-y-auto" style={{ maxHeight: '800px' }}>
              <div className="sticky top-0 bg-white z-10 pb-3 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Available Jobs ({filteredJobsByRadius.length})
                  {contractorLocation?.latitude && (
                    <span className="text-sm text-gray-500 ml-2">
                      within {selectedRadius}km
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Click on a job to view details</p>

                {/* Radius Selector */}
                {contractorLocation?.latitude && contractorLocation?.longitude && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Radius:</label>
                    <select
                      value={selectedRadius}
                      onChange={(e) => setSelectedRadius(Number(e.target.value))}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="5">5 km</option>
                      <option value="10">10 km</option>
                      <option value="20">20 km</option>
                      <option value="30">30 km</option>
                      <option value="50">50 km</option>
                      <option value="100">100 km</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-4 pr-2">
            {filteredJobsByRadius.map(job => (
              <div
                key={job.id}
                onClick={() => router.push(`/contractor/bid/${job.id}/details`)}
                className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
              >
                {/* Match Score Badge and Saved Indicator */}
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {savedJobIds.has(job.id) && (
                      <div className="px-3 py-1 bg-white text-teal-600 rounded-lg font-bold text-sm shadow-lg flex items-center gap-1 border-2 border-teal-500">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Saved
                      </div>
                    )}
                    <div className="px-3 py-1 bg-teal-600 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {job.matchScore}%
                    </div>
                  </div>

                  {/* Job Image/Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                    {job.photos && job.photos.length > 0 ? (
                      <img
                        src={job.photos[0]}
                        alt={job.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-20 h-20 text-teal-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Job Details */}
                <div className="p-6">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {job.category && (
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold">
                          {job.category}
                        </span>
                      )}
                      {job.priority && (
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold border ${getUrgencyColor(job.priority)}`}
                        >
                          {job.priority.charAt(0).toUpperCase() +
                            job.priority.slice(1)}
                        </span>
                      )}

                      {/* AI Assessment Badge */}
                      {job.building_assessments && job.building_assessments.length > 0 && (() => {
                        const assessment = job.building_assessments.sort((a, b) =>
                          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                        )[0];

                        const getSeverityColor = (severity: string) => {
                          switch (severity) {
                            case 'early': return 'bg-green-50 text-green-700 border-green-200';
                            case 'midway': return 'bg-amber-50 text-amber-700 border-amber-200';
                            case 'full': return 'bg-red-50 text-red-700 border-red-200';
                            default: return 'bg-gray-50 text-gray-700 border-gray-200';
                          }
                        };

                        return (
                          <>
                            <span className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" opacity="0.3" />
                                <path d="M12 7V12M12 16H12.01" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                              </svg>
                              AI Assessed
                            </span>

                            {assessment.severity && (
                              <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getSeverityColor(assessment.severity)}`}>
                                {assessment.severity === 'early' ? 'Minor' :
                                 assessment.severity === 'midway' ? 'Moderate' :
                                 assessment.severity === 'full' ? 'Severe' : assessment.severity} Issue
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Budget</div>
                      <div className="text-lg font-bold text-gray-900">
                        £{Number(job.budget).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Location</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {formatLocation(job.property)}
                      </div>
                      {job.distance && (
                        <div className="text-xs text-gray-500 mt-1">
                          {job.distance.toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Assessment Details */}
                  {job.building_assessments && job.building_assessments.length > 0 && (() => {
                    const assessment = job.building_assessments.sort((a, b) =>
                      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                    )[0];

                    const estimatedCost = assessment.assessment_data?.contractorAdvice?.estimatedCost;
                    const urgency = assessment.urgency;

                    if (!estimatedCost && !urgency) return null;

                    return (
                      <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg border border-indigo-100 mb-4">
                        <div className="flex items-center justify-between gap-3">
                          {estimatedCost && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <div className="text-xs text-gray-600">AI Estimate</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  £{estimatedCost.min.toLocaleString()}-{estimatedCost.max.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          )}

                          {urgency && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <div className="text-xs text-gray-600">Timeline</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {urgency === 'immediate' ? 'Immediate' :
                                   urgency === 'urgent' ? 'Urgent' :
                                   urgency === 'soon' ? 'Soon' :
                                   urgency === 'planned' ? 'Planned' : 'Monitor'}
                                </div>
                              </div>
                            </div>
                          )}

                          {assessment.assessment_data?.safetyHazards?.hasCriticalHazards && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 19h20L12 2zm0 3.17L19.62 18H4.38L12 5.17zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                              </svg>
                              <span className="text-xs font-medium text-red-600">Safety Risk</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Posted By */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {job.homeowner?.profile_image_url ? (
                        <img
                          src={job.homeowner.profile_image_url}
                          alt={getHomeownerName(job.homeowner)}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getHomeownerInitial(job.homeowner)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {getHomeownerName(job.homeowner)}
                      </div>
                      {job.homeowner?.rating && (
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3 text-amber-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">
                            {job.homeowner.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {!savedJobIds.has(job.id) && (
                      <button
                        onClick={(e) => handleSkip(job.id, e)}
                        disabled={isLoading === job.id}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Skip
                      </button>
                    )}
                    <button
                      onClick={(e) => handleSaveToggle(job.id, e)}
                      disabled={isLoading === job.id}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        savedJobIds.has(job.id)
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-teal-500'
                          : 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600'
                      }`}
                    >
                      {isLoading === job.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            {savedJobIds.has(job.id) ? (
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            ) : (
                              <path
                                fillRule="evenodd"
                                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                clipRule="evenodd"
                              />
                            )}
                          </svg>
                          {savedJobIds.has(job.id) ? 'Saved' : 'Save'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </div>

            {/* Right Side - Map */}
            <div className="flex-1">
              {/* Map Info Bar with Legend */}
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <span className="text-gray-700 font-medium">
                      {filteredJobsByRadius.length} jobs near you
                      {contractorLocation?.latitude && contractorLocation?.longitude && (
                        <span className="text-gray-500"> within {selectedRadius}km</span>
                      )}
                    </span>
                    {contractorLocation?.address && (
                      <span className="text-sm text-gray-500">• {contractorLocation.address}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Click markers for details
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '740px' }}>
                {isGeocoding ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <DynamicGoogleMap
                    center={{
                      lat: contractorLocation?.latitude || 51.5074,
                      lng: contractorLocation?.longitude || -0.1278
                    }}
                    zoom={12}
                    onMapLoad={handleMapLoad}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Prompt Modal */}
      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationSet={handleLocationSet}
        contractorId={contractorId}
      />
    </ContractorPageWrapper>
  );
}

// Also export as default for better compatibility with dynamic imports
export default ContractorDiscoverClient;
