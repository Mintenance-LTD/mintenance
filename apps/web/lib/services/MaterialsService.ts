import { createClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import type {
  Material,
  MaterialCategory,
  MaterialQueryFilters,
  MaterialsListResponse,
  CreateMaterialInput,
  UpdateMaterialInput,
} from '@mintenance/shared';
import {
  calculateMaterialCost,
  getEffectiveUnitPrice,
} from '@mintenance/shared';

/**
 * MaterialsService - Service layer for materials database operations
 *
 * Provides methods for:
 * - Searching materials with fuzzy matching
 * - Querying by category and filters
 * - Calculating material costs with bulk pricing
 * - Finding similar materials for detected names
 */
export class MaterialsService {
  private supabase;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Search materials by name with fuzzy matching using trigram similarity
   * @param query Search query string
   * @param options Search options
   * @returns Array of materials with similarity scores
   */
  async searchMaterials(
    query: string,
    options: {
      category?: MaterialCategory;
      in_stock?: boolean;
      limit?: number;
      min_similarity?: number;
    } = {}
  ): Promise<Array<Material & { similarity?: number }>> {
    const {
      category,
      in_stock = true,
      limit = 20,
      min_similarity = 0.3,
    } = options;

    let queryBuilder = this.supabase
      .from('materials')
      .select('*');

    // Apply filters
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }
    if (in_stock !== undefined) {
      queryBuilder = queryBuilder.eq('in_stock', in_stock);
    }

    // Use ILIKE for simple substring matching (trigram similarity requires raw SQL)
    // For better fuzzy matching, we use ILIKE with wildcards
    queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    queryBuilder = queryBuilder.limit(limit);
    queryBuilder = queryBuilder.order('unit_price', { ascending: true });

    const { data, error } = await queryBuilder;

    if (error) {
      logger.error('MaterialsService.searchMaterials error', error);
      throw new Error(`Failed to search materials: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Find materials similar to a detected material name using fuzzy matching
   * Returns top matches with similarity scores
   */
  async findSimilarMaterials(
    materialName: string,
    options: {
      category?: MaterialCategory;
      limit?: number;
    } = {}
  ): Promise<Array<Material & { similarity: number; rank: number }>> {
    const { category, limit = 5 } = options;

    // Use searchMaterials as a base, then calculate simple similarity scores
    const results = await this.searchMaterials(materialName, {
      category,
      limit: limit * 2, // Get more results to score
    });

    // Calculate simple similarity score based on substring matching
    const scoredResults = results.map((material, index) => {
      const nameLower = material.name.toLowerCase();
      const queryLower = materialName.toLowerCase();

      // Exact match = 1.0
      if (nameLower === queryLower) {
        return { ...material, similarity: 1.0, rank: 1 };
      }

      // Calculate similarity based on:
      // 1. Contains full query string
      // 2. Word overlap
      // 3. Length similarity
      let score = 0;

      if (nameLower.includes(queryLower)) {
        score += 0.6;
      }

      const queryWords = queryLower.split(/\s+/);
      const nameWords = nameLower.split(/\s+/);
      const wordOverlap = queryWords.filter(word =>
        nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
      ).length;
      score += (wordOverlap / queryWords.length) * 0.3;

      const lengthSimilarity = 1 - Math.abs(nameLower.length - queryLower.length) / Math.max(nameLower.length, queryLower.length);
      score += lengthSimilarity * 0.1;

      return { ...material, similarity: Math.min(score, 1.0), rank: index + 1 };
    });

    // Sort by similarity descending
    scoredResults.sort((a, b) => b.similarity - a.similarity);

    // Return top N results
    return scoredResults.slice(0, limit);
  }

  /**
   * Get materials by category with optional filters
   */
  async getMaterialsByCategory(
    category: MaterialCategory,
    filters: Omit<MaterialQueryFilters, 'category'> = {}
  ): Promise<MaterialsListResponse> {
    const {
      in_stock,
      supplier_id,
      search,
      min_price,
      max_price,
      limit = 50,
      offset = 0,
      sort_by = 'name',
      sort_order = 'asc',
    } = filters;

    let queryBuilder = this.supabase
      .from('materials')
      .select('*', { count: 'exact' });

    queryBuilder = queryBuilder.eq('category', category);

    if (in_stock !== undefined) {
      queryBuilder = queryBuilder.eq('in_stock', in_stock);
    }

    if (supplier_id) {
      queryBuilder = queryBuilder.eq('supplier_id', supplier_id);
    }

    if (search) {
      queryBuilder = queryBuilder.ilike('name', `%${search}%`);
    }

    if (min_price !== undefined) {
      queryBuilder = queryBuilder.gte('unit_price', min_price);
    }

    if (max_price !== undefined) {
      queryBuilder = queryBuilder.lte('unit_price', max_price);
    }

    queryBuilder = queryBuilder
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      logger.error('MaterialsService.getMaterialsByCategory error', error);
      throw new Error(`Failed to get materials by category: ${error.message}`);
    }

    return {
      materials: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }

  /**
   * Get a single material by ID
   */
  async getMaterialById(id: string): Promise<Material | null> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      logger.error('MaterialsService.getMaterialById error', error);
      throw new Error(`Failed to get material by ID: ${error.message}`);
    }

    return data;
  }

  /**
   * Get multiple materials by IDs
   */
  async getMaterialsByIds(ids: string[]): Promise<Material[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('materials')
      .select('*')
      .in('id', ids);

    if (error) {
      logger.error('MaterialsService.getMaterialsByIds error', error);
      throw new Error(`Failed to get materials by IDs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate total cost for a material with quantity
   * Takes bulk pricing into account
   */
  calculateCost(material: Material, quantity: number): {
    unit_price: number;
    effective_unit_price: number;
    total_cost: number;
    bulk_discount_applied: boolean;
  } {
    const effective_unit_price = getEffectiveUnitPrice(material, quantity);
    const total_cost = calculateMaterialCost(material, quantity);
    const bulk_discount_applied = !!(
      material.bulk_quantity &&
      material.bulk_unit_price &&
      quantity >= material.bulk_quantity
    );

    return {
      unit_price: material.unit_price,
      effective_unit_price,
      total_cost,
      bulk_discount_applied,
    };
  }

  /**
   * Get all unique categories from materials table
   */
  async getCategories(): Promise<MaterialCategory[]> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('category')
      .order('category');

    if (error) {
      logger.error('MaterialsService.getCategories error', error);
      throw new Error(`Failed to get categories: ${error.message}`);
    }

    // Get unique categories
    const uniqueCategories = [...new Set(data?.map(d => d.category) || [])];
    return uniqueCategories as MaterialCategory[];
  }

  /**
   * Get count of materials by category
   */
  async getCategoryCounts(): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('category');

    if (error) {
      logger.error('MaterialsService.getCategoryCounts error', error);
      throw new Error(`Failed to get category counts: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    data?.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    return counts;
  }

  /**
   * Get materials by multiple categories (useful for job analysis)
   */
  async getMaterialsByCategories(
    categories: MaterialCategory[],
    limit = 100
  ): Promise<Material[]> {
    if (categories.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('materials')
      .select('*')
      .in('category', categories)
      .eq('in_stock', true)
      .limit(limit)
      .order('unit_price', { ascending: true });

    if (error) {
      logger.error('MaterialsService.getMaterialsByCategories error', error);
      throw new Error(`Failed to get materials by categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate average material cost for a category
   * Useful for estimation when specific material isn't found
   */
  async getCategoryAverageCost(category: MaterialCategory): Promise<{
    average_price: number;
    median_price: number;
    count: number;
  }> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('unit_price')
      .eq('category', category)
      .eq('in_stock', true);

    if (error || !data || data.length === 0) {
      return { average_price: 0, median_price: 0, count: 0 };
    }

    const prices = data.map(m => m.unit_price).sort((a, b) => a - b);
    const average_price = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const median_price = prices[Math.floor(prices.length / 2)];

    return {
      average_price,
      median_price,
      count: prices.length,
    };
  }

  /**
   * Admin-only: Create a new material
   */
  async createMaterial(material: CreateMaterialInput): Promise<Material> {
    const { data, error } = await this.supabase
      .from('materials')
      .insert(material)
      .select()
      .single();

    if (error) {
      logger.error('MaterialsService.createMaterial error', error);
      throw new Error(`Failed to create material: ${error.message}`);
    }

    return data;
  }

  /**
   * Admin-only: Update a material
   */
  async updateMaterial(
    id: string,
    updates: UpdateMaterialInput
  ): Promise<Material> {
    const { data, error } = await this.supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('MaterialsService.updateMaterial error', error);
      throw new Error(`Failed to update material: ${error.message}`);
    }

    return data;
  }

  /**
   * Admin-only: Delete a material
   */
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('MaterialsService.deleteMaterial error', error);
      throw new Error(`Failed to delete material: ${error.message}`);
    }
  }
}

// Export singleton instance for server-side use
export const materialsService = new MaterialsService();
