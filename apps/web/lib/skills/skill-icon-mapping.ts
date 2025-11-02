/**
 * Skill Icon Mapping
 * Maps skill names to appropriate icon names from the Icon component
 * Used for displaying skill icons on maps and in the UI
 */

export const SKILL_ICON_MAPPING: Record<string, string> = {
  // General
  'General Contracting': 'briefcase',
  'General Maintenance': 'wrench',
  'Home Inspection': 'clipboardCheck',
  
  // Kitchen & Bathroom
  'Kitchen Remodeling': 'home',
  'Bathroom Renovation': 'home',
  
  // Plumbing & Electrical
  'Plumbing': 'wrench',
  'Electrical Work': 'lightning',
  
  // Construction & Building
  'Carpentry': 'hammer',
  'Tiling': 'grid',
  'Masonry': 'grid',
  'Drywall': 'square',
  'Concrete Work': 'square',
  
  // Finishing
  'Painting': 'paintBrush',
  'Flooring': 'grid',
  'Window Installation': 'window',
  'Door Installation': 'door',
  
  // Exterior
  'Roofing': 'home',
  'Siding': 'home',
  'Gutters': 'home',
  'Deck Building': 'grid',
  'Fence Installation': 'grid',
  
  // Systems
  'HVAC': 'snowflake',
  'Insulation': 'home',
  
  // Landscaping
  'Landscaping': 'tree',
  
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
 */
export const AVAILABLE_SKILL_ICONS = [
  'briefcase',
  'wrench',
  'hammer',
  'paintBrush',
  'lightning',
  'home',
  'tree',
  'grid',
  'square',
  'window',
  'door',
  'snowflake',
  'clipboardCheck',
  'trash',
] as const;

export type SkillIconName = typeof AVAILABLE_SKILL_ICONS[number];

