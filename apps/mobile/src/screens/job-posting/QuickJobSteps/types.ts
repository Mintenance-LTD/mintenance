import type { Property } from '@mintenance/types'

export const JOB_CATEGORIES = [
  { id: 'plumbing', label: 'Plumbing', icon: 'water-outline'  as const },
  { id: 'electrical', label: 'Electrical', icon: 'flash-outline'  as const },
  { id: 'carpentry', label: 'Carpentry', icon: 'hammer-outline'  as const },
  { id: 'painting', label: 'Painting', icon: 'color-palette-outline'  as const },
  { id: 'roofing', label: 'Roofing', icon: 'home-outline'  as const },
  { id: 'landscaping', label: 'Landscaping', icon: 'leaf-outline'  as const },
  { id: 'hvac', label: 'HVAC', icon: 'snow-outline'  as const },
  { id: 'general', label: 'General Repair', icon: 'construct-outline'  as const },
] as const;

export const URGENCY_OPTIONS = [
  { value: 'today', label: 'Today', color: '#FEE2E2', textColor: '#991B1B' },
  { value: 'tomorrow', label: 'Tomorrow', color: '#FEE2E2', textColor: '#EF4444' },
  { value: 'this_week', label: 'This Week', color: '#FEF3C7', textColor: '#F59E0B' },
  { value: 'flexible', label: 'Flexible', color: '#D1FAE5', textColor: '#10B981' },
];

export type SearchSegment = 'where' | 'when' | 'what' | null

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
