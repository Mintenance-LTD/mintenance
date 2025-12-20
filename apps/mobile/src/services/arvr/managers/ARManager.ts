/**
 * Augmented Reality Manager
 *
 * Handles AR-specific functionality including capabilities checking,
 * job visualization creation, and AR session management
 */

import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import type { ARCapabilities, ARJobVisualization, AR3DModel, ARPlacedModel, ARAnnotation, ARMeasurement } from '../types/ARTypes';

export class ARManager {
  private arCapabilities?: ARCapabilities;
  private arModels: Map<string, AR3DModel> = new Map();
  private jobVisualizations: Map<string, ARJobVisualization> = new Map();

  /**
   * Initialize AR system
   */
  async initialize(): Promise<void> {
    this.arCapabilities = await this.checkARCapabilities();
    await this.loadDefaultModels();

    logger.info('ARManager', 'AR system initialized', {
      arSupport: !!this.arCapabilities,
      platform: Platform.OS
    });
  }

  /**
   * Check AR capabilities
   */
  async checkARCapabilities(): Promise<ARCapabilities> {
    const capabilities: ARCapabilities = {
      worldTracking: false,
      planeDetection: false,
      faceTracking: false,
      imageTracking: false,
      objectDetection: false,
      lightEstimation: false,
      occlusionSupport: false,
      persistentAnchors: false
    };

    if (Platform.OS === 'web') {
      if ('xr' in navigator && navigator.xr) {
        try {
          const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
          if (isSupported) {
            capabilities.worldTracking = true;
            capabilities.planeDetection = true;
            capabilities.lightEstimation = true;
          }
        } catch (error) {
          logger.warn('ARManager', 'WebXR AR not supported', error);
        }
      }
    } else {
      if (Platform.OS === 'ios') {
        capabilities.worldTracking = true;
        capabilities.planeDetection = true;
        capabilities.faceTracking = true;
        capabilities.imageTracking = true;
        capabilities.objectDetection = true;
        capabilities.lightEstimation = true;
        capabilities.occlusionSupport = true;
        capabilities.persistentAnchors = true;
      } else if (Platform.OS === 'android') {
        capabilities.worldTracking = true;
        capabilities.planeDetection = true;
        capabilities.lightEstimation = true;
        capabilities.persistentAnchors = true;
      }
    }

    return capabilities;
  }

  /**
   * Load default 3D models
   */
  private async loadDefaultModels(): Promise<void> {
    const defaultModels: AR3DModel[] = [
      {
        id: 'kitchen_sink',
        name: 'Kitchen Sink',
        category: 'fixture',
        fileUrl: '/models/kitchen_sink.usdz',
        thumbnailUrl: '/thumbnails/kitchen_sink.jpg',
        dimensions: { width: 60, height: 20, depth: 45 },
        scale: { x: 1, y: 1, z: 1 },
        materials: ['stainless_steel', 'ceramic'],
        price: 299.99,
        metadata: { installTime: 2, difficulty: 'medium' }
      },
      {
        id: 'bathroom_vanity',
        name: 'Bathroom Vanity',
        category: 'furniture',
        fileUrl: '/models/bathroom_vanity.usdz',
        thumbnailUrl: '/thumbnails/bathroom_vanity.jpg',
        dimensions: { width: 120, height: 85, depth: 50 },
        scale: { x: 1, y: 1, z: 1 },
        materials: ['wood', 'marble'],
        price: 899.99,
        metadata: { installTime: 4, difficulty: 'hard' }
      }
    ];

    for (const model of defaultModels) {
      this.arModels.set(model.id, model);
    }

    logger.info('ARManager', 'Default AR models loaded', {
      modelCount: this.arModels.size
    });
  }

  /**
   * Create AR job visualization
   */
  async createARJobVisualization(
    jobId: string,
    title: string,
    description: string
  ): Promise<ARJobVisualization> {
    const visualization: ARJobVisualization = {
      id: `ar_viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      title,
      description,
      placedModels: [],
      annotations: [],
      measurements: [],
      photoReferences: [],
      lighting: this.getDefaultLighting(),
      timeline: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    this.jobVisualizations.set(visualization.id, visualization);

    logger.info('ARManager', 'AR job visualization created', {
      visualizationId: visualization.id,
      jobId
    });

    return visualization;
  }

  /**
   * Add model to visualization
   */
  async addModelToVisualization(
    visualizationId: string,
    modelId: string,
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number; w: number },
    scale?: { x: number; y: number; z: number }
  ): Promise<ARPlacedModel> {
    const visualization = this.jobVisualizations.get(visualizationId);
    if (!visualization) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    const model = this.arModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const placedModel: ARPlacedModel = {
      id: `placed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      position,
      rotation: rotation || { x: 0, y: 0, z: 0, w: 1 },
      scale: scale || model.scale,
      isLocked: false,
      visibility: true,
      metadata: {}
    };

    visualization.placedModels.push(placedModel);
    visualization.updatedAt = Date.now();

    logger.info('ARManager', 'Model added to AR visualization', {
      visualizationId,
      modelId,
      placedModelId: placedModel.id
    });

    return placedModel;
  }

  /**
   * Add annotation to visualization
   */
  async addAnnotation(
    visualizationId: string,
    position: { x: number; y: number; z: number },
    text: string,
    category: 'note' | 'warning' | 'measurement' | 'instruction' = 'note',
    author: string = 'user'
  ): Promise<ARAnnotation> {
    const visualization = this.jobVisualizations.get(visualizationId);
    if (!visualization) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    const annotation: ARAnnotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      text,
      category,
      color: this.getAnnotationColor(category),
      size: 1.0,
      visibility: true,
      timestamp: Date.now(),
      author
    };

    visualization.annotations.push(annotation);
    visualization.updatedAt = Date.now();

    logger.info('ARManager', 'Annotation added to AR visualization', {
      visualizationId,
      annotationId: annotation.id,
      category
    });

    return annotation;
  }

  /**
   * Add measurement to visualization
   */
  async addMeasurement(
    visualizationId: string,
    startPoint: { x: number; y: number; z: number },
    endPoint: { x: number; y: number; z: number },
    unit: 'cm' | 'm' | 'in' | 'ft' = 'm'
  ): Promise<ARMeasurement> {
    const visualization = this.jobVisualizations.get(visualizationId);
    if (!visualization) {
      throw new Error(`Visualization not found: ${visualizationId}`);
    }

    const distance = this.calculateDistance(startPoint, endPoint);
    const convertedDistance = this.convertDistance(distance, 'm', unit);

    const measurement: ARMeasurement = {
      id: `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startPoint,
      endPoint,
      distance: convertedDistance,
      unit,
      label: `${convertedDistance.toFixed(2)} ${unit}`,
      accuracy: 0.95,
      timestamp: Date.now()
    };

    visualization.measurements.push(measurement);
    visualization.updatedAt = Date.now();

    logger.info('ARManager', 'Measurement added to AR visualization', {
      visualizationId,
      measurementId: measurement.id,
      distance: convertedDistance,
      unit
    });

    return measurement;
  }

  /**
   * Get AR capabilities
   */
  getARCapabilities(): ARCapabilities | undefined {
    return this.arCapabilities;
  }

  /**
   * Get available AR models
   */
  getAvailableModels(): AR3DModel[] {
    return Array.from(this.arModels.values());
  }

  /**
   * Get job visualization
   */
  getJobVisualization(visualizationId: string): ARJobVisualization | undefined {
    return this.jobVisualizations.get(visualizationId);
  }

  /**
   * Helper methods
   */
  private getDefaultLighting() {
    return {
      ambientLight: {
        color: { r: 0.8, g: 0.8, b: 0.8 },
        intensity: 0.3
      },
      directionalLights: [{
        direction: { x: -0.5, y: -1, z: -0.5 },
        color: { r: 1, g: 1, b: 1 },
        intensity: 0.8,
        castShadows: true
      }],
      pointLights: [],
      shadowSettings: {
        enabled: true,
        quality: 'medium' as const,
        cascades: 2,
        distance: 100
      }
    };
  }

  private getAnnotationColor(category: string): string {
    const colors = {
      note: '#007AFF',
      warning: '#FF3B30',
      measurement: '#34C759',
      instruction: '#FF9500'
    };
    return colors[category as keyof typeof colors] || colors.note;
  }

  private calculateDistance(start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private convertDistance(distance: number, fromUnit: string, toUnit: string): number {
    const conversions: Record<string, number> = {
      m: 1,
      cm: 100,
      in: 39.3701,
      ft: 3.28084
    };

    const inMeters = distance / conversions[fromUnit];
    return inMeters * conversions[toUnit];
  }
}