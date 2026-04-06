/**
 * Pure helpers for extracting semantic features from Google Vision results.
 */

/**
 * Extract maintenance-related features from analysis results
 */
export function extractMaintenanceFeatures(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>,
  text: string[]
): string[] {
  const features: string[] = [];
  const allTerms = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase()),
    ...text.map(t => t.toLowerCase()),
  ].join(' ');

  // Damage indicators
  const damageKeywords = [
    'broken', 'cracked', 'damaged', 'leak', 'leaking', 'rust', 'rusty',
    'stain', 'stained', 'mold', 'mildew', 'water damage', 'hole', 'holes',
    'worn', 'faded', 'peeling', 'chipped', 'missing', 'loose',
  ];

  damageKeywords.forEach(keyword => {
    if (allTerms.includes(keyword)) {
      features.push(keyword);
    }
  });

  // Property features
  const propertyFeatures = [
    'window', 'door', 'roof', 'wall', 'floor', 'ceiling', 'pipe', 'pipe',
    'faucet', 'sink', 'toilet', 'bathroom', 'kitchen', 'electrical outlet',
    'light fixture', 'heating', 'cooling', 'ventilation',
  ];

  propertyFeatures.forEach(feature => {
    if (allTerms.includes(feature)) {
      features.push(feature);
    }
  });

  return Array.from(new Set(features)).slice(0, 15); // Limit to 15 features
}

/**
 * Detect property type from images
 */
export function detectPropertyType(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>
): string | undefined {
  const allTerms = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase()),
  ].join(' ');

  if (allTerms.includes('apartment') || allTerms.includes('flat')) {
    return 'apartment';
  }
  if (allTerms.includes('house') || allTerms.includes('home')) {
    return 'house';
  }
  if (allTerms.includes('commercial') || allTerms.includes('office')) {
    return 'commercial';
  }

  return undefined;
}

/**
 * Assess property condition from visual evidence
 */
export function assessCondition(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>,
  text: string[]
): 'excellent' | 'good' | 'fair' | 'poor' {
  const allTerms = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase()),
    ...text.map(t => t.toLowerCase()),
  ].join(' ');

  const poorIndicators = ['broken', 'damaged', 'cracked', 'rust', 'mold', 'water damage', 'hole'];
  const fairIndicators = ['worn', 'faded', 'stain', 'old', 'dated'];
  const goodIndicators = ['clean', 'well-maintained', 'modern', 'new'];

  const poorCount = poorIndicators.filter(indicator => allTerms.includes(indicator)).length;
  const fairCount = fairIndicators.filter(indicator => allTerms.includes(indicator)).length;
  const goodCount = goodIndicators.filter(indicator => allTerms.includes(indicator)).length;

  if (poorCount >= 3) return 'poor';
  if (poorCount >= 1 || fairCount >= 2) return 'fair';
  if (goodCount >= 2) return 'good';
  return 'excellent';
}

/**
 * Assess job complexity from visual evidence
 */
export function assessComplexity(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>,
  text: string[]
): 'simple' | 'moderate' | 'complex' {
  const allTerms = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase()),
    ...text.map(t => t.toLowerCase()),
  ].join(' ');

  const complexIndicators = [
    'multiple', 'extensive', 'major', 'renovation', 'installation',
    'replacement', 'structural', 'electrical system', 'plumbing system',
  ];
  const simpleIndicators = ['simple', 'quick', 'minor', 'small', 'single'];

  const complexCount = complexIndicators.filter(indicator => allTerms.includes(indicator)).length;
  const simpleCount = simpleIndicators.filter(indicator => allTerms.includes(indicator)).length;

  if (complexCount >= 2) return 'complex';
  if (simpleCount >= 2) return 'simple';
  return 'moderate';
}
