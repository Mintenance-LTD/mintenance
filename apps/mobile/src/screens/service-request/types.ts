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
    color: '#FF9500',
    subcategories: ['Wiring', 'Outlet Installation', 'Lighting', 'Panel Upgrade', 'Emergency'],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'thermometer-outline',
    color: '#4CD964',
    subcategories: ['AC Repair', 'Heating', 'Installation', 'Maintenance', 'Duct Cleaning'],
  },
  {
    id: 'general',
    name: 'General Maintenance',
    icon: 'hammer-outline',
    color: '#5856D6',
    subcategories: ['Painting', 'Carpentry', 'Tiling', 'Flooring', 'General Repairs'],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: 'home-outline',
    color: '#FF3B30',
    subcategories: ['Washing Machine', 'Refrigerator', 'Dishwasher', 'Oven', 'Other'],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'leaf-outline',
    color: '#34C759',
    subcategories: ['Lawn Care', 'Tree Service', 'Garden Design', 'Irrigation', 'Cleanup'],
  },
];

export const priorityLevels = [
  { id: 'low' as const, name: 'Low', color: '#34C759', description: 'Can wait a few days' },
  { id: 'medium' as const, name: 'Medium', color: '#FF9500', description: 'Should be done this week' },
  { id: 'high' as const, name: 'High', color: '#FF3B30', description: 'Urgent - needs attention ASAP' },
];
