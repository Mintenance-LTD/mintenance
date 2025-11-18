/**
 * YOLO Correction Service
 * 
 * Manages user corrections on YOLO detections for continuous learning.
 * 
 * Features:
 * - Store user corrections in YOLO format
 * - Track correction metadata
 * - Export corrections for training
 * - Manage correction workflow (pending → approved → used)
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { loadClassNames } from './yolo-class-names';
import type { RoboflowDetection } from './types';

export interface YOLOCorrection {
  id?: string;
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  originalDetections: RoboflowDetection[];
  correctedLabels?: string; // YOLO format
  correctionsMade?: {
    added?: Array<{ class: string; bbox: { x: number; y: number; width: number; height: number } }>;
    removed?: Array<{ class: string; bbox: { x: number; y: number; width: number; height: number } }>;
    adjusted?: Array<{ original: any; corrected: any }>;
    classChanged?: Array<{ original: any; corrected: any }>;
  };
  correctedBy?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'needs_review';
  confidenceScore?: number;
  correctionQuality?: 'expert' | 'verified' | 'user';
}

export interface CorrectionInput {
  assessmentId: string;
  imageUrl: string;
  imageIndex?: number;
  originalDetections: RoboflowDetection[];
  correctedDetections: Array<
    | RoboflowDetection
    | {
        class: string;
        bbox: { x: number; y: number; width: number; height: number };
        confidence?: number;
      }
  >;
  correctionsMade?: YOLOCorrection['correctionsMade'];
  correctedBy: string;
  correctionQuality?: 'expert' | 'verified' | 'user';
}

/**
 * Convert detections to YOLO format
 * 
 * YOLO format: "class_id x_center y_center width height" (normalized 0-1)
 * Each line represents one detection
 */
export function convertDetectionsToYOLO(
  detections: Array<{
    class: string;
    bbox: { x: number; y: number; width: number; height: number };
  }>,
  imageWidth: number,
  imageHeight: number,
  classNames: string[]
): string {
  const lines: string[] = [];
  
  for (const detection of detections) {
    // Find class ID
    const classIndex = classNames.indexOf(detection.class);
    if (classIndex === -1) {
      logger.warn('Class not found in class names', {
        class: detection.class,
        availableClasses: classNames.slice(0, 10),
      });
      continue;
    }
    
    // Normalize bounding box to 0-1
    const xCenter = (detection.bbox.x + detection.bbox.width / 2) / imageWidth;
    const yCenter = (detection.bbox.y + detection.bbox.height / 2) / imageHeight;
    const width = detection.bbox.width / imageWidth;
    const height = detection.bbox.height / imageHeight;
    
    // Ensure values are in valid range
    const normalizedX = Math.max(0, Math.min(1, xCenter));
    const normalizedY = Math.max(0, Math.min(1, yCenter));
    const normalizedW = Math.max(0, Math.min(1, width));
    const normalizedH = Math.max(0, Math.min(1, height));
    
    // YOLO format: "class_id x_center y_center width height"
    lines.push(`${classIndex} ${normalizedX.toFixed(6)} ${normalizedY.toFixed(6)} ${normalizedW.toFixed(6)} ${normalizedH.toFixed(6)}`);
  }
  
  return lines.join('\n');
}

/**
 * YOLO Correction Service
 */
export class YOLOCorrectionService {
  /**
   * Submit a correction
   */
  static async submitCorrection(input: CorrectionInput): Promise<string> {
    try {
      // Convert corrected detections to YOLO format
      // Note: We need image dimensions - for now, assume standard size or fetch from image
      // In production, you'd fetch actual image dimensions
      const DEFAULT_IMAGE_WIDTH = 640;
      const DEFAULT_IMAGE_HEIGHT = 640;
      
      // Load class names from data.yaml
      const classNames = this.loadClassNames();
      
      // Convert RoboflowDetection[] to format expected by convertDetectionsToYOLO
      const detectionsForYOLO = input.correctedDetections.map(det => {
        // Handle both formats: RoboflowDetection or { class, bbox }
        if ('className' in det && 'boundingBox' in det) {
          // RoboflowDetection format
          return {
            class: det.className,
            bbox: det.boundingBox,
          };
        }
        // Already in correct format
        return det;
      });
      
      const correctedLabels = convertDetectionsToYOLO(
        detectionsForYOLO,
        DEFAULT_IMAGE_WIDTH,
        DEFAULT_IMAGE_HEIGHT,
        classNames
      );
      
      // Calculate confidence score (average of corrected detections)
      const confidenceScore = input.correctedDetections.length > 0
        ? input.correctedDetections.reduce((sum, d) => {
            // Handle both formats
            const conf = 'confidence' in d ? (d.confidence as number) / 100 : (d as any).confidence || 0.5;
            return sum + conf;
          }, 0) / input.correctedDetections.length
        : 0.5;
      
      // Insert correction
      const { data, error } = await serverSupabase
        .from('yolo_corrections')
        .insert({
          assessment_id: input.assessmentId,
          image_url: input.imageUrl,
          image_index: input.imageIndex || 0,
          original_detections: input.originalDetections,
          corrected_labels: correctedLabels,
          corrections_made: input.correctionsMade || {},
          corrected_by: input.correctedBy,
          corrected_at: new Date().toISOString(),
          confidence_score: confidenceScore,
          correction_quality: input.correctionQuality || 'user',
          status: 'pending',
        })
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Failed to submit correction: ${error.message}`);
      }
      
      logger.info('YOLO correction submitted', {
        service: 'YOLOCorrectionService',
        correctionId: data.id,
        assessmentId: input.assessmentId,
        detectionsCount: input.correctedDetections.length,
      });
      
      return data.id;
    } catch (error) {
      logger.error('Failed to submit YOLO correction', error, {
        service: 'YOLOCorrectionService',
        assessmentId: input.assessmentId,
      });
      throw error;
    }
  }
  
  /**
   * Approve a correction (for expert review)
   */
  static async approveCorrection(
    correctionId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('yolo_corrections')
        .update({
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', correctionId);
      
      if (error) {
        throw new Error(`Failed to approve correction: ${error.message}`);
      }
      
      logger.info('YOLO correction approved', {
        service: 'YOLOCorrectionService',
        correctionId,
        reviewedBy,
      });
    } catch (error) {
      logger.error('Failed to approve YOLO correction', error, {
        service: 'YOLOCorrectionService',
        correctionId,
      });
      throw error;
    }
  }
  
  /**
   * Get approved corrections ready for training
   */
  static async getApprovedCorrections(limit?: number): Promise<YOLOCorrection[]> {
    try {
      let query = serverSupabase
        .from('yolo_corrections')
        .select('*')
        .eq('status', 'approved')
        .eq('used_in_training', false)
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(`Failed to get approved corrections: ${error.message}`);
      }
      
      return (data || []).map(this.mapRowToCorrection);
    } catch (error) {
      logger.error('Failed to get approved corrections', error, {
        service: 'YOLOCorrectionService',
      });
      throw error;
    }
  }
  
  /**
   * Mark corrections as used in training
   */
  static async markAsUsedInTraining(
    correctionIds: string[],
    trainingVersion: string
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('yolo_corrections')
        .update({
          used_in_training: true,
          training_version: trainingVersion,
        })
        .in('id', correctionIds);
      
      if (error) {
        throw new Error(`Failed to mark corrections as used: ${error.message}`);
      }
      
      logger.info('Corrections marked as used in training', {
        service: 'YOLOCorrectionService',
        count: correctionIds.length,
        trainingVersion,
      });
    } catch (error) {
      logger.error('Failed to mark corrections as used', error, {
        service: 'YOLOCorrectionService',
      });
      throw error;
    }
  }
  
  /**
   * Get correction counts by status
   */
  static async getCorrectionCounts(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const { data, error } = await serverSupabase
        .from('yolo_corrections')
        .select('status');
      
      if (error) {
        throw new Error(`Failed to get correction counts: ${error.message}`);
      }
      
      const counts = {
        total: data?.length || 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
      
      for (const row of data || []) {
        if (row.status === 'pending') counts.pending++;
        else if (row.status === 'approved') counts.approved++;
        else if (row.status === 'rejected') counts.rejected++;
      }
      
      return counts;
    } catch (error) {
      logger.error('Failed to get correction counts', {
        service: 'YOLOCorrectionService',
        error,
      });
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }
  }

  /**
   * Get correction count by status
   */
  static async getCorrectionStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    usedInTraining: number;
  }> {
    try {
      const { data, error } = await serverSupabase
        .from('yolo_corrections')
        .select('status, used_in_training');
      
      if (error) {
        throw new Error(`Failed to get correction stats: ${error.message}`);
      }
      
      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        usedInTraining: 0,
      };
      
      for (const row of data || []) {
        if (row.used_in_training) {
          stats.usedInTraining++;
        } else {
          stats[row.status as keyof typeof stats]++;
        }
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to get correction stats', error, {
        service: 'YOLOCorrectionService',
      });
      return { pending: 0, approved: 0, rejected: 0, usedInTraining: 0 };
    }
  }
  
  /**
   * Load class names from data.yaml
   */
  private static loadClassNames(): string[] {
    const dataYamlPath = process.env.YOLO_DATA_YAML_PATH;
    return loadClassNames(dataYamlPath);
  }
  
  /**
   * Map database row to YOLOCorrection
   */
  private static mapRowToCorrection(row: any): YOLOCorrection {
    return {
      id: row.id,
      assessmentId: row.assessment_id,
      imageUrl: row.image_url,
      imageIndex: row.image_index,
      originalDetections: row.original_detections || [],
      correctedLabels: row.corrected_labels,
      correctionsMade: row.corrections_made || {},
      correctedBy: row.corrected_by,
      status: row.status,
      confidenceScore: row.confidence_score,
      correctionQuality: row.correction_quality,
    };
  }
}

