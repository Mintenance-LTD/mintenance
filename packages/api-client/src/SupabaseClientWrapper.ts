/**
 * Supabase Client Wrapper
 * 
 * Wraps Supabase client with consistent error handling and typed methods.
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { parseError, logError, ApiError } from './ErrorHandler';

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
  options?: {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
    };
  };
}

export class SupabaseClientWrapper {
  private client: SupabaseClient;

  constructor(config: SupabaseClientConfig) {
    this.client = createClient(config.url, config.anonKey, config.options);
  }

  /**
   * Get underlying Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Execute query with error handling
   */
  async query<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
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
    mutationFn: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
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
  async signUp(email: string, password: string, metadata?: Record<string, unknown>) {
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

