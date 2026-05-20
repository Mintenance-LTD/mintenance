import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title?: string;
  payment_type?: string;
  category?: string;
}

export const CATEGORY_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  plumbing: { icon: 'water-outline', color: '#3B82F6', label: 'Plumbing' },
  electrical: { icon: 'flash-outline', color: me.accent, label: 'Electrical' },
  roofing: { icon: 'home-outline', color: me.errFg, label: 'Roofing' },
  painting: {
    icon: 'color-palette-outline',
    color: '#8B5CF6',
    label: 'Painting',
  },
  carpentry: { icon: 'hammer-outline', color: '#F97316', label: 'Carpentry' },
  landscaping: { icon: 'leaf-outline', color: me.brand, label: 'Landscaping' },
  cleaning: { icon: 'sparkles-outline', color: '#06B6D4', label: 'Cleaning' },
  hvac: { icon: 'thermometer-outline', color: '#EC4899', label: 'HVAC' },
  general: { icon: 'construct-outline', color: me.ink2, label: 'General' },
};

export const STATUS_COLORS: Record<string, string> = {
  completed: me.brand,
  held: '#3B82F6',
  released: me.brand,
  release_pending: me.accent,
  refunded: me.accent,
  pending: me.ink3,
};

export const fmt = (amount: number) =>
  `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
