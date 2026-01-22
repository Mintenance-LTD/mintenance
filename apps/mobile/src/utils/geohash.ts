/**
 * Geohash Utility
 * 
 * Simplified geohash encoding for spatial indexing.
 * For production, consider using a proper geohash library like 'ngeohash'.
 * 
 * @filesize Target: <150 lines
 * @compliance Single Responsibility - Geohash encoding only
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude and longitude to geohash
 * @param lat - Latitude (-90 to 90)
 * @param lon - Longitude (-180 to 180)
 * @param precision - Number of characters (default: 7, ~153m accuracy)
 * @returns Geohash string
 */
export function encodeGeohash(lat: number, lon: number, precision: number = 7): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let hash = '';
  let bits = 0;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (bits % 2 === 0) {
      // Even bit: longitude
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        ch |= (1 << (4 - bit));
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      // Odd bit: latitude
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        ch |= (1 << (4 - bit));
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }

    bit++;
    bits++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Get geohash neighbors (simplified - use proper library for production)
 * @param geohash - Geohash string
 * @returns Array of neighbor geohashes
 */
export function getGeohashNeighbors(geohash: string): string[] {
  // Simplified implementation
  // For production, use a proper geohash library that handles edge cases
  const neighbors: string[] = [];
  
  // This is a placeholder - proper implementation would calculate
  // north, south, east, west, northeast, northwest, southeast, southwest
  // neighbors accounting for geohash boundaries
  
  return neighbors;
}

/**
 * Get bounding box for a geohash
 * @param geohash - Geohash string
 * @returns Bounding box coordinates
 */
export function getGeohashBounds(geohash: string): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isEven = true;

  for (let i = 0; i < geohash.length; i++) {
    const ch = geohash[i];
    const bits = BASE32.indexOf(ch);

    for (let j = 0; j < 5; j++) {
      const bit = (bits >> (4 - j)) & 1;

      if (isEven) {
        // Longitude bit
        const lonMid = (lonMin + lonMax) / 2;
        if (bit === 1) {
          lonMin = lonMid;
        } else {
          lonMax = lonMid;
        }
      } else {
        // Latitude bit
        const latMid = (latMin + latMax) / 2;
        if (bit === 1) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }

      isEven = !isEven;
    }
  }

  return {
    north: latMax,
    south: latMin,
    east: lonMax,
    west: lonMin,
  };
}
