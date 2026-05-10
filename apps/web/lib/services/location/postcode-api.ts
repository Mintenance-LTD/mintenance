import { logger } from '@mintenance/shared';

export interface PostcodeData {
  postcode: string;
  region: string;
  latitude: number;
  longitude: number;
  admin_district?: string;
  admin_county?: string;
  country: string;
}

/**
 * Normalize a UK postcode to a canonical "AA9A 9AA" / "A9 9AA" format.
 * Strips whitespace, uppercases, and re-inserts the space before the
 * outward-code suffix.
 */
export function normalizePostcode(postcode: string): string {
  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  if (clean.length >= 5) {
    return `${clean.slice(0, -3)} ${clean.slice(-3)}`;
  }
  return clean;
}

/**
 * Pull a UK postcode out of a free-form location string. Supports the
 * common "City, AA1 1AA" and "AA1 1AA" forms.
 */
export function extractPostcode(location: string): string | null {
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const match = location.match(postcodeRegex);
  if (match) {
    return normalizePostcode(match[1]);
  }
  return null;
}

/**
 * Fetch postcode metadata from postcodes.io (free public UK API,
 * no auth required). Returns null on any failure / non-200 response so
 * callers can fall back to area-prefix multipliers without throwing.
 */
export async function fetchPostcodeData(
  postcode: string
): Promise<PostcodeData | null> {
  try {
    const postcodeClean = normalizePostcode(postcode);
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcodeClean)}`
    );

    if (!response.ok) {
      logger.warn('Postcode not found', {
        service: 'LocationPricingService',
        postcode: postcodeClean,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();
    if (data.status !== 200 || !data.result) {
      return null;
    }

    const result = data.result;
    return {
      postcode: result.postcode,
      region: result.region || 'Unknown',
      latitude: result.latitude,
      longitude: result.longitude,
      admin_district: result.admin_district,
      admin_county: result.admin_county,
      country: result.country,
    };
  } catch (error) {
    logger.error('Error fetching postcode data', error, {
      service: 'LocationPricingService',
      postcode,
    });
    return null;
  }
}
