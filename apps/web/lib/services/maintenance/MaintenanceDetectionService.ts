/**
 * Maintenance Detection Service
 * Combines YOLO detection with SAM3 segmentation for precise maintenance issue identification
 */

import { LocalYOLOInferenceService } from '../building-surveyor/LocalYOLOInferenceService';
import { logger } from '@/lib/logger';
import { runYOLODetection } from './YOLODetectionHandler';
import {
  enhanceWithSAM3,
  calculateSeverityFromSegmentation as _calculateSeverityFromSegmentation,
  getConfidenceExplanation as _getConfidenceExplanation,
} from './SAM3EnhancementHandler';

// Maintenance issue categories
export const MAINTENANCE_CATEGORIES = {
  // Plumbing (5)
  pipe_leak: {
    contractor: 'plumber',
    urgency: 'high',
    timeEstimate: '1-2h',
    category: 'plumbing',
    id: 0,
  },
  faucet_drip: {
    contractor: 'plumber',
    urgency: 'medium',
    timeEstimate: '30min',
    category: 'plumbing',
    id: 1,
  },
  toilet_issue: {
    contractor: 'plumber',
    urgency: 'medium',
    timeEstimate: '1h',
    category: 'plumbing',
    id: 2,
  },
  water_heater: {
    contractor: 'plumber',
    urgency: 'high',
    timeEstimate: '2-4h',
    category: 'plumbing',
    id: 3,
  },
  drain_blocked: {
    contractor: 'plumber',
    urgency: 'low',
    timeEstimate: '1h',
    category: 'plumbing',
    id: 4,
  },

  // Electrical (3)
  outlet_damage: {
    contractor: 'electrician',
    urgency: 'high',
    timeEstimate: '1h',
    category: 'electrical',
    id: 5,
  },
  light_fixture: {
    contractor: 'electrician',
    urgency: 'low',
    timeEstimate: '30min',
    category: 'electrical',
    id: 6,
  },
  circuit_breaker: {
    contractor: 'electrician',
    urgency: 'high',
    timeEstimate: '1-2h',
    category: 'electrical',
    id: 7,
  },

  // Structure (4)
  wall_crack: {
    contractor: 'general',
    urgency: 'low',
    timeEstimate: '2-4h',
    category: 'structural',
    id: 8,
  },
  ceiling_stain: {
    contractor: 'roofer',
    urgency: 'medium',
    timeEstimate: '2-3h',
    category: 'structural',
    id: 9,
  },
  window_broken: {
    contractor: 'glazier',
    urgency: 'medium',
    timeEstimate: '1h',
    category: 'structural',
    id: 10,
  },
  door_issue: {
    contractor: 'carpenter',
    urgency: 'low',
    timeEstimate: '1-2h',
    category: 'structural',
    id: 11,
  },

  // HVAC (3)
  ac_not_cooling: {
    contractor: 'hvac',
    urgency: 'medium',
    timeEstimate: '1-2h',
    category: 'hvac',
    id: 12,
  },
  heating_issue: {
    contractor: 'hvac',
    urgency: 'high',
    timeEstimate: '2-3h',
    category: 'hvac',
    id: 13,
  },
  vent_blocked: {
    contractor: 'hvac',
    urgency: 'low',
    timeEstimate: '30min',
    category: 'hvac',
    id: 14,
  },
};

export interface MaintenanceDetection {
  issue_type: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  requires_immediate_attention: boolean;
  category: string;
  contractor_type: string;
  estimated_time: string;
}

export interface EnhancedMaintenanceDetection extends MaintenanceDetection {
  precise_mask?: number[][];
  mask_confidence?: number;
  pixel_count?: number;
  affected_area_percentage?: number;
  boundaries?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class MaintenanceDetectionService extends LocalYOLOInferenceService {
  static readonly MODEL_NAME = 'maintenance-yolo-v1';
  static readonly CONFIDENCE_THRESHOLD = 0.5;
  static readonly IOU_THRESHOLD = 0.45;

  /**
   * Detect maintenance issues using local YOLO model
   */
  static async detectMaintenanceIssues(
    imageUrl: string,
    options: {
      confidenceThreshold?: number;
      useSAM3?: boolean;
    } = {}
  ): Promise<EnhancedMaintenanceDetection[]> {
    const startTime = Date.now();

    try {
      // Step 1: Run YOLO detection
      const yoloDetections = await runYOLODetection(imageUrl, options);

      if (yoloDetections.length === 0) {
        logger.info('No maintenance issues detected by YOLO');
        return [];
      }

      // Step 2: Optionally enhance with SAM3 segmentation
      if (options.useSAM3 && process.env.ENABLE_SAM3_SEGMENTATION === 'true') {
        return await enhanceWithSAM3(imageUrl, yoloDetections);
      }

      return yoloDetections;
    } catch (error) {
      logger.error('Maintenance detection failed:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.info(`Maintenance detection completed in ${duration}ms`);
    }
  }

  /**
   * Calculate severity from segmentation
   */
  static calculateSeverityFromSegmentation(
    detection: EnhancedMaintenanceDetection
  ): 'minor' | 'moderate' | 'major' | 'critical' {
    return _calculateSeverityFromSegmentation(detection);
  }

  /**
   * Get confidence explanation
   */
  static getConfidenceExplanation(confidence: number): {
    level: 'high' | 'medium' | 'low';
    message: string;
    shouldRequestMorePhotos: boolean;
  } {
    return _getConfidenceExplanation(confidence);
  }
}
