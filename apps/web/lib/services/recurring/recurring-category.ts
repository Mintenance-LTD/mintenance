export const recurringTaskCategories: Record<string, string> = {
  'Gas Safety Check': 'heating',
  'EICR Inspection': 'electrical',
  'Boiler Service': 'heating',
  'Gutter Cleaning': 'roofing',
  'Fire Alarm Test': 'electrical',
  'Legionella Assessment': 'plumbing',
  'Garden Maintenance': 'gardening',
  'Chimney Sweep': 'cleaning',
  'Pest Inspection': 'pest_control',
  'General Inspection': 'handyman',
};
export function recurringCategory(
  category?: string | null,
  taskType?: string | null
) {
  const normalized = category?.trim().toLowerCase().replace(/[ -]+/g, '_');
  return normalized && normalized !== 'general'
    ? normalized
    : (recurringTaskCategories[taskType ?? ''] ?? 'handyman');
}
const aliases: Record<string, string[]> = {
  gardening: ['gardening', 'garden', 'landscaping', 'gardener'],
  heating: ['heating', 'gas', 'boiler'],
  electrical: ['electrical', 'electrician'],
  plumbing: ['plumbing', 'plumber'],
  roofing: ['roofing', 'roofer', 'gutter'],
  painting: ['painting', 'decorating', 'painter'],
  carpentry: ['carpentry', 'carpenter', 'joinery'],
  cleaning: ['cleaning', 'cleaner', 'chimney'],
  handyman: ['handyman', 'general maintenance'],
  pest_control: ['pest control'],
  other: ['handyman', 'general maintenance'],
};
export function matchesRecurringTrade(category: string, skill: string) {
  const normalized = ` ${skill
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
  return (aliases[category] ?? [category.replace(/_/g, ' ')]).some((alias) =>
    normalized.includes(` ${alias} `)
  );
}
