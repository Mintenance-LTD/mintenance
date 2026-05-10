import { logger } from '@mintenance/shared';
import {
  CITY_MULTIPLIERS,
  REGION_MULTIPLIERS,
  type RegionMultiplier,
} from './multipliers';
import {
  extractPostcode,
  fetchPostcodeData,
  normalizePostcode,
  type PostcodeData,
} from './postcode-api';
import {
  calculateFactorFromPostcodeData,
  extractRegionFromLocation,
  getCityFactor,
  getPostcodeAreaFactor,
} from './region-matcher';

const NodeCache = require('node-cache');

/**
 * Location Pricing Service
 *
 * Provides UK regional pricing adjustments based on postcode, city,
 * and region detection. Refactored 2026-05-09: data tables moved to
 * `multipliers.ts`, postcode-API into `postcode-api.ts`, region/city
 * matching into `region-matcher.ts`. This file is now the slim
 * caching/orchestration layer that the rest of the app imports.
 *
 * Data sources + methodology documented in `multipliers.ts`.
 */

export interface LocationPricingData {
  region: string;
  postcode: string;
  costOfLivingIndex: number;
  laborRateMultiplier: number;
  materialCostMultiplier: number;
  confidenceScore: number;
}

// Re-export for callers that previously imported from this file.
export type { PostcodeData } from './postcode-api';

const DEFAULT_MULTIPLIER: RegionMultiplier = {
  overall: 1.0,
  labor: 1.0,
  materials: 1.0,
  confidence: 0.5,
};

export class LocationPricingService {
  private static postcodeCache = new NodeCache({ stdTTL: 3600 });
  private static regionCache = new NodeCache({ stdTTL: 86400 });

  /**
   * Get location-based pricing factor.
   *
   * Resolution priority:
   *   1. Postcode lookup via postcodes.io (most accurate)
   *   2. Postcode-area prefix multiplier (offline fallback)
   *   3. City detection from the location string
   *   4. ONS region keyword in the location string
   *   5. 1.0 (no adjustment)
   */
  static async getLocationFactor(location: string): Promise<number> {
    if (!location || location.trim().length === 0) {
      return 1.0;
    }

    const locationClean = location.trim();
    const cacheKey = `location_factor_${locationClean.toLowerCase()}`;
    const cached = this.regionCache.get(cacheKey) as number | undefined;
    if (cached !== undefined) {
      return cached;
    }

    try {
      const postcode = extractPostcode(locationClean);
      if (postcode) {
        const postcodeData = await this.getPostcodeData(postcode);
        if (postcodeData) {
          const factor = calculateFactorFromPostcodeData(postcodeData);
          this.regionCache.set(cacheKey, factor);
          logger.info('Location factor calculated from postcode', {
            service: 'LocationPricingService',
            location: locationClean,
            postcode,
            region: postcodeData.region,
            factor,
          });
          return factor;
        }

        const areaFactor = getPostcodeAreaFactor(postcode);
        if (areaFactor !== 1.0) {
          this.regionCache.set(cacheKey, areaFactor);
          logger.info('Location factor from postcode area', {
            service: 'LocationPricingService',
            location: locationClean,
            postcode,
            factor: areaFactor,
          });
          return areaFactor;
        }
      }

      const cityFactor = getCityFactor(locationClean);
      if (cityFactor !== null) {
        this.regionCache.set(cacheKey, cityFactor);
        logger.info('Location factor from city detection', {
          service: 'LocationPricingService',
          location: locationClean,
          factor: cityFactor,
        });
        return cityFactor;
      }

      const region = extractRegionFromLocation(locationClean);
      const regionData = REGION_MULTIPLIERS[region];
      if (regionData) {
        const factor = regionData.overall;
        this.regionCache.set(cacheKey, factor);
        logger.info('Location factor from region', {
          service: 'LocationPricingService',
          location: locationClean,
          region,
          factor,
        });
        return factor;
      }

      logger.info('Location factor default (no match)', {
        service: 'LocationPricingService',
        location: locationClean,
        factor: 1.0,
      });
      this.regionCache.set(cacheKey, 1.0);
      return 1.0;
    } catch (error) {
      logger.error('Error calculating location factor', error, {
        service: 'LocationPricingService',
        location: locationClean,
      });
      return 1.0;
    }
  }

  /**
   * Get detailed location-pricing breakdown for a postcode (region,
   * labor multiplier, material multiplier, confidence score).
   * Returns null when the postcode can't be resolved.
   */
  static async getLocationData(
    postcode: string
  ): Promise<LocationPricingData | null> {
    try {
      const postcodeClean = normalizePostcode(postcode);
      const cacheKey = `location_data_${postcodeClean}`;
      const cached = this.postcodeCache.get(cacheKey) as
        | LocationPricingData
        | undefined;
      if (cached) {
        return cached;
      }

      const postcodeData = await this.getPostcodeData(postcodeClean);
      if (!postcodeData) {
        return null;
      }

      const regionData =
        REGION_MULTIPLIERS[postcodeData.region] ?? DEFAULT_MULTIPLIER;
      const cityData = postcodeData.admin_district
        ? CITY_MULTIPLIERS[postcodeData.admin_district]
        : undefined;
      const multipliers = cityData ?? regionData;

      const locationData: LocationPricingData = {
        region: postcodeData.region,
        postcode: postcodeClean,
        costOfLivingIndex: multipliers.overall,
        laborRateMultiplier: multipliers.labor,
        materialCostMultiplier: multipliers.materials,
        confidenceScore: multipliers.confidence,
      };

      this.postcodeCache.set(cacheKey, locationData);
      logger.info('Location data retrieved', {
        service: 'LocationPricingService',
        postcode: postcodeClean,
        region: postcodeData.region,
        multiplier: multipliers.overall,
      });
      return locationData;
    } catch (error) {
      logger.error('Error getting location data', error, {
        service: 'LocationPricingService',
        postcode,
      });
      return null;
    }
  }

  /**
   * Internal: cached wrapper around the postcodes.io fetch helper.
   * Kept private so callers go through `getLocationFactor` /
   * `getLocationData` and benefit from both layers of caching.
   */
  private static async getPostcodeData(
    postcode: string
  ): Promise<PostcodeData | null> {
    const postcodeClean = normalizePostcode(postcode);
    const cacheKey = `postcode_${postcodeClean}`;
    const cached = this.postcodeCache.get(cacheKey) as PostcodeData | undefined;
    if (cached) {
      return cached;
    }

    const data = await fetchPostcodeData(postcodeClean);
    if (data) {
      this.postcodeCache.set(cacheKey, data);
    }
    return data;
  }

  static clearCaches(): void {
    this.postcodeCache.flushAll();
    this.regionCache.flushAll();
  }

  static getCacheStats() {
    return {
      postcode: this.postcodeCache.getStats(),
      region: this.regionCache.getStats(),
    };
  }
}
