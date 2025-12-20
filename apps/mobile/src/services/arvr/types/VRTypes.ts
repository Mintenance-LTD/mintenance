/**
 * Virtual Reality Types
 *
 * Type definitions for VR functionality
 */

export interface VRCapabilities {
  roomScale: boolean;
  handTracking: boolean;
  controllerSupport: boolean;
  hapticFeedback: boolean;
  spatialAudio: boolean;
  eyeTracking: boolean;
  passthrough: boolean;
}

export interface VRJobWalkthrough {
  id: string;
  jobId: string;
  title: string;
  description: string;
  environment: string;
  waypoints: VRWaypoint[];
  hotspots: VRHotspot[];
  narration: VRNarration[];
  interactiveElements: VRInteractiveElement[];
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

export interface VRWaypoint {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  title: string;
  description: string;
  duration: number;
  actions: string[];
  triggers: string[];
}

export interface VRHotspot {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'info' | 'interaction' | 'tool' | 'warning';
  content: string;
  mediaUrl?: string;
  actions: string[];
  isVisible: boolean;
}

export interface VRNarration {
  id: string;
  waypointId: string;
  audioUrl: string;
  text: string;
  startTime: number;
  duration: number;
  voice: 'male' | 'female' | 'neutral';
  language: string;
}

export interface VRInteractiveElement {
  id: string;
  type: 'tool' | 'material' | 'measurement' | 'annotation';
  position: { x: number; y: number; z: number };
  modelId: string;
  interactions: Array<{
    type: 'grab' | 'touch' | 'look' | 'speak';
    action: string;
    feedback: 'visual' | 'audio' | 'haptic';
  }>;
  state: Record<string, any>;
}