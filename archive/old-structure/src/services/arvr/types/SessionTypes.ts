/**
 * AR/VR Session Types
 *
 * Type definitions for AR/VR sessions and interactions
 */

export interface ARVRSession {
  id: string;
  type: 'ar' | 'vr' | 'mixed';
  jobId: string;
  userId: string;
  status: 'starting' | 'active' | 'paused' | 'ended';
  startTime: number;
  endTime?: number;
  duration: number;
  interactions: ARVRInteraction[];
  performance: ARVRPerformanceMetrics;
  metadata: Record<string, any>;
}

export interface ARVRInteraction {
  id: string;
  type: 'tap' | 'pinch' | 'pan' | 'rotate' | 'voice' | 'gesture';
  target: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface ARVRPerformanceMetrics {
  fps: number;
  frameDrops: number;
  renderTime: number;
  memoryUsage: number;
  batteryDrain: number;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  trackingQuality: 'poor' | 'limited' | 'normal' | 'excellent';
}