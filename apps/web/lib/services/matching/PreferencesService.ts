import { supabase } from '@/lib/supabase';
import type { MatchingPreferences } from './types';
import { logger } from '@/lib/logger';

export class PreferencesService {
  /**
   * Update matching preferences for a user
   */
  static async updateMatchingPreferences(preferences: MatchingPreferences): Promise<void> {
    try {
      const { error } = await supabase
        .from('matching_preferences')
        .upsert([{
          user_id: preferences.userId,
          max_matches: preferences.maxMatches,
          prioritize_local: preferences.prioritizeLocal,
          prioritize_budget: preferences.prioritizeBudget,
          prioritize_rating: preferences.prioritizeRating,
          prioritize_speed: preferences.prioritizeSpeed,
          min_rating: preferences.minRating,
          max_distance: preferences.maxDistance,
          preferred_price_range: preferences.preferredPriceRange,
          blacklisted_contractors: preferences.blacklistedContractors,
          favorite_contractors: preferences.favoriteContractors,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update matching preferences', error);
      throw new Error('Failed to save preferences');
    }
  }

  /**
   * Get user's matching preferences
   */
  static async getMatchingPreferences(userId: string): Promise<MatchingPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('matching_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        userId: data.user_id,
        maxMatches: data.max_matches || 10,
        prioritizeLocal: data.prioritize_local || false,
        prioritizeBudget: data.prioritize_budget || false,
        prioritizeRating: data.prioritize_rating || true,
        prioritizeSpeed: data.prioritize_speed || false,
        minRating: data.min_rating || 4.0,
        maxDistance: data.max_distance || 50,
        preferredPriceRange: data.preferred_price_range || 'any',
        blacklistedContractors: data.blacklisted_contractors || [],
        favoriteContractors: data.favorite_contractors || []
      };
    } catch (error) {
      logger.error('Failed to get matching preferences', error);
      return null;
    }
  }
}
