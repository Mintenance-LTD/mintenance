/**
 * Skill Icon Mapping
 * Maps skill names to appropriate icon names from the Icon component
 * Used for displaying skill icons on maps and in the UI
 */

export const SKILL_ICON_MAPPING: Record<string, string> = {
  // General
  'General Contracting': 'briefcase',
  'General Maintenance': 'briefcase',
  'Home Inspection': 'clipboard',
  
  // Kitchen & Bathroom
  'Kitchen Remodeling': 'home',
  'Bathroom Renovation': 'home',
  
  // Plumbing & Electrical
  'Plumbing': 'briefcase',
  'Electrical Work': 'lightBulb',
  
  // Construction & Building
  'Carpentry': 'briefcase',
  'Tiling': 'collection',
  'Masonry': 'collection',
  'Drywall': 'document',
  'Concrete Work': 'document',
  
  // Finishing
  'Painting': 'edit',
  'Flooring': 'collection',
  'Window Installation': 'building',
  'Door Installation': 'building',
  
  // Exterior
  'Roofing': 'home',
  'Siding': 'home',
  'Gutters': 'home',
  'Deck Building': 'collection',
  'Fence Installation': 'collection',
  
  // Systems
  'HVAC': 'activity',
  'Insulation': 'home',
  
  // Landscaping
  'Landscaping': 'home',
  
  // Demolition
  'Demolition': 'trash',
};

/**
 * Get icon for a skill name
 * Returns a default icon if no mapping exists
 */
export function getSkillIcon(skillName: string): string {
  return SKILL_ICON_MAPPING[skillName] || 'briefcase';
}

/**
 * Get all available icons for skill selection
 * Using only icons that exist in the Icon component
 */
export const AVAILABLE_SKILL_ICONS = [
  'briefcase',
  'home',
  'building',
  'collection',
  'document',
  'edit',
  'lightBulb',
  'activity',
  'clipboard',
  'trash',
] as const;

export type SkillIconName = typeof AVAILABLE_SKILL_ICONS[number];

