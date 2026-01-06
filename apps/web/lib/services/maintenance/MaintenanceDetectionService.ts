/**
 * Maintenance Detection Service
 * Combines YOLO detection with SAM3 segmentation for precise maintenance issue identification
 */

import { LocalYOLOInferenceService } from '../building-surveyor/LocalYOLOInferenceService';
import { SAM3Service } from '../building-surveyor/SAM3Service';
import { serverSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Maintenance issue categories
export const MAINTENANCE_CATEGORIES = {
  // Plumbing (5)
  'pipe_leak': {
    contractor: 'plumber',
    urgency: 'high',
    timeEstimate: '1-2h',
    category: 'plumbing',
    id: 0
  },
  'faucet_drip': {
    contractor: 'plumber',
    urgency: 'medium',
    timeEstimate: '30min',
    category: 'plumbing',
    id: 1
  },
  'toilet_issue': {
    contractor: 'plumber',
    urgency: 'medium',
    timeEstimate: '1h',
    category: 'plumbing',
    id: 2
  },
  'water_heater': {
    contractor: 'plumber',
    urgency: 'high',
    timeEstimate: '2-4h',
    category: 'plumbing',
    id: 3
  },
  'drain_blocked': {
    contractor: 'plumber',
    urgency: 'low',
    timeEstimate: '1h',
    category: 'plumbing',
    id: 4
  },

  // Electrical (3)
  'outlet_damage': {
    contractor: 'electrician',
    urgency: 'high',
    timeEstimate: '1h',
    category: 'electrical',
    id: 5
  },
  'light_fixture': {
    contractor: 'electrician',
    urgency: 'low',
    timeEstimate: '30min',
    category: 'electrical',
    id: 6
  },
  'circuit_breaker': {
    contractor: 'electrician',
    urgency: 'high',
    timeEstimate: '1-2h',
    category: 'electrical',
    id: 7
  },

  // Structure (4)
  'wall_crack': {
    contractor: 'general',
    urgency: 'low',
    timeEstimate: '2-4h',
    category: 'structural',
    id: 8
  },
  'ceiling_stain': {
    contractor: 'roofer',
    urgency: 'medium',
    timeEstimate: '2-3h',
    category: 'structural',
    id: 9
  },
  'window_broken': {
    contractor: 'glazier',
    urgency: 'medium',
    timeEstimate: '1h',
    category: 'structural',
    id: 10
  },
  'door_issue': {
    contractor: 'carpenter',
    urgency: 'low',
    timeEstimate: '1-2h',
    category: 'structural',
    id: 11
  },

  // HVAC (3)
  'ac_not_cooling': {
    contractor: 'hvac',
    urgency: 'medium',
    timeEstimate: '1-2h',
    category: 'hvac',
    id: 12
  },
  'heating_issue': {
    contractor: 'hvac',
    urgency: 'high',
    timeEstimate: '2-3h',
    category: 'hvac',
    id: 13
  },
  'vent_blocked': {
    contractor: 'hvac',
    urgency: 'low',
    timeEstimate: '30min',
    category: 'hvac',
    id: 14
  }
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
      const yoloDetections = await this.runYOLODetection(imageUrl, options);

      if (yoloDetections.length === 0) {
        logger.info('No maintenance issues detected by YOLO');
        return [];
      }

      // Step 2: Optionally enhance with SAM3 segmentation
      if (options.useSAM3 && process.env.ENABLE_SAM3_SEGMENTATION === 'true') {
        return await this.enhanceWithSAM3(imageUrl, yoloDetections);
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
   * Run YOLO detection for maintenance issues
   */
  private static async runYOLODetection(
    imageUrl: string,
    options: {
      confidenceThreshold?: number;
    }
  ): Promise<MaintenanceDetection[]> {
    // Check if we have a local model
    const hasLocalModel = await this.checkLocalModel();

    let detections;
    if (hasLocalModel) {
      // TODO: Implement local YOLO model detection
      // Use local YOLO model (FREE after training!)
      logger.warn('Local model found but detectWithLocalModel not yet implemented, using Roboflow fallback');
      const { RoboflowDetectionService } = await import('../building-surveyor/RoboflowDetectionService');
      const roboflowResults = await RoboflowDetectionService.detect([imageUrl]);
      detections = this.convertRoboflowToLocal(roboflowResults);
    } else {
      // Fallback to Roboflow during bootstrap phase
      logger.warn('Local model not found, using Roboflow fallback');
      const { RoboflowDetectionService } = await import('../building-surveyor/RoboflowDetectionService');
      const roboflowResults = await RoboflowDetectionService.detect([imageUrl]);
      detections = this.convertRoboflowToLocal(roboflowResults);
    }

    // Map to maintenance-specific format
    return detections.map((d: unknown) => this.mapToMaintenanceDetection(d));
  }

  /**
   * Check if local model exists
   */
  private static async checkLocalModel(): Promise<boolean> {
    try {
      const supabase = await serverSupabase();
      const { data } = await supabase
        .from('yolo_models')
        .select('id')
        .eq('model_name', this.MODEL_NAME)
        .eq('is_active', true)
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Convert Roboflow format to local format
   */
  private static convertRoboflowToLocal(roboflowDetections: any[]): any[] {
    return roboflowDetections.map(d => ({
      class_id: this.getClassIdFromName(d.class),
      confidence: d.confidence,
      bbox: {
        x: d.x - d.width / 2,
        y: d.y - d.height / 2,
        width: d.width,
        height: d.height
      }
    }));
  }

  /**
   * Get class ID from issue name
   */
  private static getClassIdFromName(className: string): number {
    const category = Object.entries(MAINTENANCE_CATEGORIES).find(
      ([key, val]) => key === className
    );
    return category ? category[1].id : -1;
  }

  /**
   * Map detection to maintenance format
   */
  private static mapToMaintenanceDetection(detection: unknown): MaintenanceDetection {
    const issueType = Object.keys(MAINTENANCE_CATEGORIES)[detection.class_id];
    const category = MAINTENANCE_CATEGORIES[issueType as keyof typeof MAINTENANCE_CATEGORIES];

    if (!category) {
      throw new Error(`Unknown class ID: ${detection.class_id}`);
    }

    return {
      issue_type: issueType,
      confidence: detection.confidence,
      bbox: detection.bbox,
      severity: this.estimateSeverity(detection),
      requires_immediate_attention: this.isUrgent(category.urgency),
      category: category.category,
      contractor_type: category.contractor,
      estimated_time: category.timeEstimate
    };
  }

  /**
   * Estimate severity based on detection
   */
  private static estimateSeverity(detection: unknown): 'minor' | 'moderate' | 'major' | 'critical' {
    // Use bounding box size as proxy for severity
    const area = detection.bbox.width * detection.bbox.height;
    const imageArea = 640 * 640; // Assuming standard YOLO input size
    const percentage = (area / imageArea) * 100;

    if (percentage < 5) return 'minor';
    if (percentage < 15) return 'moderate';
    if (percentage < 30) return 'major';
    return 'critical';
  }

  /**
   * Check if issue is urgent
   */
  private static isUrgent(urgency: string): boolean {
    return urgency === 'high' || urgency === 'immediate';
  }

  /**
   * Enhance detections with SAM3 segmentation
   */
  private static async enhanceWithSAM3(
    imageUrl: string,
    yoloDetections: MaintenanceDetection[]
  ): Promise<EnhancedMaintenanceDetection[]> {
    try {
      // Use YOLO bounding boxes as prompts for SAM3
      const boxes = yoloDetections.map(d => [
        d.bbox.x,
        d.bbox.y,
        d.bbox.x + d.bbox.width,
        d.bbox.y + d.bbox.height
      ]);

      // TODO: Implement SAM3 precision enhancement
      // This requires refactoring SAM3Service.segment to accept box-based segmentation
      // For now, return YOLO-only results
      logger.debug('SAM3 precision enhancement not yet implemented, returning YOLO-only results');

      return yoloDetections.map((detection) => {
        return {
          ...detection,
          precise_mask: null,
          mask_confidence: detection.confidence,
          pixel_count: 0,
          affected_area_percentage: 0,
          boundaries: []
        } as unknown as EnhancedMaintenanceDetection;
      });

    } catch (error) {
      logger.error('SAM3 enhancement failed:', error);
      return yoloDetections;
    }
  }

  /**
   * Extract boundaries from mask
   */
  private static extractBoundaries(mask: number[][]): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    let top = mask.length;
    let bottom = 0;
    let left = mask[0]?.length || 0;
    let right = 0;

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        if (mask[y][x] === 1) {
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }

    return { top, bottom, left, right };
  }

  /**
   * Calculate severity from segmentation
   */
  static calculateSeverityFromSegmentation(
    detection: EnhancedMaintenanceDetection
  ): 'minor' | 'moderate' | 'major' | 'critical' {
    if (!detection.affected_area_percentage) {
      return detection.severity;
    }

    // Different thresholds for different issue types
    const thresholds: Record<string, { minor: number; moderate: number; major: number }> = {
      'pipe_leak': { minor: 2, moderate: 5, major: 10 },
      'wall_crack': { minor: 1, moderate: 3, major: 5 },
      'ceiling_stain': { minor: 5, moderate: 10, major: 20 },
      'outlet_damage': { minor: 0.5, moderate: 1, major: 2 },
      'default': { minor: 3, moderate: 7, major: 15 }
    };

    const threshold = thresholds[detection.issue_type] || thresholds.default;
    const percentage = detection.affected_area_percentage;

    if (percentage < threshold.minor) return 'minor';
    if (percentage < threshold.moderate) return 'moderate';
    if (percentage < threshold.major) return 'major';
    return 'critical';
  }

  /**
   * Get confidence explanation
   */
  static getConfidenceExplanation(confidence: number): {
    level: 'high' | 'medium' | 'low';
    message: string;
    shouldRequestMorePhotos: boolean;
  } {
    if (confidence >= 0.85) {
      return {
        level: 'high',
        message: 'High confidence detection',
        shouldRequestMorePhotos: false
      };
    } else if (confidence >= 0.60) {
      return {
        level: 'medium',
        message: 'Moderate confidence - verification recommended',
        shouldRequestMorePhotos: false
      };
    } else {
      return {
        level: 'low',
        message: 'Low confidence - better photos needed',
        shouldRequestMorePhotos: true
      };
    }
  }
}