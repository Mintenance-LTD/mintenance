import { logger } from '@mintenance/shared';

/**
 * Search Ranking Service - Advanced ranking and re-scoring of search results
 */
interface SearchResult {
  id: string;
  type: 'job' | 'contractor' | 'property';
  title: string;
  description: string;
  relevanceScore: number;
  metadata: {
    location?: string;
    category?: string;
    price?: number;
    availability?: string;
    rating?: number;
    createdAt?: string;
    viewCount?: number;
    clickCount?: number;
    [key: string]: unknown;
  };
  highlights?: string[];
}
interface RankingOptions {
  userPreferences?: {
    preferredCategories?: string[];
    preferredLocations?: string[];
    priceRange?: { min?: number; max?: number };
  };
  boostRecent?: boolean;
  diversify?: boolean;
  personalizeResults?: boolean;
}
export class SearchRankingService {
  private supabase: any;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Rank and re-score search results
   */
  async rankResults(
    results: SearchResult[],
    query: string,
    options: RankingOptions = {}
  ): Promise<SearchResult[]> {
    if (results.length === 0) return [];
    let rankedResults = [...results];
    // Apply various ranking factors
    rankedResults = this.applyRelevanceBoost(rankedResults, query);
    if (options.userPreferences) {
      rankedResults = this.applyPersonalization(rankedResults, options.userPreferences);
    }
    if (options.boostRecent) {
      rankedResults = this.applyRecencyBoost(rankedResults);
    }
    rankedResults = await this.applyPopularityBoost(rankedResults);
    rankedResults = await this.applyClickThroughRateBoost(rankedResults, query);
    if (options.diversify) {
      rankedResults = this.diversifyResults(rankedResults);
    }
    // Final sorting by composite score
    return rankedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  /**
   * Update relevance score based on user feedback
   */
  async updateRelevanceScore(
    query: string,
    resultId: string,
    position: number,
    clicked: boolean
  ): Promise<void> {
    try {
      // Calculate score adjustment based on position and action
      const scoreAdjustment = this.calculateScoreAdjustment(position, clicked);
      // Store feedback for future ranking
      await this.supabase
        .from('search_relevance_feedback')
        .insert({
          query: query.toLowerCase(),
          result_id: resultId,
          position,
          clicked,
          score_adjustment: scoreAdjustment,
          created_at: new Date().toISOString()
        });
      // Update global relevance scores
      await this.updateGlobalRelevanceScore(resultId, scoreAdjustment);
    } catch (error) {
      logger.error('Error updating relevance score:', error);
    }
  }
  /**
   * Get personalized ranking factors for a user
   */
  async getUserRankingFactors(userId: string): Promise<any> {
    try {
      const { data } = await this.supabase
        .from('user_ranking_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      return data || this.getDefaultRankingFactors();
    } catch (error) {
      logger.error('Error getting user ranking factors:', error);
      return this.getDefaultRankingFactors();
    }
  }
  /**
   * Calculate diversity score for result set
   */
  calculateDiversityScore(results: SearchResult[]): number {
    if (results.length <= 1) return 1;
    const categories = new Set(results.map(r => r.metadata.category).filter(Boolean));
    const types = new Set(results.map(r => r.type));
    const locations = new Set(results.map(r => r.metadata.location).filter(Boolean));
    const categoryDiversity = categories.size / Math.max(results.length * 0.3, 1);
    const typeDiversity = types.size / 3; // Max 3 types
    const locationDiversity = locations.size / Math.max(results.length * 0.5, 1);
    return Math.min((categoryDiversity + typeDiversity + locationDiversity) / 3, 1);
  }
  // ============= Private Helper Methods =============
  private applyRelevanceBoost(results: SearchResult[], query: string): SearchResult[] {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    return results.map(result => {
      let boost = 0;
      // Title exact match
      if (result.title.toLowerCase() === query.toLowerCase()) {
        boost += 0.5;
      }
      // Title contains all query words
      const titleLower = result.title.toLowerCase();
      if (queryWords.every(word => titleLower.includes(word))) {
        boost += 0.3;
      }
      // Description relevance
      const descLower = result.description.toLowerCase();
      const descWordMatches = queryWords.filter(word => descLower.includes(word)).length;
      boost += (descWordMatches / queryWords.length) * 0.2;
      // Category match
      if (result.metadata.category && query.toLowerCase().includes(result.metadata.category.toLowerCase())) {
        boost += 0.1;
      }
      return {
        ...result,
        relevanceScore: Math.min(result.relevanceScore + boost, 1)
      };
    });
  }
  private applyPersonalization(
    results: SearchResult[],
    preferences: NonNullable<RankingOptions['userPreferences']>
  ): SearchResult[] {
    return results.map(result => {
      let boost = 0;
      // Preferred categories
      if (preferences.preferredCategories && result.metadata.category) {
        if (preferences.preferredCategories.includes(result.metadata.category)) {
          boost += 0.15;
        }
      }
      // Preferred locations
      if (preferences.preferredLocations && result.metadata.location) {
        const locationMatch = preferences.preferredLocations.some(loc =>
          result.metadata.location?.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) {
          boost += 0.1;
        }
      }
      // Price range preference
      if (preferences.priceRange && result.metadata.price) {
        const { min, max } = preferences.priceRange;
        const price = result.metadata.price;
        if ((min === undefined || price >= min) && (max === undefined || price <= max)) {
          boost += 0.05;
        }
      }
      return {
        ...result,
        relevanceScore: Math.min(result.relevanceScore + boost, 1)
      };
    });
  }
  private applyRecencyBoost(results: SearchResult[]): SearchResult[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return results.map(result => {
      if (!result.metadata.createdAt) return result;
      const age = now - new Date(result.metadata.createdAt).getTime();
      const daysOld = age / dayMs;
      let boost = 0;
      if (daysOld < 1) boost = 0.15; // Less than 1 day
      else if (daysOld < 7) boost = 0.1; // Less than 1 week
      else if (daysOld < 30) boost = 0.05; // Less than 1 month
      return {
        ...result,
        relevanceScore: Math.min(result.relevanceScore + boost, 1)
      };
    });
  }
  private async applyPopularityBoost(results: SearchResult[]): Promise<SearchResult[]> {
    // Get popularity metrics for all results
    const ids = results.map(r => r.id);
    try {
      const { data: metrics } = await this.supabase
        .from('item_popularity_metrics')
        .select('item_id, view_count, click_count, conversion_rate')
        .in('item_id', ids);
      const metricsMap = new Map(metrics?.map((m: any) => [m.item_id, m]) || []);
      return results.map(result => {
        const popularity = metricsMap.get(result.id) as any;
        if (!popularity) return result;
        // Calculate popularity boost
        const viewBoost = Math.min(popularity.view_count / 1000, 0.05);
        const clickBoost = Math.min(popularity.click_count / 100, 0.05);
        const conversionBoost = popularity.conversion_rate * 0.1;
        const totalBoost = viewBoost + clickBoost + conversionBoost;
        return {
          ...result,
          relevanceScore: Math.min(result.relevanceScore + totalBoost, 1)
        };
      });
    } catch (error) {
      logger.error('Error applying popularity boost:', error);
      return results;
    }
  }
  private async applyClickThroughRateBoost(
    results: SearchResult[],
    query: string
  ): Promise<SearchResult[]> {
    try {
      // Get historical CTR data for this query
      const { data: ctrData } = await this.supabase
        .from('search_ctr_metrics')
        .select('result_id, ctr')
        .eq('query', query.toLowerCase())
        .in('result_id', results.map(r => r.id));
      const ctrMap = new Map(ctrData?.map((d: any) => [d.result_id, d.ctr]) || []);
      return results.map(result => {
        const ctr = (ctrMap.get(result.id) as number) || 0;
        const ctrBoost = ctr * 0.2; // Max 20% boost for 100% CTR
        return {
          ...result,
          relevanceScore: Math.min(result.relevanceScore + ctrBoost, 1)
        };
      });
    } catch (error) {
      logger.error('Error applying CTR boost:', error);
      return results;
    }
  }
  private diversifyResults(results: SearchResult[]): SearchResult[] {
    if (results.length <= 3) return results;
    const diversified: SearchResult[] = [];
    const remaining = [...results];
    const seenCategories = new Set<string>();
    const seenTypes = new Set<string>();
    // First pass: ensure diversity in top results
    while (diversified.length < Math.min(5, results.length) && remaining.length > 0) {
      // Find best result that adds diversity
      let bestIndex = 0;
      let bestDiversityScore = -1;
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        let diversityScore = candidate.relevanceScore;
        // Penalize if same category already seen
        if (candidate.metadata.category && seenCategories.has(candidate.metadata.category)) {
          diversityScore *= 0.7;
        }
        // Penalize if same type already seen multiple times
        const typeCount = diversified.filter(d => d.type === candidate.type).length;
        if (typeCount > 0) {
          diversityScore *= Math.pow(0.8, typeCount);
        }
        if (diversityScore > bestDiversityScore) {
          bestDiversityScore = diversityScore;
          bestIndex = i;
        }
      }
      const selected = remaining.splice(bestIndex, 1)[0];
      diversified.push(selected);
      if (selected.metadata.category) {
        seenCategories.add(selected.metadata.category);
      }
      seenTypes.add(selected.type);
    }
    // Add remaining results
    diversified.push(...remaining);
    return diversified;
  }
  private calculateScoreAdjustment(position: number, clicked: boolean): number {
    // Higher positions get smaller adjustments
    const positionFactor = 1 / (1 + position * 0.1);
    if (clicked) {
      // Positive adjustment for clicks
      return 0.1 * positionFactor;
    } else {
      // Small negative adjustment for impressions without clicks
      return -0.01 * positionFactor;
    }
  }
  private async updateGlobalRelevanceScore(
    resultId: string,
    adjustment: number
  ): Promise<void> {
    try {
      // Update or create global relevance score
      const { data: existing } = await this.supabase
        .from('global_relevance_scores')
        .select('score')
        .eq('item_id', resultId)
        .single();
      if (existing) {
        const newScore = Math.max(0, Math.min(1, existing.score + adjustment));
        await this.supabase
          .from('global_relevance_scores')
          .update({ score: newScore, updated_at: new Date().toISOString() })
          .eq('item_id', resultId);
      } else {
        await this.supabase
          .from('global_relevance_scores')
          .insert({
            item_id: resultId,
            score: 0.5 + adjustment,
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      logger.error('Error updating global relevance score:', error);
    }
  }
  private getDefaultRankingFactors(): any {
    return {
      relevanceWeight: 0.4,
      recencyWeight: 0.2,
      popularityWeight: 0.2,
      personalizationWeight: 0.2
    };
  }
}