import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import type { Database } from '../types/database';
import { logger } from '../utils/logger';

type SupabaseLike = ReturnType<typeof createClient<Database>> | ReturnType<typeof createMockSupabase>;

const extra: any = (Constants as any)?.expoConfig?.extra ?? {};
const useMockFlag = (process.env.EXPO_PUBLIC_USE_MOCK ?? '').toLowerCase() === 'true';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey;

const validateCredentials = (url?: string, key?: string) => {
  const errors: string[] = [];

  if (!url || !url.trim()) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is missing');
  }
  if (!key || !key.trim()) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  }

  if (url) {
    const dashboardPattern = /supabase\.com\/dashboard\/project\//i;
    if (dashboardPattern.test(url)) {
      errors.push('Dashboard URL detected. Use the API URL (https://<project>.supabase.co).');
    }
    const apiPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
    if (!dashboardPattern.test(url) && !apiPattern.test(url)) {
      errors.push(`Invalid Supabase URL format: ${url}`);
    }
  }

  if (key) {
    const looksLikeJwt = key.length >= 40 && key.includes('.');
    if (!looksLikeJwt) {
      errors.push('Anon key does not look like a JWT.');
    }
  }

  return { valid: errors.length === 0, errors };
};

const validation = validateCredentials(supabaseUrl, supabaseAnonKey);
const credentialsValid = validation.valid;

let supabase: SupabaseLike;

try {
  if (__DEV__ && useMockFlag) {
    throw new Error('EXPO_PUBLIC_USE_MOCK=true (dev mock forced)');
  }

  if (!credentialsValid) {
    validation.errors.forEach((error, index) => {
      logger.error('Supabase', `Config error ${index + 1}: ${error}`);
    });

    if (!__DEV__) {
      throw new Error('Supabase configuration invalid');
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing');
  }

  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  if (__DEV__) {
    logger.info('Supabase', `Client initialised (${supabaseUrl})`);
  }
} catch (error) {
  if (!__DEV__) {
    throw error;
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.warn('Supabase', `Falling back to mock client: ${message}`);
  supabase = createMockSupabase();
}

export const isSupabaseConfigured = credentialsValid && !useMockFlag;

export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string; latency?: number }> => {
  if (useMockFlag || !credentialsValid) {
    return { success: false, error: 'Mock client active or credentials invalid' };
  }

  try {
    const start = Date.now();
    const { error } = await supabase.auth.getSession();
    const latency = Date.now() - start;

    if (error) {
      return { success: false, error: error.message, latency };
    }

    return { success: true, latency };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export { supabase };

function createMockSupabase() {
  const mockError = new Error('Mock Supabase client - configure real credentials to enable data access');

  const createQueryChain = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
    };

    chain.then = (onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve);
    chain[Symbol.asyncIterator] = async function* () {};
    return chain;
  };

  return {
    auth: {
      signUp: async () => ({ data: null, error: mockError }),
      signInWithPassword: async () => ({ data: null, error: mockError }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
    },
    from: (table: string) => {
      logger.warn(`[Supabase: MOCK] Query to table: ${table}`);
      return {
        select: () => createQueryChain(),
        insert: async () => ({ data: null, error: mockError }),
        update: () => createQueryChain(),
        delete: async () => ({ data: null, error: mockError }),
        upsert: async () => ({ data: null, error: mockError }),
        eq: () => createQueryChain(),
      };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: mockError }),
        download: async () => ({ data: null, error: mockError }),
        list: async () => ({ data: [], error: null }),
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
      subscribe: () => ({}),
      unsubscribe: () => ({}),
    }),
  } as SupabaseLike;
}
