import type { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';

/**
 * Static catalogues backing the QuickJobPostScreen UI:
 *   - REPAIR_TEMPLATES drives the 6-card "Common Repairs" grid
 *   - URGENCY_OPTIONS drives the timeline chip row
 *   - VALID_JOB_CATEGORIES + normalizeJobCategory ensure we only post
 *     categories the server's enum will accept.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b). Budget removed
 * 2026-05-22 (contractors set their own price on each bid).
 */

export interface RepairTemplate {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  category: string;
  description: string;
  iconColor: string;
  iconBg: string;
}

export const REPAIR_TEMPLATES: RepairTemplate[] = [
  {
    id: 'leaky-tap',
    icon: 'water-outline',
    title: 'Leaky Tap/Pipe',
    category: 'plumbing',
    description: 'Fix dripping tap, leaking pipe, or water issue',
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
  {
    id: 'electrical-issue',
    icon: 'flash-outline',
    title: 'Electrical Issue',
    category: 'electrical',
    description: 'Fix power outlet, switch, or minor electrical problem',
    iconColor: '#92400E',
    iconBg: me.warnBg,
  },
  {
    id: 'paint-touchup',
    icon: 'color-palette-outline',
    title: 'Painting/Touch-up',
    category: 'painting',
    description: 'Paint room, touch-up walls, or refresh surfaces',
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
  },
  {
    id: 'general-repair',
    icon: 'construct-outline',
    title: 'General Repair',
    category: 'handyman',
    description: 'Fix door, window, furniture, or general maintenance',
    iconColor: me.ink2,
    iconBg: me.bg2,
  },
  {
    id: 'blocked-drain',
    icon: 'home-outline',
    title: 'Blocked Drain',
    category: 'plumbing',
    description: 'Unblock sink, toilet, or drainage issue',
    iconColor: '#1E40AF',
    iconBg: '#DBEAFE',
  },
  {
    id: 'emergency',
    icon: 'alert-circle-outline',
    title: 'Emergency Repair',
    category: 'emergency',
    description: 'Urgent fix needed ASAP',
    iconColor: '#991B1B',
    iconBg: '#FEE2E2',
  },
];

export interface UrgencyOption {
  label: string;
  value: string;
  color: string;
  textColor: string;
}

export const URGENCY_OPTIONS: UrgencyOption[] = [
  { label: 'Today', value: 'today', color: '#FEE2E2', textColor: '#991B1B' },
  {
    label: 'Tomorrow',
    value: 'tomorrow',
    color: '#FEE2E2',
    textColor: me.errFg,
  },
  {
    label: 'This Week',
    value: 'this_week',
    color: me.warnBg,
    textColor: me.accent,
  },
  {
    label: 'Not Urgent',
    value: 'not_urgent',
    color: me.bg2,
    textColor: me.ink2,
  },
];

const VALID_JOB_CATEGORIES = new Set([
  'plumbing',
  'electrical',
  'hvac',
  'general',
  'appliance',
  'landscaping',
  'roofing',
  'painting',
  'carpentry',
  'cleaning',
  'flooring',
  'tiling',
  'plastering',
  'guttering',
  'fencing',
  'damp',
  'pest_control',
  'other',
  'heating',
  'gardening',
  'handyman',
]);

export function normalizeJobCategory(category?: string): string {
  const cleaned = category?.trim().toLowerCase();
  if (!cleaned || cleaned === 'emergency') return 'general';
  return VALID_JOB_CATEGORIES.has(cleaned) ? cleaned : 'other';
}

/**
 * Maps the UI urgency token → canonical job urgency enum.
 * The chips offer 4 tokens (today/tomorrow/this_week/not_urgent),
 * but the API only knows 'high' | 'medium' | 'low'. This is the
 * historical mapping; "not_urgent" falls into 'low'.
 */
export function urgencyToCanonical(urgency: string): 'high' | 'medium' | 'low' {
  if (urgency === 'today') return 'high';
  if (urgency === 'tomorrow') return 'medium';
  return 'low';
}

export interface QuickJobRouteParams {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  category: string;
  urgency: string;
}
