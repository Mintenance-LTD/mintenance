/**
 * Shared types for the AI Analysis modules.
 */

export interface OpenAISafetyConcern {
  concern: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
}

export interface OpenAIDetectedEquipment {
  name: string;
  confidence: number;
  location: string;
}

export interface OpenAIAnalysisResponse {
  confidence: number;
  detectedItems: string[];
  safetyConcerns: OpenAISafetyConcern[];
  recommendedActions: string[];
  estimatedComplexity: 'Low' | 'Medium' | 'High';
  suggestedTools: string[];
  estimatedDuration: string;
  detectedEquipment: OpenAIDetectedEquipment[];
}

export interface EquipmentEntry {
  name: string;
  keywords: string[];
  locations: string[];
  baseConfidence: number;
}

export interface DetectedEquipmentItem {
  name: string;
  confidence: number;
  location: string;
}
