/**
 * Map controller logic for the Jobs Near You page.
 *
 * Manages Google Maps markers and info windows for displaying
 * the contractor's location and nearby job positions.
 */

import { formatMoney } from '@/lib/utils/currency';

interface ContractorLocationForMap {
  city?: string | null;
  country?: string | null;
}

interface JobForMap {
  id: string;
  title: string;
  location?: string;
  distance?: number;
  budget?: string;
  coordinates?: { lat: number; lng: number };
  homeowner?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface MapRefs {
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  markersRef: React.MutableRefObject<google.maps.Marker[]>;
  infoWindowsRef: React.MutableRefObject<Map<string, google.maps.InfoWindow>>;
}

/**
 * Clear all existing markers and info windows from the map.
 */
function clearMarkers(refs: MapRefs): void {
  refs.markersRef.current.forEach((marker) => marker.setMap(null));
  refs.markersRef.current = [];
  refs.infoWindowsRef.current.forEach((window) => window.close());
  refs.infoWindowsRef.current.clear();
}

/**
 * Create a marker and info window for the contractor's location.
 */
function createContractorMarker(
  refs: MapRefs,
  contractorCoords: { lat: number; lng: number },
  contractorLocation: ContractorLocationForMap
): void {
  const map = refs.mapRef.current;
  if (!map) return;

  const contractorMarker = new google.maps.Marker({
    position: contractorCoords,
    map,
    title: 'Your Location',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#1F2937',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    },
  });

  const contractorInfoWindow = new google.maps.InfoWindow({
    content: `
      <div style="padding: 8px;">
        <strong style="color: #111827; font-size: 14px;">Your Location</strong>
        ${
          contractorLocation.city || contractorLocation.country
            ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${[contractorLocation.city, contractorLocation.country].filter(Boolean).join(', ')}</p>`
            : ''
        }
      </div>
    `,
  });

  contractorMarker.addListener('click', () => {
    refs.infoWindowsRef.current.forEach((window) => window.close());
    contractorInfoWindow.open(map, contractorMarker);
  });

  refs.markersRef.current.push(contractorMarker);
  refs.infoWindowsRef.current.set('contractor', contractorInfoWindow);
}

/**
 * Create markers and info windows for each job on the map.
 */
function createJobMarkers(refs: MapRefs, jobs: JobForMap[]): void {
  const map = refs.mapRef.current;
  if (!map) return;

  jobs.forEach((job) => {
    if (!job.coordinates) return;

    const jobMarker = new google.maps.Marker({
      position: job.coordinates,
      map,
      title: job.title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });

    const homeownerName = job.homeowner
      ? `${job.homeowner.first_name || ''} ${job.homeowner.last_name || ''}`.trim() || job.homeowner.email
      : 'Unknown';

    const jobInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; max-width: 250px;">
          <strong style="color: #111827; font-size: 14px;">${job.title}</strong>
          <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${job.location || 'Location not specified'}</p>
          ${
            job.distance !== undefined
              ? `<p style="margin: 4px 0 0 0; color: #3B82F6; font-size: 12px; font-weight: 600;">${job.distance.toFixed(1)} km away</p>`
              : ''
          }
          ${
            job.budget
              ? `<p style="margin: 4px 0 0 0; color: #10B981; font-size: 12px; font-weight: 600;">${formatMoney(parseFloat(job.budget))}</p>`
              : ''
          }
          <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 11px;">Posted by: ${homeownerName}</p>
        </div>
      `,
    });

    jobMarker.addListener('click', () => {
      refs.infoWindowsRef.current.forEach((window) => window.close());
      jobInfoWindow.open(map, jobMarker);
    });

    refs.markersRef.current.push(jobMarker);
    refs.infoWindowsRef.current.set(job.id, jobInfoWindow);
  });
}

/**
 * Fit the map bounds to include all markers, or center on the contractor
 * if there are no markers.
 */
function fitBounds(
  refs: MapRefs,
  contractorCoords: { lat: number; lng: number }
): void {
  const map = refs.mapRef.current;
  if (!map) return;

  if (refs.markersRef.current.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    refs.markersRef.current.forEach((marker) => {
      const position = marker.getPosition();
      if (position) bounds.extend(position);
    });
    map.fitBounds(bounds, 50);
  } else {
    map.setCenter(contractorCoords);
    map.setZoom(12);
  }
}

/**
 * Update all map markers for the contractor and job positions.
 * Clears existing markers before creating new ones.
 */
export function updateMarkers(
  refs: MapRefs,
  contractorCoords: { lat: number; lng: number } | null,
  contractorLocation: ContractorLocationForMap,
  jobs: JobForMap[]
): void {
  if (!refs.mapRef.current || !contractorCoords) return;

  clearMarkers(refs);
  createContractorMarker(refs, contractorCoords, contractorLocation);
  createJobMarkers(refs, jobs);
  fitBounds(refs, contractorCoords);
}

/**
 * Handle the Google Map onLoad callback. Stores the map reference
 * and performs an initial marker update.
 */
export function handleMapLoad(
  map: google.maps.Map,
  refs: MapRefs,
  contractorCoords: { lat: number; lng: number } | null,
  contractorLocation: ContractorLocationForMap,
  jobs: JobForMap[]
): void {
  refs.mapRef.current = map;
  updateMarkers(refs, contractorCoords, contractorLocation, jobs);
}
