/**
 * Pure helper for suggesting job categories from visual analysis signals.
 */

/**
 * Suggest job categories based on visual analysis
 */
export function suggestCategoriesFromImages(
  labels: Array<{ description: string; score: number }>,
  objects: Array<{ name: string; score: number }>,
  text: string[]
): Array<{ category: string; confidence: number; reason: string }> {
  const allTerms = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase()),
    ...text.map(t => t.toLowerCase()),
  ].join(' ');

  const categoryMappings: Record<string, { keywords: string[]; weight: number }> = {
    plumbing: {
      keywords: ['pipe', 'faucet', 'sink', 'toilet', 'bathroom', 'water', 'leak', 'drain', 'plumber'],
      weight: 1.0,
    },
    electrical: {
      keywords: ['outlet', 'switch', 'light', 'wiring', 'electrical', 'circuit', 'breaker', 'socket'],
      weight: 1.0,
    },
    roofing: {
      keywords: ['roof', 'gutter', 'shingle', 'tile', 'chimney', 'eaves', 'flashing'],
      weight: 1.0,
    },
    painting: {
      keywords: ['wall', 'paint', 'ceiling', 'brush', 'roller', 'decorating'],
      weight: 0.8,
    },
    carpentry: {
      keywords: ['door', 'window', 'cabinet', 'shelf', 'wood', 'frame', 'furniture'],
      weight: 0.9,
    },
    hvac: {
      keywords: ['heating', 'cooling', 'ventilation', 'air conditioning', 'thermostat', 'boiler'],
      weight: 1.0,
    },
    flooring: {
      keywords: ['floor', 'carpet', 'tile', 'laminate', 'wooden floor'],
      weight: 0.9,
    },
    cleaning: {
      keywords: ['clean', 'window', 'carpet', 'vacuum', 'dust'],
      weight: 0.7,
    },
    gardening: {
      keywords: ['garden', 'lawn', 'tree', 'plant', 'hedge', 'fence', 'landscaping'],
      weight: 0.8,
    },
  };

  const categoryScores: Record<string, { score: number; matchedKeywords: string[] }> = {};

  Object.entries(categoryMappings).forEach(([category, config]) => {
    const matchedKeywords = config.keywords.filter(keyword => allTerms.includes(keyword));
    if (matchedKeywords.length > 0) {
      categoryScores[category] = {
        score: matchedKeywords.length * config.weight,
        matchedKeywords,
      };
    }
  });

  // Sort by score and return top categories
  return Object.entries(categoryScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([category, data]) => ({
      category,
      confidence: Math.min(95, Math.round((data.score / 5) * 100)), // Normalize to 0-95%
      reason: `Detected ${data.matchedKeywords.slice(0, 3).join(', ')}`,
    }));
}
