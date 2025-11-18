/**
 * Context Feature Service
 * 
 * Centralizes context vector construction for the Safe-LUCB critic.
 * Ensures consistent 12-dimensional feature ordering across all services.
 * 
 * Context vector features (d_eff = 12):
 * 0. fusion_confidence (0-1)
 * 1. fusion_variance (0-1)
 * 2. cp_set_size_normalized (0-1, normalized by /10)
 * 3. safety_critical_candidate (0 or 1)
 * 4. lighting_quality (0-1)
 * 5. image_clarity (0-1)
 * 6. property_age_normalized (0-1, normalized by /100)
 * 7. num_damage_sites_normalized (0-1, normalized by /10)
 * 8. detector_disagreement (0-1)
 * 9. ood_score (0-1)
 * 10. region_encoded (0-1, hash-based encoding)
 * 11. property_age_bin_encoded (0-1, categorical encoding)
 */

import { logger } from '@mintenance/shared';

export interface ContextFeatures {
  fusion_confidence: number;
  fusion_variance: number;
  cp_set_size: number;
  safety_critical_candidate: number; // 0 or 1
  lighting_quality: number; // 0-1
  image_clarity: number; // 0-1
  property_age: number;
  property_age_bin: string; // '0-20', '20-50', '50-100', '100+'
  num_damage_sites: number;
  detector_disagreement: number; // 0-1
  ood_score: number; // 0-1
  region: string;
}

export class ContextFeatureService {
  private static readonly D_EFF = 12; // Context dimension

  /**
   * Construct 12-dimensional context vector from features
   * 
   * This is the canonical method for creating context vectors.
   * All services must use this to ensure consistency.
   */
  static constructContextVector(features: Partial<ContextFeatures>): number[] {
    const vector: number[] = new Array(this.D_EFF);

    // Feature 0: fusion_confidence
    vector[0] = features.fusion_confidence ?? 0;

    // Feature 1: fusion_variance
    vector[1] = features.fusion_variance ?? 0;

    // Feature 2: cp_set_size (normalized by /10)
    vector[2] = (features.cp_set_size ?? 0) / 10;

    // Feature 3: safety_critical_candidate (0 or 1)
    vector[3] = features.safety_critical_candidate ?? 0;

    // Feature 4: lighting_quality
    vector[4] = features.lighting_quality ?? 0.8;

    // Feature 5: image_clarity
    vector[5] = features.image_clarity ?? 0.8;

    // Feature 6: property_age (normalized by /100)
    vector[6] = (features.property_age ?? 50) / 100;

    // Feature 7: num_damage_sites (normalized by /10)
    vector[7] = (features.num_damage_sites ?? 1) / 10;

    // Feature 8: detector_disagreement
    vector[8] = features.detector_disagreement ?? 0;

    // Feature 9: ood_score
    vector[9] = features.ood_score ?? 0;

    // Feature 10: region (hash-based encoding)
    vector[10] = this.encodeRegion(features.region ?? 'unknown');

    // Feature 11: property_age_bin (categorical encoding)
    vector[11] = this.encodePropertyAgeBin(features.property_age_bin ?? '50-100');

    // Validate dimension
    if (vector.length !== this.D_EFF) {
      throw new Error(`Context vector dimension mismatch: expected ${this.D_EFF}, got ${vector.length}`);
    }

    return vector;
  }

  /**
   * Extract context vector from stored context features (from database)
   * 
   * Used when reconstructing context from ab_decisions.context_features JSONB
   */
  static extractContextVector(contextFeatures: Record<string, any>): number[] {
    return this.constructContextVector({
      fusion_confidence: contextFeatures.fusion_confidence,
      fusion_variance: contextFeatures.fusion_variance,
      cp_set_size: contextFeatures.cp_set_size,
      safety_critical_candidate: contextFeatures.safety_critical_candidate,
      lighting_quality: contextFeatures.lighting_quality,
      image_clarity: contextFeatures.image_clarity,
      property_age: contextFeatures.property_age,
      property_age_bin: contextFeatures.property_age_bin,
      num_damage_sites: contextFeatures.num_damage_sites,
      detector_disagreement: contextFeatures.detector_disagreement,
      ood_score: contextFeatures.ood_score,
      region: contextFeatures.region,
    });
  }

  /**
   * Validate context vector dimension and range
   */
  static validateContextVector(context: number[]): { valid: boolean; error?: string } {
    if (context.length !== this.D_EFF) {
      return {
        valid: false,
        error: `Context vector dimension mismatch: expected ${this.D_EFF}, got ${context.length}`,
      };
    }

    // Check for NaN or Infinity
    for (let i = 0; i < context.length; i++) {
      if (!Number.isFinite(context[i])) {
        return {
          valid: false,
          error: `Context vector contains non-finite value at index ${i}: ${context[i]}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Encode region to number (0-1) using hash-based encoding
   */
  static encodeRegion(region: string): number {
    let hash = 0;
    for (let i = 0; i < region.length; i++) {
      hash = ((hash << 5) - hash) + region.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 1000) / 1000;
  }

  /**
   * Encode property age bin to number (0-1)
   */
  static encodePropertyAgeBin(bin: string): number {
    const bins: Record<string, number> = {
      '0-20': 0.1,
      '20-50': 0.3,
      '50-100': 0.6,
      '100+': 0.9,
    };
    return bins[bin] ?? 0.5;
  }

  /**
   * Get property age bin from age
   */
  static getPropertyAgeBin(age: number): string {
    if (age < 20) return '0-20';
    if (age < 50) return '20-50';
    if (age < 100) return '50-100';
    return '100+';
  }

  /**
   * Get context dimension
   */
  static getDimension(): number {
    return this.D_EFF;
  }
}

