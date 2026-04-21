import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
    case 'full':
      return 'text-red-600 bg-red-50';
    case 'severe':
    case 'midway':
      return 'text-orange-600 bg-orange-50';
    case 'moderate':
    case 'medium':
      return 'text-yellow-800 bg-yellow-50';
    case 'minimal':
    case 'early':
    case 'low':
    case 'none':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getRiskIcon(level: string): React.ReactNode {
  switch (level) {
    case 'critical':
    case 'high':
      return <AlertCircle className='w-5 h-5 text-red-500' />;
    case 'medium':
      return <AlertTriangle className='w-5 h-5 text-yellow-500' />;
    case 'low':
      return <CheckCircle className='w-5 h-5 text-green-500' />;
    default:
      return <Info className='w-5 h-5 text-gray-500' />;
  }
}

export function getRiskLevelFromScore(score: number): string {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// Keywords that make a damageType a plausible match for a given category.
// Intentionally loose — we'd rather under-warn than false-positive.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  plumbing: ['leak', 'pipe', 'water', 'drain', 'tap', 'toilet', 'plumb'],
  electrical: ['electric', 'wire', 'outlet', 'circuit', 'socket', 'fuse'],
  roofing: ['roof', 'tile', 'shingle', 'gutter', 'truss'],
  carpentry: ['wood', 'timber', 'door', 'frame', 'cabinet', 'joinery'],
  painting: ['paint', 'decorat'],
  hvac: ['boiler', 'heat', 'cool', 'vent', 'ac_', 'air_con', 'furnace'],
  flooring: ['floor', 'laminate', 'carpet'],
  gardening: ['garden', 'grass', 'hedge', 'landscape', 'lawn', 'plant'],
  landscaping: ['garden', 'grass', 'hedge', 'landscape', 'lawn', 'plant'],
  cleaning: ['clean', 'dust'],
};

export function damageMatchesCategory(
  damageType: string | null | undefined,
  category: string | null | undefined
): boolean {
  if (!damageType || !category) return true;
  const cat = category.toLowerCase();
  // Handyman / other / general are deliberately permissive — they don't
  // pin the AI to any particular damage family.
  if (cat === 'handyman' || cat === 'other' || cat === 'general') return true;
  const keywords = CATEGORY_KEYWORDS[cat];
  if (!keywords) return true;
  const dt = damageType.toLowerCase();
  return keywords.some((k) => dt.includes(k));
}
