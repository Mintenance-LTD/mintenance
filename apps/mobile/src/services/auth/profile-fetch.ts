import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import type { User } from '@mintenance/types';
import type { Session } from '@supabase/supabase-js';
import { validateEmailFormat } from './validators';

/**
 * Profile-fetch + session helpers extracted from
 * `services/AuthService.ts` on 2026-05-09.
 *
 * Two paths to "current user":
 *   1. Server: GET /api/users/profile (canonical, matches web)
 *   2. Fallback: Supabase auth metadata
 *
 * The fallback intentionally returns a minimally-shaped User row
 * (firstName/lastName aliases, default role) so callers don't crash
 * when the API is unreachable on cold start.
 */

interface RawProfile {
  first_name?: string;
  last_name?: string;
  created_at?: string;
  [key: string]: unknown;
}

export async function getCurrentSession(): Promise<unknown> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    try {
      const response = await mobileApiClient.get<{
        profile?: RawProfile;
        user?: RawProfile;
      }>('/api/users/profile');
      const userProfile = response.profile || response.user;
      if (userProfile) {
        return {
          ...userProfile,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          createdAt: userProfile.created_at,
        } as unknown as User;
      }
    } catch (apiError) {
      logger.warn(
        'Profile fetch via API failed, using auth metadata fallback:',
        apiError
      );
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      first_name: (session.user.user_metadata?.first_name as string) || '',
      last_name: (session.user.user_metadata?.last_name as string) || '',
      role: (session.user.user_metadata?.role as User['role']) || 'homeowner',
      created_at: session.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      firstName: (session.user.user_metadata?.first_name as string) || '',
      lastName: (session.user.user_metadata?.last_name as string) || '',
      createdAt: session.user.created_at || new Date().toISOString(),
    } as unknown as User;
  } catch (error) {
    logger.error('Error fetching current user:', error);
    return null;
  }
}

export async function updateUserProfile(
  _userId: string,
  updates: Partial<User>
): Promise<User> {
  if (updates.email && !validateEmailFormat(updates.email)) {
    throw new Error('Invalid email format');
  }

  // PUT /api/users/profile returns `{ success, profile }`. The legacy
  // `response.user` check caused every save to fail with "No user
  // returned from API" even on a 200 response.
  const response = await mobileApiClient.put<{
    success?: boolean;
    profile?: User;
  }>('/api/users/profile', updates);
  if (!response.profile) throw new Error('No profile returned from API');
  return response.profile;
}

/**
 * Resolve the User row immediately after a Supabase signIn. Tries the
 * `profiles` table directly with an explicit column list (avoids
 * leaking stripe_connect_account_id, totp_secret_needs_rotation, etc.
 * if column privileges are tightened). Falls back to auth metadata.
 */
export async function resolveSignedInUser(
  authUser: {
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
  },
  session: Session | null
): Promise<{ user: User | null; session: Session | null }> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, role, phone, bio, profile_image_url, avatar_url, city, country, address, postcode, latitude, longitude, rating, total_jobs_completed, verified, admin_verified, skills, company_name, hourly_rate, years_experience, is_available, is_visible_on_map, created_at, updated_at, onboarding_completed, subscription_status, settings, notification_preferences'
      )
      .eq('id', authUser.id)
      .single();
    if (!profileError && profileData) {
      const userProfile = profileData as Record<string, unknown>;
      const enhancedProfile = {
        ...userProfile,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        createdAt: userProfile.created_at,
      } as unknown as User;
      return { user: enhancedProfile, session };
    }
  } catch (profileError) {
    logger.warn(
      'Profile fetch from Supabase failed, using auth metadata fallback:',
      profileError
    );
  }

  const fallbackUser: User = {
    id: authUser.id,
    email: authUser.email || '',
    first_name: (authUser.user_metadata?.first_name as string) || '',
    last_name: (authUser.user_metadata?.last_name as string) || '',
    role: (authUser.user_metadata?.role as User['role']) || 'homeowner',
    created_at: authUser.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    firstName: (authUser.user_metadata?.first_name as string) || '',
    lastName: (authUser.user_metadata?.last_name as string) || '',
    createdAt: authUser.created_at || new Date().toISOString(),
  } as unknown as User;
  return { user: fallbackUser, session };
}
