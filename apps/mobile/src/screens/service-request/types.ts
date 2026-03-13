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
    color: '#10B981',
    subcategories: ['Leaking', 'Blocked Drain', 'Installation', 'Repair', 'Emergency'],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'flash-outline',
    color: '#F59E0B',
    subcategories: ['Wiring', 'Outlet Installation', 'Lighting', 'Panel Upgrade', 'Emergency'],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'thermometer-outline',
    color: '#10B981',
    subcategories: ['AC Repair', 'Heating', 'Installation', 'Maintenance', 'Duct Cleaning'],
  },
  {
    id: 'general',
    name: 'General Maintenance',
    icon: 'hammer-outline',
    color: '#3B82F6',
    subcategories: ['Painting', 'Carpentry', 'Tiling', 'Flooring', 'General Repairs'],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: 'home-outline',
    color: '#EF4444',
    subcategories: ['Washing Machine', 'Refrigerator', 'Dishwasher', 'Oven', 'Other'],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'leaf-outline',
    color: '#10B981',
    subcategories: ['Lawn Care', 'Tree Service', 'Garden Design', 'Irrigation', 'Cleanup'],
  },
];

export const priorityLevels = [
  { id: 'low' as const, name: 'Low', color: '#10B981', description: 'Can wait a few days' },
  { id: 'medium' as const, name: 'Medium', color: '#F59E0B', description: 'Should be done this week' },
  { id: 'high' as const, name: 'High', color: '#EF4444', description: 'Urgent - needs attention ASAP' },
];
