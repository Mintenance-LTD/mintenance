/**
 * Safety Analysis Service
 * 
 * Handles safety hazard detection, normalization, and scoring
 * for building damage assessments.
 */

import type { SafetyHazardSeverity, UrgencyLevel } from './types';

// Input type for raw hazard data from AI response
interface RawSafetyHazard {
  type?: string;
  severity?: string;
  location?: string;
  description?: string;
  immediateAction?: string;
  urgency?: string;
}

export interface SafetyHazard {
  type: string;
  severity: SafetyHazardSeverity;
  location: string;
  description: string;
  immediateAction?: string;
  urgency: UrgencyLevel;
}

export interface SafetyAnalysisResult {
  hazards: SafetyHazard[];
  hasCriticalHazards: boolean;
  overallSafetyScore: number;
}

export class SafetyAnalysisService {
  /**
   * Process safety hazards from AI response
   */
  static processSafetyHazards(hazards: RawSafetyHazard[]): SafetyAnalysisResult {
    const processedHazards = hazards.map((h) => ({
      type: h.type || 'unknown_hazard',
      severity: this.normalizeSafetySeverity(h.severity),
      location: h.location || 'location_not_specified',
      description: h.description || 'Safety hazard detected',
      immediateAction: h.immediateAction,
      urgency: this.normalizeUrgency(h.urgency || 'urgent'),
    }));

    const hasCriticalHazards = processedHazards.some(
      (h) => h.severity === 'critical' || h.severity === 'high'
    );

    const overallSafetyScore = this.calculateSafetyScore(processedHazards);

    return {
      hazards: processedHazards,
      hasCriticalHazards,
      overallSafetyScore,
    };
  }

  /**
   * Normalize safety hazard severity
   */
  private static normalizeSafetySeverity(severity: string | undefined): SafetyHazardSeverity {
    const valid: SafetyHazardSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (severity && valid.includes(severity as SafetyHazardSeverity)) {
      return severity as SafetyHazardSeverity;
    }
    const s = String(severity).toLowerCase();
    if (s.includes('critical') || s.includes('severe')) {
      return 'critical';
    }
    if (s.includes('high')) {
      return 'high';
    }
    if (s.includes('medium') || s.includes('moderate')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Normalize urgency level
   */
  private static normalizeUrgency(urgency: string | undefined): UrgencyLevel {
    const valid: UrgencyLevel[] = ['immediate', 'urgent', 'soon', 'planned', 'monitor'];
    if (urgency && valid.includes(urgency as UrgencyLevel)) {
      return urgency as UrgencyLevel;
    }
    const u = String(urgency).toLowerCase();
    if (u.includes('immediate') || u.includes('critical')) {
      return 'immediate';
    }
    if (u.includes('urgent')) {
      return 'urgent';
    }
    if (u.includes('soon')) {
      return 'soon';
    }
    if (u.includes('planned') || u.includes('schedule')) {
      return 'planned';
    }
    return 'monitor';
  }

  /**
   * Calculate overall safety score (0-100)
   * Higher score = safer
   */
  static calculateSafetyScore(hazards: SafetyHazard[]): number {
    if (hazards.length === 0) {
      return 100; // No hazards = perfect safety
    }

    let score = 100;
    for (const hazard of hazards) {
      switch (hazard.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'high':
          score -= 25;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if damage type is safety-critical
   */
  static isSafetyCritical(damageType: string): boolean {
    const criticalTypes = [
      'structural_failure',
      'electrical_hazard',
      'fire_hazard',
      'asbestos',
      'mold_toxicity',
    ];
    return criticalTypes.some(type => damageType.toLowerCase().includes(type));
  }
}

