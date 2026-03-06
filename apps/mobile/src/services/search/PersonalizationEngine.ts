import { supabase } from '../../config/supabase';
import { handleDatabaseOperation, validateRequired } from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import type { SearchPersonalization, LocationRadius } from '../../types/search';
import type { DatabaseUserSearchPreferenceRow } from './types';

export async function saveSearchPersonalization(
  userId: string,
  personalization: Partial<SearchPersonalization>
): Promise<void> {
  const startTimer = performanceMonitor.startTimer('save_search_personalization');

  try {
    const context = {
      service: 'AdvancedSearchService', method: 'saveSearchPersonalization',
      params: { userId, personalization },
    };
    validateRequired(userId, 'userId', context);

    await handleDatabaseOperation(async () => {
      const result = await supabase
        .from('user_search_preferences')
        .upsert({
          user_id: userId,
          preferred_skills: personalization.preferredSkills || [],
          preferred_price_range: personalization.preferredPriceRange || null,
          preferred_location: personalization.preferredLocation || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      return result;
    }, context);

    startTimer();
  } catch (error) {
    startTimer();
    throw error;
  }
}

export async function getSearchPersonalization(userId: string): Promise<SearchPersonalization | null> {
  const startTimer = performanceMonitor.startTimer('get_search_personalization');

  try {
    const context = {
      service: 'AdvancedSearchService', method: 'getSearchPersonalization',
      params: { userId },
    };
    validateRequired(userId, 'userId', context);

    const result = await handleDatabaseOperation(async () => {
      const queryResult = await supabase
        .from('user_search_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (queryResult.error || !queryResult.data) {
        return { data: null, error: null };
      }

      const data = queryResult.data as DatabaseUserSearchPreferenceRow;

      const defaultLocation: LocationRadius = { radius: 25, unit: 'miles', coordinates: null };
      const preferredLocation: LocationRadius = data.preferred_location
        ? {
            ...data.preferred_location,
            unit: (data.preferred_location.unit === 'kilometers' ? 'kilometers' : 'miles') as 'miles' | 'kilometers',
          }
        : defaultLocation;

      const personalization: SearchPersonalization = {
        userId,
        preferredSkills: data.preferred_skills || [],
        preferredPriceRange: data.preferred_price_range || { min: 0, max: 1000, hourly: true },
        preferredLocation,
        searchHistory: [],
        bookmarkedContractors: [],
        contactedContractors: [],
      };

      return { data: personalization, error: null };
    }, context);

    startTimer();
    return result;
  } catch (error) {
    startTimer();
    throw error;
  }
}
