/**
 * AR/VR Visualization Service
 *
 * Main service class for AR/VR job visualization functionality
 */

import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { errorTracking } from '../../../utils/productionSetupGuide';
import { ARManager } from '../managers/ARManager';
import { VRManager } from '../managers/VRManager';
import { SessionManager } from '../managers/SessionManager';
import type { ARCapabilities, VRCapabilities } from '../types/ARTypes';
import type { ARVRSession } from '../types/SessionTypes';

export class ARVRVisualizationService {
  private arManager: ARManager;
  private vrManager: VRManager;
  private sessionManager: SessionManager;
  private initialized = false;

  constructor() {
    this.arManager = new ARManager();
    this.vrManager = new VRManager();
    this.sessionManager = new SessionManager();
    this.initializeARVRSystem();
  }

  /**
   * Initialize AR/VR system
   */
  private async initializeARVRSystem(): Promise<void> {
    try {
      // Initialize managers
      await Promise.all([
        this.arManager.initialize(),
        this.vrManager.initialize()
      ]);

      // Start cleanup interval
      setInterval(() => {
        this.sessionManager.cleanup();
      }, 60 * 60 * 1000); // Every hour

      this.initialized = true;

      logger.info('ARVRVisualizationService', 'AR/VR system initialized', {
        platform: Platform.OS,
        arSupport: !!this.arManager.getARCapabilities(),
        vrSupport: !!this.vrManager.getVRCapabilities()
      });

    } catch (error) {
      logger.error('ARVRVisualizationService', 'Failed to initialize AR/VR system', error);
      errorTracking.trackError(error as Error, { context: 'arvr_initialization' });
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get AR capabilities
   */
  getARCapabilities(): ARCapabilities | undefined {
    return this.arManager.getARCapabilities();
  }

  /**
   * Get VR capabilities
   */
  getVRCapabilities(): VRCapabilities | undefined {
    return this.vrManager.getVRCapabilities();
  }

  /**
   * Create AR job visualization
   */
  async createARJobVisualization(jobId: string, title: string, description: string) {
    if (!this.initialized) {
      throw new Error('AR/VR service not initialized');
    }
    return this.arManager.createARJobVisualization(jobId, title, description);
  }

  /**
   * Add model to AR visualization
   */
  async addModelToVisualization(
    visualizationId: string,
    modelId: string,
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number; w: number },
    scale?: { x: number; y: number; z: number }
  ) {
    return this.arManager.addModelToVisualization(visualizationId, modelId, position, rotation, scale);
  }

  /**
   * Add annotation to AR visualization
   */
  async addAnnotation(
    visualizationId: string,
    position: { x: number; y: number; z: number },
    text: string,
    category?: 'note' | 'warning' | 'measurement' | 'instruction',
    author?: string
  ) {
    return this.arManager.addAnnotation(visualizationId, position, text, category, author);
  }

  /**
   * Add measurement to AR visualization
   */
  async addMeasurement(
    visualizationId: string,
    startPoint: { x: number; y: number; z: number },
    endPoint: { x: number; y: number; z: number },
    unit?: 'cm' | 'm' | 'in' | 'ft'
  ) {
    return this.arManager.addMeasurement(visualizationId, startPoint, endPoint, unit);
  }

  /**
   * Create VR walkthrough
   */
  async createVRWalkthrough(jobId: string, title: string, description: string, environment?: string) {
    if (!this.initialized) {
      throw new Error('AR/VR service not initialized');
    }
    return this.vrManager.createVRWalkthrough(jobId, title, description, environment);
  }

  /**
   * Add waypoint to VR walkthrough
   */
  async addWaypoint(
    walkthroughId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number; w: number },
    title: string,
    description: string,
    duration?: number
  ) {
    return this.vrManager.addWaypoint(walkthroughId, position, rotation, title, description, duration);
  }

  /**
   * Add hotspot to VR walkthrough
   */
  async addHotspot(
    walkthroughId: string,
    position: { x: number; y: number; z: number },
    type: 'info' | 'interaction' | 'tool' | 'warning',
    content: string,
    mediaUrl?: string
  ) {
    return this.vrManager.addHotspot(walkthroughId, position, type, content, mediaUrl);
  }

  /**
   * Start AR/VR session
   */
  async startSession(type: 'ar' | 'vr' | 'mixed', jobId: string, userId: string): Promise<ARVRSession> {
    if (!this.initialized) {
      throw new Error('AR/VR service not initialized');
    }
    return this.sessionManager.startSession(type, jobId, userId);
  }

  /**
   * End session
   */
  async endSession(sessionId: string) {
    return this.sessionManager.endSession(sessionId);
  }

  /**
   * Record interaction
   */
  recordInteraction(
    sessionId: string,
    type: 'tap' | 'pinch' | 'pan' | 'rotate' | 'voice' | 'gesture',
    target: string,
    data?: Record<string, any>
  ) {
    return this.sessionManager.recordInteraction(sessionId, type, target, data);
  }

  /**
   * Get active session
   */
  getActiveSession(sessionId: string) {
    return this.sessionManager.getActiveSession(sessionId);
  }

  /**
   * Get AR job visualization
   */
  getARJobVisualization(visualizationId: string) {
    return this.arManager.getJobVisualization(visualizationId);
  }

  /**
   * Get VR walkthrough
   */
  getVRWalkthrough(walkthroughId: string) {
    return this.vrManager.getVRWalkthrough(walkthroughId);
  }

  /**
   * Get available AR models
   */
  getAvailableARModels() {
    return this.arManager.getAvailableModels();
  }

  /**
   * Get job walkthroughs
   */
  getJobWalkthroughs(jobId: string) {
    return this.vrManager.getJobWalkthroughs(jobId);
  }

  /**
   * Get session history
   */
  getSessionHistory() {
    return this.sessionManager.getSessionHistory();
  }

  /**
   * Get user session history
   */
  getUserSessionHistory(userId: string) {
    return this.sessionManager.getUserSessionHistory(userId);
  }

  /**
   * Get job session history
   */
  getJobSessionHistory(jobId: string) {
    return this.sessionManager.getJobSessionHistory(jobId);
  }
}