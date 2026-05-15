import type { Property } from '@mintenance/types';

export const JOB_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: 'water-outline' as const },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline' as const },
  { id: 'carpentry', label: 'Carpentry', icon: 'hammer-outline' as const },
  { id: 'painting', label: 'Painting', icon: 'color-palette-outline' as const },
  { id: 'roofing', label: 'Roofing', icon: 'home-outline' as const },
  { id: 'landscaping', label: 'Landscaping', icon: 'leaf-outline' as const },
  { id: 'hvac', label: 'HVAC', icon: 'snow-outline' as const },
  {
    id: 'general',
    label: 'General Repair',
    icon: 'construct-outline' as const,
  },
] as const;
import { me } from '../../../design-system/mint-editorial';

export const URGENCY_OPTIONS = [
  { value: 'today', label: 'Today', color: me.errBg, textColor: me.errFg },
  {
    value: 'tomorrow',
    label: 'Tomorrow',
    color: me.errBg,
    textColor: me.errFg,
  },
  {
    value: 'this_week',
    label: 'This Week',
    color: me.warnBg,
    textColor: me.accent,
  },
  {
    value: 'flexible',
    label: 'Flexible',
    color: me.brandSoft,
    textColor: me.brand,
  },
];

export type SearchSegment = 'where' | 'when' | 'what' | null;

export interface QuickJobModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: {
    propertyId: string;
    propertyName: string;
    propertyAddress: string;
    category: string;
    urgency: string;
  }) => void;
}

export type { Property };
