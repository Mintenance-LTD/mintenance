import type { User, CreateUserData } from '../database';

/**
 * Minimal Supabase auth user shape consumed by the fallback builders.
 * Kept structural to avoid importing @supabase/supabase-js types here.
 */
interface SupabaseAuthUserLike {
  id: string;
  email?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
}

/**
 * Build a fallback User object for login when the profiles row is missing.
 *
 * SECURITY: This MUST NOT read role from user_metadata (client-writable).
 * A malicious user could set role: 'admin' via supabase.auth.updateUser().
 * Defaults to 'homeowner'. The profile trigger should always create the row,
 * so this fallback should rarely execute.
 */
export function buildLoginFallbackUser(
  authUser: SupabaseAuthUserLike,
  email: string
): User {
  return {
    id: authUser.id,
    email: authUser.email || email,
    first_name: authUser.user_metadata?.first_name || '',
    last_name: authUser.user_metadata?.last_name || '',
    role: 'homeowner' as const,
    created_at: authUser.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    verified: !!authUser.email_confirmed_at,
    phone: undefined,
  };
}

/**
 * Build a fallback User object for registration when the profiles row is
 * missing. Safe because role here comes from server-validated RegisterData,
 * NOT from user_metadata.
 */
export function buildRegisterFallbackUser(
  authUser: SupabaseAuthUserLike,
  userData: CreateUserData
): User {
  return {
    id: authUser.id,
    email: authUser.email || userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    role: userData.role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    verified: authUser.email_confirmed_at ? true : false,
    phone: undefined,
  };
}

/**
 * Check if a Supabase error is a duplicate-key / already-exists error.
 */
export function isDuplicateKeyError(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === '23505' ||
    !!error.message?.includes('duplicate key') ||
    !!error.message?.includes('already exists')
  );
}
