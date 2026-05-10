import {
  Wrench,
  Droplets,
  Zap,
  PaintBucket,
  Home as HomeIcon,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Quick-create templates + budget/urgency option lists.
 * Extracted from `quick-create/page.tsx` on 2026-05-09 for AUDIT_PUNCH_LIST P2 #41.
 */

export interface RepairTemplate {
  id: string;
  icon: LucideIcon;
  title: string;
  category: string;
  description: string;
  budgetRange: string;
  budget: string;
}

export const REPAIR_TEMPLATES: RepairTemplate[] = [
  {
    id: 'leaky-tap',
    icon: Droplets,
    title: 'Leaky Tap/Pipe',
    category: 'plumbing',
    description: 'Fix dripping tap, leaking pipe, or water issue',
    budgetRange: '£50-150',
    budget: '100',
  },
  {
    id: 'electrical-issue',
    icon: Zap,
    title: 'Electrical Issue',
    category: 'electrical',
    description: 'Fix power outlet, switch, or minor electrical problem',
    budgetRange: '£75-200',
    budget: '150',
  },
  {
    id: 'paint-touchup',
    icon: PaintBucket,
    title: 'Painting/Touch-up',
    category: 'painting',
    description: 'Paint room, touch-up walls, or refresh surfaces',
    budgetRange: '£100-300',
    budget: '200',
  },
  {
    id: 'handyman-repair',
    icon: Wrench,
    title: 'General Repair',
    category: 'handyman',
    description: 'Fix door, window, furniture, or general maintenance',
    budgetRange: '£50-200',
    budget: '100',
  },
  {
    id: 'blocked-drain',
    icon: HomeIcon,
    title: 'Blocked Drain',
    category: 'plumbing',
    description: 'Unblock sink, toilet, or drainage issue',
    budgetRange: '£75-150',
    budget: '100',
  },
  {
    id: 'emergency',
    icon: AlertCircle,
    title: 'Emergency Repair',
    category: 'emergency',
    description: 'Urgent fix needed ASAP',
    budgetRange: '£150+',
    budget: '300',
  },
];

export const BUDGET_RANGES = [
  { label: 'Under £100', value: '75' },
  { label: '£100-200', value: '150' },
  { label: '£200-350', value: '275' },
  { label: '£350-500', value: '425' },
];

export const URGENCY_OPTIONS = [
  { label: 'Today', value: 'today', color: 'red' },
  { label: 'Tomorrow', value: 'tomorrow', color: 'orange' },
  { label: 'This Week', value: 'this_week', color: 'yellow' },
  { label: 'Not Urgent', value: 'not_urgent', color: 'gray' },
];
