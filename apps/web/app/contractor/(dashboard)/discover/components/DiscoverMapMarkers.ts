/**
 * Map marker helpers for the Contractor Discover feature.
 *
 * All functions operate on Google Maps primitives and are intentionally kept
 * outside of React so they can be tested / reused without a component tree.
 */

import { calculateDistance, formatLocation } from './discoverUtils';
import { createMapElement } from '@/components/maps/info-window-content';

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

export interface CoverageAreaForMap {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  isPrimary: boolean;
}

// Mint brand — resolved from the design-system CSS variable so the
// overlay tracks the token (mirrors mobile `me.brand`). google.maps
// needs a concrete color string, so read the var at draw time; the
// named-color fallback only covers a missing stylesheet.
function coverageColor(): string {
  if (typeof document !== 'undefined') {
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue('--me-brand')
      .trim();
    if (token) return token;
  }
  return 'seagreen';
}

/**
 * Draw the contractor's active service-area coverage circles
 * (2026-07-17). Clears any previously drawn set first; returns the new
 * circles so the caller can store them for cleanup. Radius mirrors the
 * notify-audience gating (max_distance_km over radius_km — resolved by
 * the caller).
 */
export function drawCoverageCircles(
  map: google.maps.Map,
  existing: google.maps.Circle[],
  areas: CoverageAreaForMap[]
): google.maps.Circle[] {
  existing.forEach((circle) => circle.setMap(null));
  const color = coverageColor();
  return areas.map(
    (area) =>
      new google.maps.Circle({
        map,
        center: { lat: area.lat, lng: area.lng },
        radius: area.radiusKm * 1000,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.08,
        clickable: false,
      })
  );
}

/**
 * Return a Google Maps Symbol object whose colour is derived from the job
 * category and whose size scales with priority.
 */
function getMarkerIcon(
  category: string | null,
  priority: string | null
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

  const color = categoryColors[category?.toLowerCase() || ''] || '#14B8A6';
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
  contractorLocation: ContractorLocationForMap | null | undefined
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

    const content = createMapElement('div', 'padding: 8px;');
    content.append(
      createMapElement(
        'h4',
        'font-weight: bold; margin: 0 0 4px 0;',
        'Your Location'
      )
    );
    content.append(
      createMapElement(
        'p',
        'margin: 0; color: #666; font-size: 12px;',
        contractorLocation.address ||
          contractorLocation.postcode ||
          'Current location'
      )
    );
    const contractorInfoWindow = new google.maps.InfoWindow({ content });

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
  locationGroups.forEach((jobsAtLocation, locationKey) => {
    const [lat, lng] = locationKey.split(',').map(Number);
    const primaryJob = jobsAtLocation[0];

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

    const carousel = buildCarouselContent(jobsAtLocation);
    const infoWindow = new google.maps.InfoWindow({
      content: carousel.content,
    });

    marker.addListener('click', () => {
      carousel.select(0);
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

function buildCarouselContent(jobs: MapJob[]) {
  const content = createMapElement(
    'div',
    'padding: 12px; max-width: 300px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;'
  );
  const cards = jobs.map(buildJobCardContent);
  const counter = createMapElement(
    'span',
    'font-size: 13px; font-weight: 600; color: #374151;'
  );
  let currentIndex = 0;
  const select = (index: number) => {
    currentIndex = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      card.hidden = cardIndex !== currentIndex;
    });
    counter.textContent = `${currentIndex + 1} of ${cards.length} jobs here`;
  };
  if (cards.length > 1) {
    const navigation = createMapElement(
      'div',
      'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: #f9fafb; padding: 8px 12px; border-radius: 8px;'
    );
    navigation.append(counter);
    const controls = createMapElement('div', 'display: flex; gap: 6px;');
    for (const direction of [-1, 1]) {
      const button = createMapElement(
        'button',
        'background: white; border: 1px solid #d1d5db; color: #374151; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;',
        direction === -1 ? '‹' : '›'
      );
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        direction === -1 ? 'Previous job' : 'Next job'
      );
      button.addEventListener('click', () => select(currentIndex + direction));
      controls.append(button);
    }
    navigation.append(controls);
    content.append(navigation);
  }
  content.append(...cards);
  select(0);
  return { content, select };
}

function buildJobCardContent(job: MapJob): HTMLDivElement {
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
            new Date(a.created_at || 0).getTime()
        )[0]
      : null;

  const severityBadge = aiAssessment
    ? ((
        {
          early: { color: '#10b981', label: 'Minor' },
          midway: { color: '#f59e0b', label: 'Moderate' },
          full: { color: '#ef4444', label: 'Severe' },
        } as const
      )[aiAssessment.severity] ?? null)
    : null;

  const card = createMapElement('div', 'animation: fadeIn 0.3s;');
  card.className = 'map-job-card';
  const badges = createMapElement(
    'div',
    'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;'
  );
  if (job.priority)
    badges.append(
      createMapElement(
        'span',
        `background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;`,
        job.priority.toUpperCase()
      )
    );
  if (categoryDisplay)
    badges.append(
      createMapElement(
        'span',
        'background: #F3F4F6; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 11px;',
        categoryDisplay
      )
    );
  if (aiAssessment)
    badges.append(
      createMapElement(
        'span',
        'background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;',
        'AI'
      )
    );
  if (severityBadge)
    badges.append(
      createMapElement(
        'span',
        `background: ${severityBadge.color}20; color: ${severityBadge.color}; border: 1px solid ${severityBadge.color}40; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;`,
        severityBadge.label
      )
    );
  card.append(badges);
  card.append(
    createMapElement(
      'h3',
      'font-weight: bold; margin: 0 0 8px 0; color: #111827; font-size: 16px;',
      job.title
    )
  );
  card.append(
    createMapElement(
      'p',
      'color: #6B7280; margin: 0 0 12px 0; font-size: 14px; line-height: 1.4;',
      `${job.description.substring(0, 120)}...`
    )
  );
  const details = createMapElement(
    'div',
    'display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;'
  );
  details.append(
    createMapElement(
      'p',
      'font-weight: bold; color: #14b8a6; margin: 0; font-size: 18px;',
      `£${Number(job.budget).toLocaleString()}`
    )
  );
  details.append(
    createMapElement(
      'p',
      'color: #9CA3AF; margin: 0; font-size: 12px;',
      formatLocation(job.property)
    )
  );
  card.append(details);
  const estimate =
    aiAssessment?.assessment_data?.contractorAdvice?.estimatedCost;
  if (estimate) {
    const estimateElement = createMapElement(
      'div',
      'background: linear-gradient(135deg, #ede9fe, #fae8ff); border: 1px solid #ddd6fe; padding: 6px 8px; border-radius: 6px; margin-bottom: 12px;'
    );
    estimateElement.append(
      createMapElement(
        'div',
        'font-size: 10px; color: #6b7280; margin-bottom: 2px;',
        'AI Repair Estimate'
      )
    );
    estimateElement.append(
      createMapElement(
        'div',
        'font-size: 13px; font-weight: 600; color: #1f2937;',
        `£${estimate.min.toLocaleString()}-${estimate.max.toLocaleString()}`
      )
    );
    card.append(estimateElement);
  }
  const link = createMapElement(
    'a',
    'display: block; text-align: center; text-decoration: none; background: #14b8a6; color: white; padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 14px;',
    'View Details'
  );
  link.href = `/contractor/bid/${encodeURIComponent(job.id)}/details`;
  card.append(link);
  return card;
}
