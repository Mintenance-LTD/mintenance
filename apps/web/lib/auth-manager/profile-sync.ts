import { logger } from '@mintenance/shared';
import { serverSupabase } from '../api/supabaseServer';
import type { CreateUserData, User } from '../database';
import { isDuplicateKeyError } from './profile-helpers';

const PROFILE_COLUMNS =
  'id, email, first_name, last_name, role, created_at, updated_at, verified, phone';

/**
 * Fetch a profile row by id, retrying a few times with backoff to allow the
 * post-signup database trigger to create it. Returns the profile or null.
 *
 * No state dependencies - operates on the shared serverSupabase singleton.
 */
export async function fetchProfileWithRetry(
  userId: string,
  maxRetries: number = 3
): Promise<{ profile: User | null; lastError: unknown }> {
  let profile: User | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));

    const { data, error } = await serverSupabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();

    if (data && !error) {
      profile = data as User;
      lastError = null;
      return { profile, lastError };
    }

    lastError = error;
    logger.warn(`Attempt ${attempt + 1} to fetch user profile failed`, {
      userId,
      error,
      service: 'auth',
    });
  }

  return { profile, lastError };
}

/**
 * Attempt to manually insert the profile row when the trigger didn't run.
 * If insert fails with a duplicate-key error, fall back to fetching the
 * existing row. If any other error, return null.
 *
 * No state dependencies - operates on the shared serverSupabase singleton.
 */
export async function ensureProfileExists(
  authUser: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
  },
  userData: CreateUserData
): Promise<User | null> {
  try {
    const { data: manualProfile, error: manualError } = await serverSupabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email || userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        phone: userData.phone || null,
        verified: authUser.email_confirmed_at ? true : false,
      })
      .select(PROFILE_COLUMNS)
      .single();

    if (manualProfile && !manualError) {
      logger.info('Manually created user profile after trigger failure', {
        userId: authUser.id,
        service: 'auth',
      });
      return manualProfile as User;
    }

    if (manualError) {
      if (isDuplicateKeyError(manualError)) {
        logger.warn('User profile already exists, fetching existing profile', {
          userId: authUser.id,
          service: 'auth',
        });
        const { data: existingProfile } = await serverSupabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', authUser.id)
          .single();

        return (existingProfile as User) || null;
      }

      logger.error('Failed to manually create user profile', manualError, {
        userId: authUser.id,
        service: 'auth',
      });
      return null;
    }

    return null;
  } catch (manualError) {
    logger.error('Failed to manually create user profile', manualError, {
      userId: authUser.id,
      service: 'auth',
    });
    // Try to fetch existing profile as fallback
    try {
      const { data: existingProfile } = await serverSupabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', authUser.id)
        .single();

      if (existingProfile) {
        logger.info('Found existing user profile as fallback', {
          userId: authUser.id,
          service: 'auth',
        });
        return existingProfile as User;
      }
    } catch (fetchError) {
      logger.error('Failed to fetch existing user profile', fetchError, {
        userId: authUser.id,
        service: 'auth',
      });
    }
    return null;
  }
}
