import type { YOLODetection } from '../yolo-postprocessing';
import type { DamageSeverity, UrgencyLevel } from '../types';
import type { InternalPrediction } from '../InternalDamageClassifier';

const SEVERE_CLASSES = [
  'bare_electrical_wire',
  'dangerous_electrical_socket',
  'unstable',
  'damaged_tower',
  'damaged_roof',
  'structural_damage',
];
const MODERATE_CLASSES = [
  'crack',
  'damaged_wall',
  'damaged_brick',
  'spalling',
  'leaking_damage_on_wood',
  'wall_leaking',
  'burst',
  'hole',
];
const MINOR_CLASSES = [
  'minor_crack',
  'damp',
  'mold',
  'rust_on_radiator',
  'loose_pipes',
  'wall_stain',
];

const DAMAGE_TYPE_MAPPING: Record<string, string> = {
  crack: 'structural_crack',
  damaged_wall: 'wall_damage',
  damp: 'water_damage',
  mold: 'mold_damage',
  bare_electrical_wire: 'electrical_hazard',
  damaged_roof: 'roof_damage',
  spalling: 'concrete_spalling',
};

export function getLowConfidencePrediction(): InternalPrediction {
  return {
    damageType: 'unknown',
    severity: 'early',
    confidence: 0,
    safetyHazards: [],
    urgency: 'monitor',
    features: [],
  };
}

export function detectionsToAssessment(
  detections: YOLODetection[]
): InternalPrediction {
  if (detections.length === 0) return getLowConfidencePrediction();

  let primaryDamage = detections[0];
  let severity: DamageSeverity = 'early';
  let urgency: UrgencyLevel = 'monitor';
  const safetyHazards: Array<{
    type: string;
    description: string;
    recommendation: string;
  }> = [];

  for (const detection of detections) {
    const className = detection.className.toLowerCase();
    if (SEVERE_CLASSES.some((c) => className.includes(c))) {
      primaryDamage = detection;
      severity = 'dangerous';
      urgency = 'urgent';
      safetyHazards.push({
        type: className,
        description: `High severity ${className} detected with ${(detection.confidence * 100).toFixed(0)}% confidence`,
        recommendation: 'Immediate professional assessment recommended',
      });
      break;
    } else if (MODERATE_CLASSES.some((c) => className.includes(c))) {
      if (severity === 'early') {
        primaryDamage = detection;
        severity = 'developing';
        urgency = 'soon';
      }
    } else if (MINOR_CLASSES.some((c) => className.includes(c))) {
      if (severity === 'early') {
        primaryDamage = detection;
        urgency = 'planned';
      }
    }
  }

  const topDetections = detections.slice(0, 3);
  const avgConfidence =
    topDetections.reduce((sum, d) => sum + d.confidence, 0) /
    topDetections.length;
  const damageTypeKey =
    Object.keys(DAMAGE_TYPE_MAPPING).find((key) =>
      primaryDamage.className.toLowerCase().includes(key)
    ) || primaryDamage.className;

  return {
    damageType: DAMAGE_TYPE_MAPPING[damageTypeKey] || damageTypeKey,
    severity,
    confidence: Math.round(avgConfidence * 100),
    safetyHazards,
    urgency,
    features: [],
  };
}
