/**
 * Location formatting utilities
 */

/**
 * Extract city and postcode from a full address string
 * Handles UK addresses like "82, Fairview Road, Ewens Farm, Fairview, Cheltenham, Gloucestershire, England, GL52 2EH, United Kingdom"
 */
export function formatLocationShort(address: string | null | undefined): string {
  if (!address) return 'Not specified';

  // Try to extract UK postcode (format: GL52 2EH or GL522EH)
  const postcodeMatch = address.match(/\b([A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2})\b/i);
  const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : null;

  // Split address by commas and try to find city
  const parts = address.split(',').map(p => p.trim());
  
  // Common UK address patterns: look for city name (usually before postcode)
  let city: string | null = null;
  
  // Try to find city before postcode
  if (postcode) {
    const postcodeIndex = parts.findIndex(p => p.includes(postcode));
    if (postcodeIndex > 0) {
      // City is usually the item before the postcode
      city = parts[postcodeIndex - 1];
    }
  }
  
  // If no city found, try to find common city indicators
  if (!city) {
    // Look for items that don't contain numbers and aren't too long
    city = parts.find(p => 
      !/\d/.test(p) && 
      p.length > 3 && 
      p.length < 30 &&
      !['England', 'United Kingdom', 'UK', 'Scotland', 'Wales', 'Northern Ireland'].includes(p)
    ) || null;
  }

  // Format: "City, Postcode" or just "City" or just address if we can't parse
  if (city && postcode) {
    return `${city}, ${postcode}`;
  } else if (city) {
    return city;
  } else if (postcode) {
    return postcode;
  } else {
    // Fallback: return first part of address (usually street name)
    return parts[0] || address;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
}

