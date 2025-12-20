/**
 * Unit tests for SafetyAnalysisService
 */

import { SafetyAnalysisService } from '../SafetyAnalysisService';

describe('SafetyAnalysisService', () => {
  describe('processSafetyHazards', () => {
    it('should identify critical hazards', () => {
      const hazards = [
        {
          type: 'electrical_hazard',
          severity: 'critical',
          location: 'kitchen',
          description: 'Exposed wiring',
        },
      ];

      const result = SafetyAnalysisService.processSafetyHazards(hazards);

      expect(result.hasCriticalHazards).toBe(true);
      expect(result.hazards[0].severity).toBe('critical');
    });

    it('should calculate safety score correctly', () => {
      const hazards = [
        {
          type: 'electrical_hazard',
          severity: 'critical',
          location: 'kitchen',
          description: 'Exposed wiring',
        },
      ];

      const result = SafetyAnalysisService.processSafetyHazards(hazards);

      // Critical hazard: -40 points from 100
      expect(result.overallSafetyScore).toBe(60);
    });

    it('should return perfect score for no hazards', () => {
      const result = SafetyAnalysisService.processSafetyHazards([]);

      expect(result.overallSafetyScore).toBe(100);
      expect(result.hasCriticalHazards).toBe(false);
    });
  });

  describe('isSafetyCritical', () => {
    it('should identify structural failure as critical', () => {
      expect(SafetyAnalysisService.isSafetyCritical('structural_failure')).toBe(true);
    });

    it('should identify electrical hazard as critical', () => {
      expect(SafetyAnalysisService.isSafetyCritical('electrical_hazard')).toBe(true);
    });

    it('should identify non-critical damage as safe', () => {
      expect(SafetyAnalysisService.isSafetyCritical('cosmetic_damage')).toBe(false);
      expect(SafetyAnalysisService.isSafetyCritical('water_damage')).toBe(false);
    });
  });
});

