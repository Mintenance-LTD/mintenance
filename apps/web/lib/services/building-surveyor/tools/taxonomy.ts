/**
 * Damage taxonomy lookup for Mint AI planner.
 * Loads damage_type list from damage_taxonomy for a domain (e.g. building).
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/** Fallback building damage types (15 target classes from class_mapping.json). */
const BUILDING_DAMAGE_TYPES = [
  'pipe_leak',
  'water_damage',
  'wall_crack',
  'roof_damage',
  'electrical_fault',
  'mold_damp',
  'fire_damage',
  'window_broken',
  'door_damaged',
  'floor_damage',
  'ceiling_damage',
  'foundation_crack',
  'hvac_issue',
  'gutter_blocked',
  'general_damage',
] as const;

/**
 * Get ordered list of damage_type values for a domain from damage_taxonomy.
 * Used by planner to pass damage types to segment tool.
 */
export async function getDamageTypesForDomain(domain: string): Promise<string[]> {
  try {
    const { data, error } = await serverSupabase
      .from('damage_taxonomy')
      .select('damage_type')
      .eq('domain', domain)
      .order('damage_type');

    if (error) {
      logger.warn('Taxonomy: failed to fetch damage types, using fallback', {
        service: 'taxonomy',
        domain,
        error: error.message,
      });
      return domain === 'building' ? [...BUILDING_DAMAGE_TYPES] : [];
    }

    if (!data || data.length === 0) {
      return domain === 'building' ? [...BUILDING_DAMAGE_TYPES] : [];
    }

    return data.map((r: { damage_type: string }) => r.damage_type);
  } catch (err) {
    logger.warn('Taxonomy: getDamageTypesForDomain failed, using fallback', {
      service: 'taxonomy',
      domain,
      err,
    });
    return domain === 'building' ? [...BUILDING_DAMAGE_TYPES] : [];
  }
}

/**
 * Lookup damage_taxonomy id by domain and damage_type (for setting building_assessments.damage_taxonomy_id).
 */
export async function getDamageTaxonomyId(
  domain: string,
  damageType: string
): Promise<string | null> {
  try {
    const { data, error } = await serverSupabase
      .from('damage_taxonomy')
      .select('id')
      .eq('domain', domain)
      .eq('damage_type', damageType)
      .maybeSingle();

    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}
