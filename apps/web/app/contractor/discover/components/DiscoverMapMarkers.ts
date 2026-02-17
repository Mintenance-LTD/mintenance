/**
 * Map marker helpers for the Contractor Discover feature.
 *
 * All functions operate on Google Maps primitives and are intentionally kept
 * outside of React so they can be tested / reused without a component tree.
 */

import { calculateDistance, formatLocation } from './discoverUtils';

// ── Types ───────────────────────────────────────────────────────────────────

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

export interface MapJob {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  property: { address: string; postcode: string } | null;
  building_assessments?: AIAssessment[] | null;
  lat?: number;
  lng?: number;
  distance?: number;
}

export interface ContractorLocationForMap {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  postcode?: string | null;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Return a Google Maps Symbol object whose colour is derived from the job
 * category and whose size scales with priority.
 */
export function getMarkerIcon(
  category: string | null,
  priority: string | null,
): google.maps.Symbol {
  const categoryColors: Record<string, string> = {
    plumbing: '#3B82F6',
    electrical: '#F59E0B',
    hvac: '#10B981',
    roofing: '#DC2626',
    landscaping: '#059669',
    renovation: '#7C3AED',
    construction: '#EA580C',
    bathroom: '#06B6D4',
    windows: '#6366F1',
    commercial: '#EC4899',
  };

  const color =
    categoryColors[category?.toLowerCase() || ''] || '#14B8A6';
  const scale = priority === 'high' ? 12 : priority === 'low' ? 8 : 10;

  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale,
  };
}

/**
 * Clear existing markers, then create new ones for every job (grouping jobs
 * at the same coordinates into a carousel info-window).  Also adds the
 * contractor's own location marker when coordinates are available.
 *
 * Returns the array of markers that were placed on the map so the caller can
 * store them for later cleanup.
 */
export function updateMapMarkers(
  map: google.maps.Map,
  existingMarkers: google.maps.Marker[],
  jobs: MapJob[],
  contractorLocation: ContractorLocationForMap | null | undefined,
): google.maps.Marker[] {
  // Clear existing markers
  existingMarkers.forEach((marker) => marker.setMap(null));

  const markers: google.maps.Marker[] = [];
  const bounds = new google.maps.LatLngBounds();

  // ── Contractor location marker ──────────────────────────────────────────
  if (contractorLocation?.latitude && contractorLocation?.longitude) {
    const contractorMarker = new google.maps.Marker({
      position: {
        lat: contractorLocation.latitude,
        lng: contractorLocation.longitude,
      },
      map,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        fillColor: '#14B8A6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
      zIndex: 1000,
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
      contractorInfoWindow.open(map, contractorMarker);
    });

    markers.push(contractorMarker);
    bounds.extend({
      lat: contractorLocation.latitude,
      lng: contractorLocation.longitude,
    });
  }

  // ── Group jobs that share the same location ─────────────────────────────
  const LOCATION_THRESHOLD_KM = 0.05; // 50 metres
  const locationGroups = new Map<string, MapJob[]>();

  jobs.forEach((job) => {
    if (!job.lat || !job.lng) return;

    let addedToGroup = false;
    for (const [groupKey, groupJobs] of locationGroups.entries()) {
      const [groupLat, groupLng] = groupKey.split(',').map(Number);
      const distance = calculateDistance(job.lat, job.lng, groupLat, groupLng);

      if (distance < LOCATION_THRESHOLD_KM) {
        groupJobs.push(job);
        addedToGroup = true;
        break;
      }
    }

    if (!addedToGroup) {
      locationGroups.set(`${job.lat},${job.lng}`, [job]);
    }
  });

  // ── Create one marker per location group ────────────────────────────────
  let markersCreated = 0;

  locationGroups.forEach((jobsAtLocation, locationKey) => {
    const [lat, lng] = locationKey.split(',').map(Number);
    const primaryJob = jobsAtLocation[0];
    const carouselId = `carousel-${markersCreated}`;

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title:
        jobsAtLocation.length > 1
          ? `${jobsAtLocation.length} jobs at this location`
          : primaryJob.title,
      icon: getMarkerIcon(primaryJob.category, primaryJob.priority),
      animation:
        primaryJob.priority === 'high'
          ? google.maps.Animation.BOUNCE
          : undefined,
      label:
        jobsAtLocation.length > 1
          ? {
              text: String(jobsAtLocation.length),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            }
          : undefined,
    });

    markersCreated++;

    // Build carousel HTML
    const carouselHTML = buildCarouselHTML(
      jobsAtLocation,
      carouselId,
    );

    const infoWindow = new google.maps.InfoWindow({ content: carouselHTML });

    // Carousel navigation
    let currentIndex = 0;
    const windowWithCarousel = window as unknown as Record<string, unknown>;

    windowWithCarousel[`${carouselId}_next`] = () => {
      document
        .querySelector(`.${carouselId}-job-card-${currentIndex}`)
        ?.setAttribute('style', 'display: none');
      currentIndex = (currentIndex + 1) % jobsAtLocation.length;
      document
        .querySelector(`.${carouselId}-job-card-${currentIndex}`)
        ?.setAttribute(
          'style',
          'display: block; animation: fadeIn 0.3s',
        );
      const indexEl = document.getElementById(`${carouselId}-index`);
      if (indexEl) indexEl.textContent = String(currentIndex + 1);
    };

    windowWithCarousel[`${carouselId}_prev`] = () => {
      document
        .querySelector(`.${carouselId}-job-card-${currentIndex}`)
        ?.setAttribute('style', 'display: none');
      currentIndex =
        (currentIndex - 1 + jobsAtLocation.length) % jobsAtLocation.length;
      document
        .querySelector(`.${carouselId}-job-card-${currentIndex}`)
        ?.setAttribute(
          'style',
          'display: block; animation: fadeIn 0.3s',
        );
      const indexEl = document.getElementById(`${carouselId}-index`);
      if (indexEl) indexEl.textContent = String(currentIndex + 1);
    };

    marker.addListener('click', () => {
      currentIndex = 0;
      infoWindow.open(map, marker);
    });

    markers.push(marker);
    bounds.extend({ lat, lng });
  });

  // ── Fit map to markers ──────────────────────────────────────────────────
  if (markers.length > 0) {
    map.fitBounds(bounds);
    const listener = google.maps.event.addListener(map, 'idle', () => {
      const zoom = map.getZoom?.();
      if (zoom && zoom > 15) {
        map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }

  return markers;
}

// ── Private helpers ─────────────────────────────────────────────────────────

function buildCarouselHTML(
  jobsAtLocation: MapJob[],
  carouselId: string,
): string {
  const cards = jobsAtLocation
    .map((job, i) => buildJobCardHTML(job, i, carouselId))
    .join('');

  const navigation =
    jobsAtLocation.length > 1
      ? `
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
        >&#8249;</button>
        <button
          onclick="window.${carouselId}_next()"
          style="background: white; border: 1px solid #d1d5db; color: #374151; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"
          onmouseover="this.style.background='#f3f4f6'"
          onmouseout="this.style.background='white'"
        >&#8250;</button>
      </div>
    </div>
  `
      : '';

  return `
    <div style="padding: 12px; max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      ${navigation}
      <div id="${carouselId}-container">
        ${cards}
      </div>
    </div>
  `;
}

function buildJobCardHTML(
  job: MapJob,
  index: number,
  carouselId: string,
): string {
  const categoryDisplay = job.category
    ? job.category.charAt(0).toUpperCase() + job.category.slice(1)
    : '';
  const priorityColor =
    job.priority === 'high'
      ? '#DC2626'
      : job.priority === 'low'
        ? '#059669'
        : '#F59E0B';

  const aiAssessment =
    job.building_assessments && job.building_assessments.length > 0
      ? [...job.building_assessments].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        )[0]
      : null;

  const severityBadge = aiAssessment
    ? ({
        early: { color: '#10b981', label: 'Minor' },
        midway: { color: '#f59e0b', label: 'Moderate' },
        full: { color: '#ef4444', label: 'Severe' },
      } as const)[aiAssessment.severity] ?? null
    : null;

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
        <p style="font-weight: bold; color: #14b8a6; margin: 0; font-size: 18px;">\u00A3${Number(job.budget).toLocaleString()}</p>
        <p style="color: #9CA3AF; margin: 0; font-size: 12px;">${formatLocation(job.property)}</p>
      </div>
      ${
        aiAssessment?.assessment_data?.contractorAdvice?.estimatedCost
          ? `
        <div style="background: linear-gradient(135deg, #ede9fe, #fae8ff); border: 1px solid #ddd6fe; padding: 6px 8px; border-radius: 6px; margin-bottom: 12px;">
          <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">AI Repair Estimate</div>
          <div style="font-size: 13px; font-weight: 600; color: #1f2937;">\u00A3${aiAssessment.assessment_data.contractorAdvice.estimatedCost.min.toLocaleString()}-${aiAssessment.assessment_data.contractorAdvice.estimatedCost.max.toLocaleString()}</div>
        </div>
      `
          : ''
      }
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
}
