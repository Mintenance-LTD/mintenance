import { supabase } from '../../config/supabase';
import { ContractorProfile, ContractorMatch, LocationData } from '@mintenance/types';
import { logger } from '../../utils/logger';
import { calculateDistance, mapUserToContractorProfile } from './ContractorHelpers';
import type { DatabaseUserRow, DatabaseMatchRow, DatabaseError } from './types';

/** Fetch all available contractors within a radius. */
export async function getNearbyContractors(
  homeownerLocation: LocationData,
  radiusKm = 25
): Promise<ContractorProfile[]> {
  try {
    const { data: contractors, error } = await supabase
      .from('profiles')
      .select('*, contractor_skills(id, skill_name, created_at), reviews:reviews!reviewed_id(id, rating, comment, created_at, reviewer:reviewer_id(first_name, last_name))')
      .eq('role', 'contractor')
      .eq('is_available', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    const dbError = error as DatabaseError | null;
    if (dbError) throw new Error(dbError.message || 'Database error');
    if (!contractors) throw new Error('Database error');

    return (contractors as DatabaseUserRow[])
      .map((c) => ({ ...mapUserToContractorProfile(c), distance: calculateDistance(homeownerLocation.latitude, homeownerLocation.longitude, c.latitude || 0, c.longitude || 0) }))
      .filter((c) => c.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    logger.error('Error fetching nearby contractors:', error);
    throw error;
  }
}

/** Simpler nearby fetch from contractor_profiles table (used by tests). */
export async function findNearbyContractors(
  location: { latitude: number; longitude: number; radius: number },
  currentUserId?: string
): Promise<import('./types').DatabaseContractorProfileRow[]> {
  const { data, error } = await supabase
    .from('contractor_profiles')
    .select('*')
    .neq('user_id', currentUserId || '');
  if (error) throw error;
  return (data || []).filter((c: import('./types').DatabaseContractorProfileRow) => {
    if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return false;
    const d = calculateDistance(location.latitude, location.longitude, c.latitude, c.longitude);
    return isNaN(location.radius) ? true : d <= location.radius;
  });
}

/** Fetch contractors the homeowner hasn't already swiped on. */
export async function getUnmatchedContractors(homeownerId: string, location: LocationData): Promise<ContractorProfile[]> {
  try {
    const { data: matches, error: matchError } = await supabase
      .from('contractor_matches')
      .select('contractor_id')
      .eq('homeowner_id', homeownerId);
    if (matchError) throw matchError;

    const matchedIds = matches?.map((m: { contractor_id: string }) => m.contractor_id) || [];

    const { data: contractors, error } = await supabase
      .from('profiles')
      .select('*, contractor_skills(id, skill_name, created_at), reviews:reviews!reviewed_id(id, rating, comment, created_at)')
      .eq('role', 'contractor')
      .eq('is_available', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('id', 'in', `(${matchedIds.join(',')})`);

    const dbError = error as DatabaseError | null;
    if (dbError) throw new Error(dbError.message || 'Database error');
    if (!contractors) throw new Error('Database error');

    return (contractors as DatabaseUserRow[])
      .map((c) => ({ ...mapUserToContractorProfile(c), distance: calculateDistance(location.latitude, location.longitude, c.latitude || 0, c.longitude || 0) }))
      .filter((c) => c.distance <= 25)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    logger.error('Error fetching unmatched contractors:', error);
    throw error;
  }
}

/** Record a like/pass action. */
export async function recordContractorMatch(
  homeownerId: string,
  contractorId: string,
  action: 'like' | 'pass'
): Promise<ContractorMatch> {
  try {
    const { data, error } = await supabase
      .from('contractor_matches')
      .insert({ homeowner_id: homeownerId, contractor_id: contractorId, action })
      .select()
      .single();

    const dbError = error as DatabaseError | null;
    if (dbError) throw new Error(dbError.message || 'Insert failed');
    if (!data) throw new Error('Insert failed');

    return { id: data.id, homeownerId: data.homeowner_id, contractorId: data.contractor_id, action: data.action as 'like' | 'pass', createdAt: data.created_at };
  } catch (error) {
    logger.error('Error recording contractor match:', error);
    throw error;
  }
}

/** Swipe action (liked/passed) – test-friendly alias. */
export async function swipeContractor(
  homeownerId: string,
  contractorId: string,
  action: 'liked' | 'passed'
): Promise<DatabaseMatchRow> {
  const { data, error } = await supabase
    .from('contractor_matches')
    .insert({ homeowner_id: homeownerId, contractor_id: contractorId, action, created_at: new Date().toISOString() })
    .single();
  if (error) throw error;
  return data as DatabaseMatchRow;
}

/** Get contractors the homeowner liked. */
export async function getLikedContractors(homeownerId: string): Promise<ContractorProfile[]> {
  try {
    const { data: matches, error } = await supabase
      .from('contractor_matches')
      .select('contractor_id, contractor:contractor_id(*, contractor_skills(id, skill_name, created_at), reviews:reviews!reviewed_id(id, rating, comment, created_at))')
      .eq('homeowner_id', homeownerId)
      .eq('action', 'like');

    if (error) throw error;
    return matches?.map((m: DatabaseMatchRow) => mapUserToContractorProfile(m.contractor!)) || [];
  } catch (error) {
    logger.error('Error fetching liked contractors:', error);
    throw error;
  }
}

/** Get all match records with contractor detail (for tests). */
export async function getMatches(homeownerId: string): Promise<DatabaseMatchRow[]> {
  const { data, error } = await supabase
    .from('contractor_matches')
    .select('*, contractor:contractor_id(*, user:user_id(*), skills:contractor_skills(skill_name))')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DatabaseMatchRow[];
}

/** Get simplified match records (no contractor detail). */
export async function getContractorMatches(homeownerId: string): Promise<(ContractorMatch & { contractor?: DatabaseUserRow })[]> {
  try {
    const { data: matches, error } = await supabase
      .from('contractor_matches')
      .select('*')
      .eq('homeowner_id', homeownerId);

    if (error) throw error;
    return matches?.map((m: DatabaseMatchRow) => ({ id: m.id, homeownerId: m.homeowner_id, contractorId: m.contractor_id, action: m.action as 'like' | 'pass', createdAt: m.created_at, contractor: m.contractor })) || [];
  } catch (error) {
    logger.error('Error fetching contractor matches:', error);
    throw error;
  }
}
