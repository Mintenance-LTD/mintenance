/**
 * Maintenance Detection Service
 * Handles YOLO inference for maintenance issue detection
 */

import * as ort from 'onnxruntime-web';
import { supabase as createClient } from '@/lib/supabase';
import { logger } from '@mintenance/shared';

// Maintenance issue classes
export const MAINTENANCE_CLASSES = [
  'pipe_leak',
  'water_damage',
  'wall_crack',
  'roof_damage',
  'electrical_fault',
  'mold_damp',
  'fire_damage',
  'window_broken',
  'door_damaged',
  'floor_damage',
  'ceiling_damage',
  'foundation_crack',
  'hvac_issue',
  'gutter_blocked',
  'general_damage'
];

export interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  area: number;
}

export interface DetectionOptions {
  useSAM3?: boolean;
  confidenceThreshold?: number;
  maxDetections?: number;
}

export class MaintenanceDetectionService {
  private static session: ort.InferenceSession | null = null;
  private static modelUrl: string | null = null;
  private static isLoading = false;

  /**
   * Initialize the ONNX model
   */
  private static async initModel(): Promise<void> {
    if (this.session || this.isLoading) return;

    this.isLoading = true;

    try {
      // Get model URL from Supabase
      const supabase = createClient;

      // Try to get the latest deployed model
      const { data: deployments } = await supabase
        .from('model_deployments')
        .select('url')
        .eq('is_active', true)
        .eq('model_name', 'maintenance-detector-v1.0')
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();

      if (deployments?.url) {
        this.modelUrl = deployments.url;
      } else {
        // Fallback to environment variable or default
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        this.modelUrl = process.env.NEXT_PUBLIC_YOLO_MODEL_URL ||
          `${supabaseUrl}/storage/v1/object/public/yolo-models/maintenance-v1.0.onnx`;
      }

      // logger.info('Loading YOLO model from:', this.modelUrl', { service: 'lib' });

      // Create ONNX Runtime session
      this.session = await ort.InferenceSession.create(this.modelUrl as string, {
        executionProviders: ['webgl', 'wasm'], // Use WebGL for acceleration
        graphOptimizationLevel: 'all'
      });

      // logger.info('✅ Model loaded successfully', { service: 'lib' });
    } catch (error) {
      logger.error('Failed to load model:', error, { service: 'lib' });
      // Fallback to mock mode for development
      // logger.info('⚠️ Running in mock mode', { service: 'lib' });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Preprocess image for YOLO
   */
  private static async preprocessImage(imageUrl: string): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Create canvas for preprocessing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // YOLO expects 640x640 images
        const targetSize = 640;
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Draw and resize image
        ctx.drawImage(img, 0, 0, targetSize, targetSize);

        // Get image data
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const pixels = imageData.data;

        // Convert to Float32Array and normalize
        const float32Data = new Float32Array(3 * targetSize * targetSize);

        for (let i = 0; i < targetSize * targetSize; i++) {
          const j = i * 4;
          // Normalize to [0, 1] and reorder to CHW format
          float32Data[i] = pixels[j] / 255; // R
          float32Data[targetSize * targetSize + i] = pixels[j + 1] / 255; // G
          float32Data[2 * targetSize * targetSize + i] = pixels[j + 2] / 255; // B
        }

        resolve(float32Data);
      };

      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /**
   * Post-process YOLO output
   */
  private static postprocessDetections(
    output: ort.Tensor,
    confidenceThreshold: number = 0.5,
    maxDetections: number = 10
  ): Detection[] {
    const detections: Detection[] = [];
    const outputData = output.data as Float32Array;

    // YOLO output format: [batch, num_detections, 85] for 80 classes + 5 (x,y,w,h,conf)
    // Our model: [batch, num_detections, 20] for 15 classes + 5
    const numDetections = output.dims[1];
    const numClasses = 15;
    const boxSize = 5 + numClasses;

    for (let i = 0; i < numDetections; i++) {
      const offset = i * boxSize;
      const confidence = outputData[offset + 4];

      if (confidence < confidenceThreshold) continue;

      // Get class probabilities
      let maxProb = 0;
      let maxClass = 0;

      for (let c = 0; c < numClasses; c++) {
        const prob = outputData[offset + 5 + c] * confidence;
        if (prob > maxProb) {
          maxProb = prob;
          maxClass = c;
        }
      }

      if (maxProb < confidenceThreshold) continue;

      // Extract bounding box (x_center, y_center, width, height)
      const x = outputData[offset];
      const y = outputData[offset + 1];
      const w = outputData[offset + 2];
      const h = outputData[offset + 3];

      detections.push({
        class: MAINTENANCE_CLASSES[maxClass],
        confidence: maxProb,
        bbox: [x - w/2, y - h/2, w, h],
        area: w * h
      });
    }

    // Sort by confidence and limit detections
    return detections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxDetections);
  }

  /**
   * Fallback when ML model is unavailable — returns empty results
   * rather than fabricating detections
   */
  private static mockDetection(_imageUrl: string): Detection[] {
    logger.warn('ML model unavailable, returning empty detections', { service: 'lib' });
    return [];
  }

  /**
   * Main detection method
   */
  static async detectMaintenanceIssues(
    imageUrl: string,
    options: DetectionOptions = {}
  ): Promise<Detection[]> {
    const {
      confidenceThreshold = 0.5,
      maxDetections = 10
    } = options;

    try {
      // Initialize model if needed
      await this.initModel();

      // If model failed to load, use mock
      if (!this.session) {
        // logger.info('Using mock detection (model not loaded', { service: 'lib' })');
        return this.mockDetection(imageUrl);
      }

      // Preprocess image
      // logger.info('Preprocessing image...', { service: 'lib' });
      const inputData = await this.preprocessImage(imageUrl);

      // Create input tensor
      const inputTensor = new ort.Tensor('float32', inputData, [1, 3, 640, 640]);

      // Run inference
      // logger.info('Running inference...', { service: 'lib' });
      const results = await this.session.run({ images: inputTensor });

      // Get output tensor
      const output = results['output0'] || results['output'] || Object.values(results)[0];

      if (!output) {
        logger.error('No output from model', { service: 'lib' });
        return this.mockDetection(imageUrl);
      }

      // Post-process detections
      const detections = this.postprocessDetections(
        output as ort.Tensor,
        confidenceThreshold,
        maxDetections
      );

      // logger.info('Found %s detections', { service: 'lib' });
      return detections;

    } catch (error) {
      logger.error('Detection failed:', error, { service: 'lib' });
      // Fallback to mock
      return this.mockDetection(imageUrl);
    }
  }

  /**
   * Get contractor type for detected issue
   */
  static getContractorType(detections: Detection[]): string {
    if (!detections || detections.length === 0) {
      return 'general_contractor';
    }

    const issueToContractor: Record<string, string> = {
      'pipe_leak': 'plumber',
      'water_damage': 'water_restoration',
      'wall_crack': 'structural_engineer',
      'roof_damage': 'roofer',
      'electrical_fault': 'electrician',
      'mold_damp': 'mold_specialist',
      'fire_damage': 'restoration_contractor',
      'window_broken': 'glazier',
      'door_damaged': 'carpenter',
      'floor_damage': 'flooring_contractor',
      'ceiling_damage': 'ceiling_specialist',
      'foundation_crack': 'foundation_specialist',
      'hvac_issue': 'hvac_technician',
      'gutter_blocked': 'gutter_specialist',
      'general_damage': 'general_contractor'
    };

    const primaryIssue = detections[0].class;
    return issueToContractor[primaryIssue] || 'general_contractor';
  }

  /**
   * Check model health
   */
  static async checkModelHealth(): Promise<{
    loaded: boolean;
    url: string | null;
    ready: boolean;
  }> {
    await this.initModel();

    return {
      loaded: this.session !== null,
      url: this.modelUrl,
      ready: !this.isLoading && this.session !== null
    };
  }
}