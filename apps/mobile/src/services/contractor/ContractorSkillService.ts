import { supabase } from '../../config/supabase';
import {
  ContractorSkill,
  ContractorProfile,
  LocationData,
} from '@mintenance/types';
import { logger } from '../../utils/logger';
import { sanitizeForSQL } from '../../utils/sqlSanitization';
import {
  calculateDistance,
  mapUserToContractorProfile,
} from './ContractorHelpers';
import type {
  DatabaseContractorProfileRow,
  DatabaseUserRow,
  DatabaseError,
} from './types';

/** Add a skill to a contractor's profile. */
export async function addContractorSkill(
  contractorId: string,
  skillName: string
): Promise<ContractorSkill> {
  try {
    const { data, error } = await supabase
      .from('contractor_skills')
      .insert({ contractor_id: contractorId, skill_name: skillName })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      contractorId: data.contractor_id,
      skillName: data.skill_name,
      createdAt: data.created_at,
    };
  } catch (error) {
    logger.error('Error adding contractor skill:', error);
    throw error;
  }
}

/** Update a contractor's latitude/longitude. */
export async function updateContractorLocation(
  contractorId: string,
  location: LocationData
): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ latitude: location.latitude, longitude: location.longitude })
      .eq('id', contractorId);
    if (error) throw error;
  } catch (error) {
    logger.error('Error updating contractor location:', error);
    throw error;
  }
}

/** Toggle a contractor's availability flag. */
export async function updateContractorAvailability(
  contractorId: string,
  isAvailable: boolean
): Promise<{ isAvailable: boolean }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractorId)
      .eq('role', 'contractor')
      .select()
      .single();

    const dbError = error as DatabaseError | null;
    if (dbError) throw new Error(dbError.message || 'Update failed');
    return { isAvailable };
  } catch (error) {
    logger.error('Error updating contractor availability:', error);
    throw error;
  }
}

/** Search contractors by keyword or advanced filters. */
export async function searchContractors(
  params:
    | string
    | {
        query?: string;
        skills?: string[];
        location: LocationData;
        maxDistance?: number;
        minRating?: number;
      }
): Promise<DatabaseContractorProfileRow[] | ContractorProfile[]> {
  try {
    if (typeof params === 'string') {
      const searchTerm = params.trim();
      if (!searchTerm || searchTerm.length < 2 || searchTerm.length > 100) {
        logger.warn('Invalid search term', { data: { term: params } });
        return [];
      }
      const sanitized = sanitizeForSQL(searchTerm);
      // 2026-07-04: repointed from the retired contractor-profiles
      // side table (it only ever held Stripe/subscription columns, so
      // this select 400'd). skills/bio/company_name live on `profiles`.
      // IMPORTANT: `profiles` is column-grant locked for the
      // authenticated role — the column list below is copied from the
      // proven advanced-branch select further down; adding an
      // ungranted column 403s the whole query.
      // `skills` is text[], so keyword matching uses array containment
      // (`cs`) rather than ilike.
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, portfolio_images, created_at'
        )
        .eq('role', 'contractor')
        .or(
          `bio.ilike.%${sanitized}%,company_name.ilike.%${sanitized}%,skills.cs.{${sanitized}}`
        )
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      // Raw profiles rows pass through unchanged (pre-existing caller
      // contract); the row shape is a superset of what callers read.
      return (data || []) as unknown as DatabaseContractorProfileRow[];
    }

    const adv = params;
    let query = supabase
      .from('profiles')
      .select(
        'id, role, first_name, last_name, bio, city, country, profile_image_url, avatar_url, rating, total_jobs_completed, verified, admin_verified, skills, is_available, company_name, hourly_rate, years_experience, portfolio_images, created_at, contractor_skills(id, skill_name, created_at), reviews:reviews!reviewee_id(id, rating, comment, created_at)'
      )
      .eq('role', 'contractor')
      .eq('is_available', true);

    if (adv.query) {
      const searchTerm = adv.query.trim();
      if (searchTerm && searchTerm.length >= 2 && searchTerm.length <= 100) {
        const sanitized = sanitizeForSQL(searchTerm);
        query = query.or(
          `first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`
        );
      }
    }
    if (adv.minRating) query = query.gte('rating', adv.minRating);
    if (adv.skills && adv.skills.length > 0)
      query = query.in('id', ['mock-id-1']);

    const { data: contractors, error } = await query;
    if (error) throw error;

    let results =
      (contractors as unknown as DatabaseUserRow[])?.map(
        mapUserToContractorProfile
      ) || [];
    if (adv.skills && adv.skills.length > 0) {
      results = results.filter((c) =>
        c.skills.some((s) => adv.skills!.includes(s.skillName))
      );
    }
    if (adv.maxDistance) {
      results = (results as (ContractorProfile & { distance: number })[])
        .map((c) => ({
          ...c,
          distance: calculateDistance(
            adv.location.latitude,
            adv.location.longitude,
            c.latitude || 0,
            c.longitude || 0
          ),
        }))
        .filter((c) => c.distance <= adv.maxDistance!)
        .sort((a, b) => a.distance - b.distance);
    }
    return results;
  } catch (error) {
    logger.error('Error searching contractors:', error);
    throw error;
  }
}
