/**
 * Supabase Client Wrapper
 *
 * Wraps Supabase client with consistent error handling and typed methods.
 *
 * ⚠️ Security invariant (PKG-P1-3, audit 2026-04-13):
 * This wrapper is designed for CLIENT-SIDE use only. It must be constructed
 * with the PUBLIC anon key. Never pass a service-role key as `config.anonKey`
 * — service role bypasses RLS and should never reach the mobile bundle or
 * browser. The constructor runtime-checks the JWT payload and throws if it
 * detects a service_role claim, which catches the most common misconfiguration.
 *
 * For server-side operations that need elevated privileges, use
 * `apps/web/lib/api/supabaseServer.ts::serverSupabase` directly instead of
 * this wrapper.
 */
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { parseError, logError, ApiError } from './ErrorHandler';
export interface SupabaseClientConfig {
  url: string;
  /** PUBLIC anon key only. Service role keys are rejected at construction. */
  anonKey: string;
  options?: {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
    };
  };
}

/**
 * Runtime check: decode a Supabase JWT payload (no signature verification —
 * we only want to read the `role` claim) and throw if it is a service_role.
 * The JWT is a base64url-encoded JSON structure: header.payload.signature.
 */
function assertAnonKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('SupabaseClientWrapper: anonKey is required');
  }
  const parts = key.split('.');
  if (parts.length !== 3) {
    // Not a JWT — could be a test placeholder. Let Supabase validate it.
    return;
  }
  try {
    const payloadB64 = parts[1]!;
    // base64url → base64
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as { role?: string };
    if (payload.role === 'service_role') {
      throw new Error(
        'SupabaseClientWrapper: refusing to initialize with a service_role key. ' +
          'This wrapper is anon-only. Use serverSupabase for server-side service role access.'
      );
    }
  } catch (error) {
    // If JSON.parse fails the key is malformed; let Supabase report it.
    if (error instanceof Error && error.message.includes('service_role')) {
      throw error;
    }
  }
}

export class SupabaseClientWrapper {
  private client: SupabaseClient;
  constructor(config: SupabaseClientConfig) {
    assertAnonKey(config.anonKey);
    this.client = createClient(config.url, config.anonKey, config.options);
  }
  /**
   * Get underlying Supabase client.
   *
   * The returned client is anon-authenticated (RLS-enforced). The constructor
   * rejects service-role keys so this is always safe to expose.
   */
  getClient(): SupabaseClient {
    return this.client;
  }
  /**
   * Execute query with error handling
   */
  async query<T>(
    queryFn: (
      client: SupabaseClient
    ) => Promise<{ data: T | null; error: unknown }>
  ): Promise<T> {
    try {
      const { data, error } = await queryFn(this.client);
      if (error) {
        const apiError = parseError(error);
        logError(apiError, 'Supabase query error');
        throw apiError;
      }
      if (data === null) {
        throw parseError({
          message: 'No data returned',
          code: 'NO_DATA',
          statusCode: 404,
        });
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw parseError(error);
    }
  }
  /**
   * Execute mutation with error handling
   */
  async mutate<T>(
    mutationFn: (
      client: SupabaseClient
    ) => Promise<{ data: T | null; error: unknown }>
  ): Promise<T> {
    try {
      const { data, error } = await mutationFn(this.client);
      if (error) {
        const apiError = parseError(error);
        logError(apiError, 'Supabase mutation error');
        throw apiError;
      }
      if (data === null) {
        throw parseError({
          message: 'Mutation returned no data',
          code: 'NO_DATA',
          statusCode: 500,
        });
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw parseError(error);
    }
  }
  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw parseError(error);
    }
    return data.session;
  }
  /**
   * Sign in
   */
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw parseError(error);
    }
    return data;
  }
  /**
   * Sign up
   */
  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) {
      throw parseError(error);
    }
    return data;
  }
  /**
   * Sign out
   */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw parseError(error);
    }
  }
}
