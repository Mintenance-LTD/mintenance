/**
 * YOLO Detection Handler
 * Handles YOLO-specific detection logic for maintenance issues
 */

import { LocalYOLOInferenceService } from '../building-surveyor/LocalYOLOInferenceService';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';
import {
  MAINTENANCE_CATEGORIES,
  type MaintenanceDetection,
} from './MaintenanceDetectionService';

const MODEL_NAME = 'maintenance-yolo-v1';

/**
 * Check if a local YOLO model exists in the database
 */
async function checkLocalModel(): Promise<boolean> {
  try {
    const supabase = serverSupabase;
    const { data } = await supabase
      .from('yolo_models')
      .select('id')
      .eq('model_name', MODEL_NAME)
      .eq('is_active', true)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get class ID from issue name
 */
function getClassIdFromName(className: string): number {
  const category = Object.entries(MAINTENANCE_CATEGORIES).find(
    ([key]) => key === className
  );
  return category ? category[1].id : -1;
}

/**
 * Convert Roboflow detection format to local format
 */
function convertRoboflowToLocal(
  roboflowDetections: Record<string, unknown>[]
): Record<string, unknown>[] {
  return roboflowDetections.map((d: Record<string, unknown>) => ({
    class_id: getClassIdFromName(d.class as string),
    confidence: d.confidence as number,
    bbox: {
      x: (d.x as number) - (d.width as number) / 2,
      y: (d.y as number) - (d.height as number) / 2,
      width: d.width as number,
      height: d.height as number,
    },
  }));
}

/**
 * Map a raw detection result to the MaintenanceDetection format
 */
function mapToMaintenanceDetection(
  detection: Record<string, unknown>
): MaintenanceDetection {
  const issueType = Object.keys(MAINTENANCE_CATEGORIES)[
    detection.class_id as number
  ];
  const category =
    MAINTENANCE_CATEGORIES[issueType as keyof typeof MAINTENANCE_CATEGORIES];

  if (!category) {
    throw new Error(`Unknown class ID: ${detection.class_id}`);
  }

  const bbox = detection.bbox as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  return {
    issue_type: issueType,
    confidence: detection.confidence as number,
    bbox,
    severity: estimateSeverity(bbox),
    requires_immediate_attention: isUrgent(category.urgency),
    category: category.category,
    contractor_type: category.contractor,
    estimated_time: category.timeEstimate,
  };
}

/**
 * Estimate severity based on bounding box size relative to standard YOLO input
 */
function estimateSeverity(bbox: {
  width: number;
  height: number;
}): 'minor' | 'moderate' | 'major' | 'critical' {
  const area = bbox.width * bbox.height;
  const imageArea = 640 * 640; // Assuming standard YOLO input size
  const percentage = (area / imageArea) * 100;

  if (percentage < 5) return 'minor';
  if (percentage < 15) return 'moderate';
  if (percentage < 30) return 'major';
  return 'critical';
}

/**
 * Check if an issue urgency level requires immediate attention
 */
function isUrgent(urgency: string): boolean {
  return urgency === 'high' || urgency === 'immediate';
}

/**
 * Run YOLO detection for maintenance issues.
 * Tries local model first, falls back to Roboflow.
 */
export async function runYOLODetection(
  imageUrl: string,
  _options: {
    confidenceThreshold?: number;
  }
): Promise<MaintenanceDetection[]> {
  const hasLocalModel = await checkLocalModel();

  let detections: Record<string, unknown>[];
  if (hasLocalModel && LocalYOLOInferenceService.isAvailable()) {
    try {
      logger.info('Running local YOLO model detection', {
        service: 'MaintenanceDetectionService',
      });
      const localResults = await LocalYOLOInferenceService.detect([imageUrl]);
      detections = localResults.map((r) => ({
        class_id: getClassIdFromName(r.className),
        confidence: r.confidence / 100,
        bbox: {
          x: r.boundingBox.x,
          y: r.boundingBox.y,
          width: r.boundingBox.width,
          height: r.boundingBox.height,
        },
      }));
    } catch (localError) {
      logger.warn('Local YOLO inference failed, falling back to Roboflow', {
        service: 'MaintenanceDetectionService',
        error:
          localError instanceof Error ? localError.message : String(localError),
      });
      const { RoboflowDetectionService } =
        await import('../building-surveyor/RoboflowDetectionService');
      const roboflowResults = await RoboflowDetectionService.detect([imageUrl]);
      detections = convertRoboflowToLocal(
        roboflowResults as unknown as Record<string, unknown>[]
      );
    }
  } else {
    if (hasLocalModel) {
      logger.warn(
        'Local model exists in DB but ONNX runtime not initialized, using Roboflow fallback',
        {
          service: 'MaintenanceDetectionService',
        }
      );
    } else {
      logger.info('No local model available, using Roboflow', {
        service: 'MaintenanceDetectionService',
      });
    }
    const { RoboflowDetectionService } =
      await import('../building-surveyor/RoboflowDetectionService');
    const roboflowResults = await RoboflowDetectionService.detect([imageUrl]);
    detections = convertRoboflowToLocal(
      roboflowResults as unknown as Record<string, unknown>[]
    );
  }

  return detections.map((d: Record<string, unknown>) =>
    mapToMaintenanceDetection(d)
  );
}
