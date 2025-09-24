/**
 * Virtual Reality Manager
 *
 * Handles VR-specific functionality including capabilities checking,
 * walkthrough creation, and VR session management
 */

import { Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import type { VRCapabilities, VRJobWalkthrough, VRWaypoint, VRHotspot, VRNarration, VRInteractiveElement } from '../types/VRTypes';

export class VRManager {
  private vrCapabilities?: VRCapabilities;
  private vrWalkthroughs: Map<string, VRJobWalkthrough> = new Map();

  /**
   * Initialize VR system
   */
  async initialize(): Promise<void> {
    this.vrCapabilities = await this.checkVRCapabilities();

    logger.info('VRManager', 'VR system initialized', {
      vrSupport: !!this.vrCapabilities,
      platform: Platform.OS
    });
  }

  /**
   * Check VR capabilities
   */
  async checkVRCapabilities(): Promise<VRCapabilities> {
    const capabilities: VRCapabilities = {
      roomScale: false,
      handTracking: false,
      controllerSupport: false,
      hapticFeedback: false,
      spatialAudio: false,
      eyeTracking: false,
      passthrough: false
    };

    if (Platform.OS === 'web') {
      if ('xr' in navigator && navigator.xr) {
        try {
          const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
          if (isSupported) {
            capabilities.roomScale = true;
            capabilities.controllerSupport = true;
            capabilities.hapticFeedback = true;
            capabilities.spatialAudio = true;
          }
        } catch (error) {
          logger.warn('VRManager', 'WebXR VR not supported', error);
        }
      }
    } else {
      // Mobile VR capabilities are limited
      capabilities.controllerSupport = true;
      capabilities.spatialAudio = true;
    }

    return capabilities;
  }

  /**
   * Create VR job walkthrough
   */
  async createVRWalkthrough(
    jobId: string,
    title: string,
    description: string,
    environment: string = 'default'
  ): Promise<VRJobWalkthrough> {
    const walkthrough: VRJobWalkthrough = {
      id: `vr_walkthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      title,
      description,
      environment,
      waypoints: [],
      hotspots: [],
      narration: [],
      interactiveElements: [],
      duration: 0,
      difficulty: 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    this.vrWalkthroughs.set(walkthrough.id, walkthrough);

    logger.info('VRManager', 'VR job walkthrough created', {
      walkthroughId: walkthrough.id,
      jobId
    });

    return walkthrough;
  }

  /**
   * Add waypoint to walkthrough
   */
  async addWaypoint(
    walkthroughId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number; w: number },
    title: string,
    description: string,
    duration: number = 30
  ): Promise<VRWaypoint> {
    const walkthrough = this.vrWalkthroughs.get(walkthroughId);
    if (!walkthrough) {
      throw new Error(`VR walkthrough not found: ${walkthroughId}`);
    }

    const waypoint: VRWaypoint = {
      id: `waypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      rotation,
      title,
      description,
      duration,
      actions: [],
      triggers: []
    };

    walkthrough.waypoints.push(waypoint);
    walkthrough.duration += duration;
    walkthrough.updatedAt = Date.now();

    logger.info('VRManager', 'Waypoint added to VR walkthrough', {
      walkthroughId,
      waypointId: waypoint.id
    });

    return waypoint;
  }

  /**
   * Add hotspot to walkthrough
   */
  async addHotspot(
    walkthroughId: string,
    position: { x: number; y: number; z: number },
    type: 'info' | 'interaction' | 'tool' | 'warning',
    content: string,
    mediaUrl?: string
  ): Promise<VRHotspot> {
    const walkthrough = this.vrWalkthroughs.get(walkthroughId);
    if (!walkthrough) {
      throw new Error(`VR walkthrough not found: ${walkthroughId}`);
    }

    const hotspot: VRHotspot = {
      id: `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      type,
      content,
      mediaUrl,
      actions: [],
      isVisible: true
    };

    walkthrough.hotspots.push(hotspot);
    walkthrough.updatedAt = Date.now();

    logger.info('VRManager', 'Hotspot added to VR walkthrough', {
      walkthroughId,
      hotspotId: hotspot.id,
      type
    });

    return hotspot;
  }

  /**
   * Add narration to walkthrough
   */
  async addNarration(
    walkthroughId: string,
    waypointId: string,
    text: string,
    audioUrl: string,
    startTime: number = 0,
    duration: number = 10,
    voice: 'male' | 'female' | 'neutral' = 'neutral',
    language: string = 'en'
  ): Promise<VRNarration> {
    const walkthrough = this.vrWalkthroughs.get(walkthroughId);
    if (!walkthrough) {
      throw new Error(`VR walkthrough not found: ${walkthroughId}`);
    }

    const narration: VRNarration = {
      id: `narration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      waypointId,
      audioUrl,
      text,
      startTime,
      duration,
      voice,
      language
    };

    walkthrough.narration.push(narration);
    walkthrough.updatedAt = Date.now();

    logger.info('VRManager', 'Narration added to VR walkthrough', {
      walkthroughId,
      narrationId: narration.id,
      waypointId
    });

    return narration;
  }

  /**
   * Add interactive element to walkthrough
   */
  async addInteractiveElement(
    walkthroughId: string,
    type: 'tool' | 'material' | 'measurement' | 'annotation',
    position: { x: number; y: number; z: number },
    modelId: string,
    interactions: Array<{
      type: 'grab' | 'touch' | 'look' | 'speak';
      action: string;
      feedback: 'visual' | 'audio' | 'haptic';
    }>
  ): Promise<VRInteractiveElement> {
    const walkthrough = this.vrWalkthroughs.get(walkthroughId);
    if (!walkthrough) {
      throw new Error(`VR walkthrough not found: ${walkthroughId}`);
    }

    const element: VRInteractiveElement = {
      id: `interactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      modelId,
      interactions,
      state: {}
    };

    walkthrough.interactiveElements.push(element);
    walkthrough.updatedAt = Date.now();

    logger.info('VRManager', 'Interactive element added to VR walkthrough', {
      walkthroughId,
      elementId: element.id,
      type
    });

    return element;
  }

  /**
   * Get VR capabilities
   */
  getVRCapabilities(): VRCapabilities | undefined {
    return this.vrCapabilities;
  }

  /**
   * Get VR walkthrough
   */
  getVRWalkthrough(walkthroughId: string): VRJobWalkthrough | undefined {
    return this.vrWalkthroughs.get(walkthroughId);
  }

  /**
   * Get all VR walkthroughs for a job
   */
  getJobWalkthroughs(jobId: string): VRJobWalkthrough[] {
    return Array.from(this.vrWalkthroughs.values()).filter(w => w.jobId === jobId);
  }

  /**
   * Update walkthrough difficulty
   */
  updateWalkthroughDifficulty(walkthroughId: string, difficulty: 'easy' | 'medium' | 'hard'): boolean {
    const walkthrough = this.vrWalkthroughs.get(walkthroughId);
    if (!walkthrough) {
      return false;
    }

    walkthrough.difficulty = difficulty;
    walkthrough.updatedAt = Date.now();

    logger.info('VRManager', 'VR walkthrough difficulty updated', {
      walkthroughId,
      difficulty
    });

    return true;
  }

  /**
   * Remove walkthrough
   */
  removeWalkthrough(walkthroughId: string): boolean {
    const removed = this.vrWalkthroughs.delete(walkthroughId);

    if (removed) {
      logger.info('VRManager', 'VR walkthrough removed', { walkthroughId });
    }

    return removed;
  }
}