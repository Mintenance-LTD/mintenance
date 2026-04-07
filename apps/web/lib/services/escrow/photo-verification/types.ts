export interface PhotoQualityResult {
  passed: boolean;
  qualityScore: number; // 0-1
  brightness: number; // 0-1
  sharpness: number; // 0-1
  resolution: { width: number; height: number };
  issues: string[];
}

export interface ComparisonResult {
  comparisonScore: number; // 0-1
  matches: boolean;
  differences: string[];
  confidence: number;
}

export interface GeolocationResult {
  verified: boolean;
  distance: number; // meters from job location
  accuracy: number; // GPS accuracy in meters
  withinThreshold: boolean;
}

export interface TimestampResult {
  verified: boolean;
  timestamp: Date;
  isRecent: boolean; // Within expected time window
  timeDifference: number; // milliseconds
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  requirements: {
    minPhotos: number;
    requiredAngles: string[];
    categorySpecific: Record<string, string[]>;
  };
}

export interface Photo {
  url: string;
  geolocation?: { lat: number; lng: number; accuracy?: number };
  timestamp?: Date;
  angleType?: string;
  qualityScore?: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface ImageInfo {
  brightness: number;
  sharpness: number;
  resolution: { width: number; height: number };
  fileSize?: number;
}

export interface PhotoMetadata {
  geolocation?: { lat: number; lng: number; accuracy?: number };
  timestamp?: Date;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        image_url?: { url: string; detail: string };
      }>;
}
