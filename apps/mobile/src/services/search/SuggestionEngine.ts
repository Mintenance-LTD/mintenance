import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performance';
import type { SearchSuggestion, FilterPreset } from '../../types/search';
import { DEFAULT_FILTER_PRESETS } from '../../types/search';

export function getFilterPresets(): FilterPreset[] {
  return DEFAULT_FILTER_PRESETS.sort((a, b) => b.popularity - a.popularity);
}

export async function getSearchSuggestions(
  input: string,
  type: 'contractors' | 'jobs' = 'contractors',
  limit: number = 5
): Promise<SearchSuggestion[]> {
  const startTimer = performanceMonitor.startTimer('search_suggestions');

  try {
    if (input.length < 2) {
      startTimer();
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    const skillSuggestions = await getSkillSuggestions(input, limit);
    suggestions.push(...skillSuggestions);

    const locationSuggestions = await getLocationSuggestions(input, limit);
    suggestions.push(...locationSuggestions);

    const projectSuggestions = await getProjectTypeSuggestions(input, limit);
    suggestions.push(...projectSuggestions);

    const result = suggestions
      .sort((a, b) => (b.metadata?.count || 0) - (a.metadata?.count || 0))
      .slice(0, limit);

    startTimer();
    return result;
  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    startTimer();
    return [];
  }
}

async function getSkillSuggestions(input: string, limit: number): Promise<SearchSuggestion[]> {
  const skills = [
    'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting',
    'Flooring', 'Kitchen Renovation', 'Bathroom Renovation',
  ];
  return skills
    .filter((skill) => skill.toLowerCase().includes(input.toLowerCase()))
    .slice(0, limit)
    .map((skill) => ({
      text: skill,
      type: 'skill',
      icon: 'build',
      metadata: { count: Math.floor(Math.random() * 100) },
    }));
}

async function getLocationSuggestions(_input: string, _limit: number): Promise<SearchSuggestion[]> {
  return [];
}

async function getProjectTypeSuggestions(input: string, limit: number): Promise<SearchSuggestion[]> {
  const types = ['emergency', 'maintenance', 'installation', 'repair', 'renovation'];
  return types
    .filter((type) => type.toLowerCase().includes(input.toLowerCase()))
    .slice(0, limit)
    .map((type) => ({
      text: type,
      type: 'project',
      icon: 'construct',
      metadata: { count: Math.floor(Math.random() * 50) },
    }));
}
