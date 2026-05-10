import {
  CITY_MULTIPLIERS,
  POSTCODE_AREA_MULTIPLIERS,
  REGION_MULTIPLIERS,
} from './multipliers';
import type { PostcodeData } from './postcode-api';

/**
 * Calculate the overall pricing multiplier from a successful
 * postcodes.io response. Prefers the city-specific multiplier when
 * the admin_district matches CITY_MULTIPLIERS, otherwise falls back
 * to the regional multiplier, otherwise 1.0.
 */
export function calculateFactorFromPostcodeData(
  postcodeData: PostcodeData
): number {
  if (postcodeData.admin_district) {
    const cityData = CITY_MULTIPLIERS[postcodeData.admin_district];
    if (cityData) {
      return cityData.overall;
    }
  }

  const regionData = REGION_MULTIPLIERS[postcodeData.region];
  if (regionData) {
    return regionData.overall;
  }

  return 1.0;
}

/**
 * Quick area-prefix lookup for cases where the postcodes.io API is
 * unavailable. Tries the full area code (e.g. "SW1") then strips the
 * trailing digit (e.g. "SW") for a coarser match.
 */
export function getPostcodeAreaFactor(postcode: string): number {
  const area = postcode.split(' ')[0];

  if (POSTCODE_AREA_MULTIPLIERS[area]) {
    return POSTCODE_AREA_MULTIPLIERS[area];
  }

  const areaPrefix = area.replace(/\d+/, '');
  if (POSTCODE_AREA_MULTIPLIERS[areaPrefix]) {
    return POSTCODE_AREA_MULTIPLIERS[areaPrefix];
  }

  return 1.0;
}

/**
 * Detect a city in a free-form location string and return its
 * `overall` multiplier. Case-insensitive substring match against the
 * CITY_MULTIPLIERS keys.
 */
export function getCityFactor(location: string): number | null {
  const locationLower = location.toLowerCase();

  for (const [city, data] of Object.entries(CITY_MULTIPLIERS)) {
    if (locationLower.includes(city.toLowerCase())) {
      return data.overall;
    }
  }

  return null;
}

/**
 * Best-effort region detection from a free-form location string.
 * Used as a fallback when no postcode + no city matches. Recognises
 * both UK ONS region names ("Greater London", "South East", ...) and
 * a curated set of city/keyword aliases.
 *
 * Falls back to "West Midlands" (the national average) when nothing
 * matches, so the caller's `REGION_MULTIPLIERS[result]` lookup still
 * returns a valid 1.0x baseline.
 */
export function extractRegionFromLocation(location: string): string {
  const locationLower = location.toLowerCase();

  for (const region of Object.keys(REGION_MULTIPLIERS)) {
    if (locationLower.includes(region.toLowerCase())) {
      return region;
    }
  }

  if (locationLower.includes('london')) return 'Greater London';
  if (
    locationLower.includes('birmingham') ||
    locationLower.includes('coventry')
  )
    return 'West Midlands';
  if (
    locationLower.includes('manchester') ||
    locationLower.includes('liverpool')
  )
    return 'North West';
  if (
    locationLower.includes('leeds') ||
    locationLower.includes('sheffield') ||
    locationLower.includes('yorkshire')
  )
    return 'Yorkshire and The Humber';
  if (
    locationLower.includes('newcastle') ||
    locationLower.includes('sunderland')
  )
    return 'North East';
  if (
    locationLower.includes('bristol') ||
    locationLower.includes('plymouth') ||
    locationLower.includes('exeter')
  )
    return 'South West';
  if (
    locationLower.includes('brighton') ||
    locationLower.includes('southampton') ||
    locationLower.includes('reading')
  )
    return 'South East';
  if (locationLower.includes('cambridge') || locationLower.includes('norwich'))
    return 'East of England';
  if (
    locationLower.includes('nottingham') ||
    locationLower.includes('leicester')
  )
    return 'East Midlands';
  if (
    locationLower.includes('cardiff') ||
    locationLower.includes('swansea') ||
    locationLower.includes('wales')
  )
    return 'Wales';
  if (
    locationLower.includes('edinburgh') ||
    locationLower.includes('glasgow') ||
    locationLower.includes('scotland')
  )
    return 'Scotland';
  if (
    locationLower.includes('belfast') ||
    locationLower.includes('northern ireland')
  )
    return 'Northern Ireland';

  return 'West Midlands';
}
