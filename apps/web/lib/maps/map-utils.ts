/**
 * Map Utilities
 * 
 * Shared utilities for Google Maps operations
 * Including marker creation, circle rendering, and bounds calculations
 */

export interface ContractorMarkerData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number;
  city?: string;
  profileImage?: string;
  skills?: Array<{ skill_name: string; skill_icon?: string | null }>;
  primarySkillIcon?: string; // Icon for the primary skill
}

export interface ServiceAreaData {
  id: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_active: boolean;
  city?: string;
  state?: string;
}

/**
 * Calculate bounds to fit all markers
 * @param coordinates Array of lat/lng coordinates
 * @returns LatLngBounds or null if empty array
 */
export function calculateBounds(
  coordinates: Array<{ lat: number; lng: number }>
): google.maps.LatLngBounds | null {
  if (coordinates.length === 0) return null;

  const bounds = new google.maps.LatLngBounds();
  coordinates.forEach((coord) => {
    bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
  });

  return bounds;
}

/**
 * Create custom marker with contractor info
 * @param map Google Maps instance
 * @param contractor Contractor data
 * @param onClick Click handler callback
 * @returns Marker instance
 */
export function createContractorMarker(
  map: google.maps.Map,
  contractor: ContractorMarkerData,
  onClick?: () => void
): google.maps.Marker {
  const marker = new google.maps.Marker({
    position: { lat: contractor.latitude, lng: contractor.longitude },
    map,
    title: `${contractor.name}${contractor.city ? ` - ${contractor.city}` : ''}`,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#1F2937', // Deep blue from theme
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
    animation: google.maps.Animation.DROP,
  });

  // Add click listener
  if (onClick) {
    marker.addListener('click', onClick);
  }

  // Add hover effect
  marker.addListener('mouseover', () => {
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#3B82F6', // Vibrant blue on hover
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    });
  });

  marker.addListener('mouseout', () => {
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#1F2937',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    });
  });

  return marker;
}

/**
 * Create info window for contractor
 * @param contractor Contractor data
 * @returns InfoWindow instance
 */
export function createContractorInfoWindow(
  contractor: ContractorMarkerData
): google.maps.InfoWindow {
  const content = `
    <div style="padding: 8px; max-width: 200px;">
      <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
        ${contractor.name}
      </h3>
      ${contractor.city ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #6B7280;">${contractor.city}</p>` : ''}
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
        <span style="color: #F59E0B;">⭐</span>
        <span style="font-size: 14px; font-weight: 600;">${contractor.rating.toFixed(1)}</span>
      </div>
      <a
        href="/contractor/${contractor.id}"
        style="
          display: inline-block;
          padding: 6px 12px;
          background-color: #1F2937;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
        "
      >
        View Profile
      </a>
    </div>
  `;

  return new google.maps.InfoWindow({
    content,
  });
}

/**
 * Create service area circle
 * @param map Google Maps instance
 * @param area Service area data
 * @returns Circle instance
 */
export function createServiceAreaCircle(
  map: google.maps.Map,
  area: ServiceAreaData
): google.maps.Circle {
  const circle = new google.maps.Circle({
    center: { lat: area.latitude, lng: area.longitude },
    radius: area.radius_km * 1000, // Convert km to meters
    map,
    fillColor: area.is_active ? '#10B981' : '#9CA3AF', // Green for active, gray for inactive
    fillOpacity: 0.2,
    strokeColor: area.is_active ? '#10B981' : '#9CA3AF',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    clickable: true,
  });

  // Add hover effect
  circle.addListener('mouseover', () => {
    circle.setOptions({
      fillOpacity: 0.3,
      strokeWeight: 3,
    });
  });

  circle.addListener('mouseout', () => {
    circle.setOptions({
      fillOpacity: 0.2,
      strokeWeight: 2,
    });
  });

  return circle;
}

/**
 * Create center marker for service area
 * @param map Google Maps instance
 * @param area Service area data
 * @param onClick Click handler callback
 * @returns Marker instance
 */
export function createServiceAreaMarker(
  map: google.maps.Map,
  area: ServiceAreaData,
  onClick?: () => void
): google.maps.Marker {
  const marker = new google.maps.Marker({
    position: { lat: area.latitude, lng: area.longitude },
    map,
    title: `${area.city || 'Service Area'}${area.state ? `, ${area.state}` : ''} (${area.radius_km}km radius)`,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: area.is_active ? '#10B981' : '#9CA3AF',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    },
  });

  if (onClick) {
    marker.addListener('click', onClick);
  }

  return marker;
}

/**
 * Fit map to show all markers with padding
 * @param map Google Maps instance
 * @param bounds LatLngBounds
 * @param padding Padding in pixels (default: 50)
 */
export function fitMapToBounds(
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds,
  padding: number = 50
): void {
  map.fitBounds(bounds, padding);
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 First point latitude
 * @param lng1 First point longitude
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a point is within a service area
 * @param pointLat Point latitude
 * @param pointLng Point longitude
 * @param areaLat Area center latitude
 * @param areaLng Area center longitude
 * @param radiusKm Area radius in kilometers
 * @returns True if point is within area
 */
export function isPointInServiceArea(
  pointLat: number,
  pointLng: number,
  areaLat: number,
  areaLng: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(pointLat, pointLng, areaLat, areaLng);
  return distance <= radiusKm;
}

/**
 * Create recenter control button
 * @param map Google Maps instance
 * @param userLocation User's current location
 * @returns Control div element
 */
export function createRecenterControl(
  map: google.maps.Map,
  userLocation: { lat: number; lng: number }
): HTMLDivElement {
  const controlDiv = document.createElement('div');
  controlDiv.style.margin = '10px';

  const controlButton = document.createElement('button');
  controlButton.style.backgroundColor = '#fff';
  controlButton.style.border = '2px solid #fff';
  controlButton.style.borderRadius = '3px';
  controlButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
  controlButton.style.cursor = 'pointer';
  controlButton.style.padding = '8px 12px';
  controlButton.style.textAlign = 'center';
  controlButton.title = 'Click to recenter the map to your location';
  controlButton.type = 'button';
  controlButton.innerHTML = '📍 My Location';
  controlButton.style.fontSize = '14px';
  controlButton.style.fontWeight = '500';

  controlButton.addEventListener('click', () => {
    map.setCenter(userLocation);
    map.setZoom(12);
  });

  controlDiv.appendChild(controlButton);
  return controlDiv;
}

/**
 * Get optimal zoom level based on distance
 * @param distanceKm Distance in kilometers
 * @returns Zoom level (1-20)
 */
export function getOptimalZoom(distanceKm: number): number {
  if (distanceKm < 1) return 15;
  if (distanceKm < 5) return 13;
  if (distanceKm < 10) return 12;
  if (distanceKm < 25) return 11;
  if (distanceKm < 50) return 10;
  if (distanceKm < 100) return 9;
  if (distanceKm < 250) return 8;
  return 7;
}

/**
 * Clear all markers from map
 * @param markers Array of markers to clear
 */
export function clearMarkers(markers: google.maps.Marker[]): void {
  markers.forEach((marker) => marker.setMap(null));
}

/**
 * Clear all circles from map
 * @param circles Array of circles to clear
 */
export function clearCircles(circles: google.maps.Circle[]): void {
  circles.forEach((circle) => circle.setMap(null));
}

