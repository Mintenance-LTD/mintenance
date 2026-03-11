import { theme } from '../../theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const serviceCategories: ServiceCategory[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'water-outline',
    color: theme.colors.primary,
    subcategories: ['Leaking', 'Blocked Drain', 'Installation', 'Repair', 'Emergency'],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'flash-outline',
    color: theme.colors.warning,
    subcategories: ['Wiring', 'Outlet Installation', 'Lighting', 'Panel Upgrade', 'Emergency'],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'thermometer-outline',
    color: theme.colors.success,
    subcategories: ['AC Repair', 'Heating', 'Installation', 'Maintenance', 'Duct Cleaning'],
  },
  {
    id: 'general',
    name: 'General Maintenance',
    icon: 'hammer-outline',
    color: theme.colors.info,
    subcategories: ['Painting', 'Carpentry', 'Tiling', 'Flooring', 'General Repairs'],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: 'home-outline',
    color: theme.colors.error,
    subcategories: ['Washing Machine', 'Refrigerator', 'Dishwasher', 'Oven', 'Other'],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'leaf-outline',
    color: theme.colors.success,
    subcategories: ['Lawn Care', 'Tree Service', 'Garden Design', 'Irrigation', 'Cleanup'],
  },
];

export const priorityLevels = [
  { id: 'low' as const, name: 'Low', color: theme.colors.success, description: 'Can wait a few days' },
  { id: 'medium' as const, name: 'Medium', color: theme.colors.warning, description: 'Should be done this week' },
  { id: 'high' as const, name: 'High', color: theme.colors.error, description: 'Urgent - needs attention ASAP' },
];
