/**
 * Building Pathology RAG (Retrieval-Augmented Generation) Service
 *
 * Queries the building_pathology_knowledge table to retrieve curated expert
 * knowledge about UK building defects, sourced from RICS, BRE, and industry
 * standards. This context is injected into the AI assessment prompt so that
 * GPT-4o / Mint AI VLM produces surveyor-grade explanations backed by
 * authoritative references, not just pattern recognition.
 *
 * Sources: BRE Digest 245/251, RICS/Historic England JPS 2022, PCA CoP 2022,
 *          BRE GR5, BS EN ISO 13788, IStructE, Subsidence Forum UK.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PathologyKnowledgeEntry {
  defect_slug: string;
  category: string;
  name: string;
  aka: string[];
  description: string;
  why_it_happens: string;
  visual_indicators: string[];
  photo_detection_cues: string[];
  common_misdiagnosis: string[];
  differential_diagnosis: string | null;
  rics_condition_rating: 1 | 2 | 3 | null;
  urgency: 'routine' | 'soon' | 'urgent' | 'immediate';
  remediation_summary: string;
  remediation_steps: string[];
  cost_range_gbp_min: number | null;
  cost_range_gbp_max: number | null;
  regulatory_reference: string[];
  property_age_risk: string[];
  construction_type_risk: string[];
  specialist_required: boolean;
  further_investigation: string | null;
  source_authority: string;
}

export interface RAGContext {
  /** Formatted prompt string ready to inject into the system message */
  promptContext: string;
  /** Raw entries retrieved, for logging/debugging */
  entries: PathologyKnowledgeEntry[];
  /** How many entries were found */
  count: number;
}

// ---------------------------------------------------------------------------
// RAG Service
// ---------------------------------------------------------------------------

export class BuildingPathologyRAGService {
  /**
   * Query the knowledge base using full-text search against the defect
   * descriptions, visual indicators, and photo detection cues.
   *
   * Call this BEFORE generating an assessment — inject the returned
   * promptContext into the system message to ground the AI in authoritative
   * UK building surveying standards.
   */
  static async query(
    searchTerms: string[],
    options: {
      maxEntries?: number;
      categories?: string[];
      minRicsRating?: 1 | 2 | 3;
    } = {}
  ): Promise<RAGContext> {
    const { maxEntries = 5, categories, minRicsRating } = options;

    if (searchTerms.length === 0) {
      return { promptContext: '', entries: [], count: 0 };
    }

    try {
      // Build full-text search query from all terms
      const tsQuery = searchTerms
        .map(t => t.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ''))
        .filter(Boolean)
        .join(' | ');  // OR search across all terms

      let query = serverSupabase
        .from('building_pathology_knowledge')
        .select('*')
        .textSearch(
          'fts_col',  // we use a generated column approach via raw filter below
          tsQuery,
          { type: 'websearch', config: 'english' }
        )
        .limit(maxEntries);

      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      if (minRicsRating) {
        query = query.gte('rics_condition_rating', minRicsRating);
      }

      const { data, error } = await query;

      // Fallback: if full-text search returns nothing, try category filter
      if (error || !data || data.length === 0) {
        return this.fallbackQuery(searchTerms, maxEntries, categories);
      }

      const entries = data as PathologyKnowledgeEntry[];
      return {
        promptContext: this.formatPromptContext(entries),
        entries,
        count: entries.length,
      };
    } catch (err) {
      logger.warn('BuildingPathologyRAGService query failed, returning empty context', {
        service: 'BuildingPathologyRAGService',
        error: err instanceof Error ? err.message : 'unknown',
      });
      return { promptContext: '', entries: [], count: 0 };
    }
  }

  /**
   * Retrieve entries by their exact category slugs.
   * Useful when the AI pipeline already has a detected defect category.
   */
  static async queryByCategory(
    categories: string[],
    maxEntries = 8
  ): Promise<RAGContext> {
    if (categories.length === 0) {
      return { promptContext: '', entries: [], count: 0 };
    }

    try {
      const { data, error } = await serverSupabase
        .from('building_pathology_knowledge')
        .select('*')
        .in('category', categories)
        .order('rics_condition_rating', { ascending: false })
        .limit(maxEntries);

      if (error || !data) {
        return { promptContext: '', entries: [], count: 0 };
      }

      const entries = data as PathologyKnowledgeEntry[];
      return {
        promptContext: this.formatPromptContext(entries),
        entries,
        count: entries.length,
      };
    } catch (err) {
      logger.warn('BuildingPathologyRAGService categoryQuery failed', {
        service: 'BuildingPathologyRAGService',
        error: err instanceof Error ? err.message : 'unknown',
      });
      return { promptContext: '', entries: [], count: 0 };
    }
  }

  /**
   * Retrieve a single entry by defect slug.
   * Use when a specific defect has already been identified.
   */
  static async getBySlug(slug: string): Promise<PathologyKnowledgeEntry | null> {
    try {
      const { data, error } = await serverSupabase
        .from('building_pathology_knowledge')
        .select('*')
        .eq('defect_slug', slug)
        .single();

      if (error || !data) return null;
      return data as PathologyKnowledgeEntry;
    } catch {
      return null;
    }
  }

  /**
   * Fallback: keyword ILIKE search when FTS returns nothing.
   */
  private static async fallbackQuery(
    searchTerms: string[],
    maxEntries: number,
    categories?: string[]
  ): Promise<RAGContext> {
    try {
      // Search the name and description fields with ILIKE on the first term
      const term = searchTerms[0]?.trim();
      if (!term) return { promptContext: '', entries: [], count: 0 };

      let query = serverSupabase
        .from('building_pathology_knowledge')
        .select('*')
        .or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
        .limit(maxEntries);

      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return { promptContext: '', entries: [], count: 0 };
      }

      const entries = data as PathologyKnowledgeEntry[];
      return {
        promptContext: this.formatPromptContext(entries),
        entries,
        count: entries.length,
      };
    } catch {
      return { promptContext: '', entries: [], count: 0 };
    }
  }

  /**
   * Format retrieved knowledge entries into a structured prompt context block.
   * Designed to be injected into the AI system message.
   */
  static formatPromptContext(entries: PathologyKnowledgeEntry[]): string {
    if (entries.length === 0) return '';

    const blocks = entries.map(e => {
      const rating = e.rics_condition_rating
        ? `Rating ${e.rics_condition_rating} (${e.rics_condition_rating === 1 ? 'GREEN — routine' : e.rics_condition_rating === 2 ? 'AMBER — repair soon' : 'RED — urgent'})`
        : 'Rating not specified';

      const costRange = e.cost_range_gbp_min && e.cost_range_gbp_max
        ? `£${e.cost_range_gbp_min.toLocaleString()}–£${e.cost_range_gbp_max.toLocaleString()}`
        : 'Cost range not specified';

      return `
--- DEFECT: ${e.name.toUpperCase()} (${e.defect_slug}) ---
Category: ${e.category.replace('_', ' ')}
RICS Condition: ${rating}
Urgency: ${e.urgency.toUpperCase()}

DESCRIPTION:
${e.description}

WHY IT HAPPENS (ROOT CAUSE):
${e.why_it_happens}

VISUAL INDICATORS (what to look for):
${e.visual_indicators.map(v => `• ${v}`).join('\n')}

COMMON MISDIAGNOSIS: ${e.common_misdiagnosis.join(', ') || 'None noted'}
${e.differential_diagnosis ? `\nHOW TO DISTINGUISH:\n${e.differential_diagnosis}` : ''}

REMEDIATION:
${e.remediation_summary}

ESTIMATED COST (UK): ${costRange}
${e.specialist_required ? '⚠️ SPECIALIST REQUIRED: ' + (e.further_investigation ?? 'Yes') : ''}

REGULATORY REFERENCES: ${e.regulatory_reference?.join(', ') || 'None specified'}
SOURCE AUTHORITY: ${e.source_authority}
`.trim();
    });

    return `
=== MINT AI BUILDING PATHOLOGY KNOWLEDGE BASE ===
Sources: RICS, BRE Digests 245/251, RICS/Historic England JPS 2022, PCA CoP 2022, IStructE
The following expert knowledge from UK building surveying standards is provided to support your assessment.
Use this to explain ROOT CAUSES, not just identify defects. Reference the standards cited.

${blocks.join('\n\n')}

=== END KNOWLEDGE BASE CONTEXT ===
`.trim();
  }

  /**
   * Map commonly detected damage types (from existing damage_taxonomy)
   * to knowledge base categories for efficient querying.
   */
  static damageTypeToCategories(damageType: string): string[] {
    const mapping: Record<string, string[]> = {
      mold_damp:      ['damp_moisture'],
      water_damage:   ['damp_moisture'],
      pipe_leak:      ['damp_moisture'],
      wall_crack:     ['structural_movement', 'masonry_walls'],
      roof_damage:    ['roofing'],
      electrical_fault: ['services'],
      timber_damage:  ['timber_decay'],
      subsidence:     ['structural_movement'],
      efflorescence:  ['masonry_walls'],
      spalling:       ['masonry_walls'],
      window_defect:  ['windows_doors'],
      drain_defect:   ['drainage'],
      asbestos:       ['hazardous_materials'],
      knotweed:       ['hazardous_materials'],
    };
    return mapping[damageType] ?? [];
  }
}
