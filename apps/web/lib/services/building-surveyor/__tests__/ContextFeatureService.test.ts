/**
 * Unit tests for ContextFeatureService
 */

import { ContextFeatureService } from '../ContextFeatureService';

describe('ContextFeatureService', () => {
  describe('constructContextVector', () => {
    it('should construct a 12-dimensional context vector', () => {
      const features = {
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 1,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      };

      const vector = ContextFeatureService.constructContextVector(features);

      expect(vector).toHaveLength(12);
      expect(vector[0]).toBe(0.8); // fusion_confidence
      expect(vector[1]).toBe(0.1); // fusion_variance
      expect(vector[2]).toBe(0.5); // cp_set_size / 10
      expect(vector[3]).toBe(1); // safety_critical_candidate
      expect(vector[4]).toBe(0.9); // lighting_quality
      expect(vector[5]).toBe(0.85); // image_clarity
      expect(vector[6]).toBe(0.5); // property_age / 100
      expect(vector[7]).toBe(0.3); // num_damage_sites / 10
      expect(vector[8]).toBe(0.05); // detector_disagreement
      expect(vector[9]).toBe(0.1); // ood_score
      expect(typeof vector[10]).toBe('number'); // region (encoded)
      expect(typeof vector[11]).toBe('number'); // property_age_bin (encoded)
    });

    it('should use default values for missing features', () => {
      const vector = ContextFeatureService.constructContextVector({});

      expect(vector).toHaveLength(12);
      expect(vector[0]).toBe(0); // fusion_confidence default
      expect(vector[4]).toBe(0.8); // lighting_quality default
      expect(vector[5]).toBe(0.8); // image_clarity default
      expect(vector[6]).toBe(0.5); // property_age default (50/100)
      expect(vector[7]).toBe(0.1); // num_damage_sites default (1/10)
    });

    it('should validate context vector dimension', () => {
      const features = {
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 1,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      };

      const vector = ContextFeatureService.constructContextVector(features);
      const validation = ContextFeatureService.validateContextVector(vector);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should reject invalid dimension vectors', () => {
      const invalidVector = [1, 2, 3]; // Wrong dimension
      const validation = ContextFeatureService.validateContextVector(invalidVector);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('dimension mismatch');
    });

    it('should reject vectors with non-finite values', () => {
      const invalidVector = Array(12).fill(0);
      invalidVector[0] = NaN;
      const validation = ContextFeatureService.validateContextVector(invalidVector);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('non-finite');
    });
  });

  describe('encodeRegion', () => {
    it('should encode regions to numbers between 0 and 1', () => {
      const encoded = ContextFeatureService.encodeRegion('northeast');
      expect(encoded).toBeGreaterThanOrEqual(0);
      expect(encoded).toBeLessThanOrEqual(1);
    });

    it('should produce consistent encodings', () => {
      const encoded1 = ContextFeatureService.encodeRegion('northeast');
      const encoded2 = ContextFeatureService.encodeRegion('northeast');
      expect(encoded1).toBe(encoded2);
    });

    it('should produce different encodings for different regions', () => {
      const encoded1 = ContextFeatureService.encodeRegion('northeast');
      const encoded2 = ContextFeatureService.encodeRegion('southwest');
      expect(encoded1).not.toBe(encoded2);
    });
  });

  describe('encodePropertyAgeBin', () => {
    it('should encode known age bins correctly', () => {
      expect(ContextFeatureService.encodePropertyAgeBin('0-20')).toBe(0.1);
      expect(ContextFeatureService.encodePropertyAgeBin('20-50')).toBe(0.3);
      expect(ContextFeatureService.encodePropertyAgeBin('50-100')).toBe(0.6);
      expect(ContextFeatureService.encodePropertyAgeBin('100+')).toBe(0.9);
    });

    it('should use default for unknown bins', () => {
      expect(ContextFeatureService.encodePropertyAgeBin('unknown')).toBe(0.5);
    });
  });

  describe('getPropertyAgeBin', () => {
    it('should correctly bin property ages', () => {
      expect(ContextFeatureService.getPropertyAgeBin(10)).toBe('0-20');
      expect(ContextFeatureService.getPropertyAgeBin(30)).toBe('20-50');
      expect(ContextFeatureService.getPropertyAgeBin(75)).toBe('50-100');
      expect(ContextFeatureService.getPropertyAgeBin(150)).toBe('100+');
    });
  });

  describe('extractContextVector', () => {
    it('should extract context vector from stored features', () => {
      const contextFeatures = {
        fusion_confidence: 0.8,
        fusion_variance: 0.1,
        cp_set_size: 5,
        safety_critical_candidate: 1,
        lighting_quality: 0.9,
        image_clarity: 0.85,
        property_age: 50,
        property_age_bin: '50-100',
        num_damage_sites: 3,
        detector_disagreement: 0.05,
        ood_score: 0.1,
        region: 'northeast',
      };

      const vector = ContextFeatureService.extractContextVector(contextFeatures);
      expect(vector).toHaveLength(12);
    });
  });
});

