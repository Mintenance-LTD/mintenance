import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import type { Database } from '../types/database';

// Resolve Supabase credentials from environment or app config
const extra: any = (Constants as any)?.expoConfig?.extra || {};
const rawUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || 'https://demo.supabase.co';
const rawKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || 'demo-key';

// Guard against dashboard URL being provided instead of API URL
const isDashboardUrl = /supabase\.com\/dashboard\/project\//i.test(rawUrl);
const supabaseUrl = isDashboardUrl ? 'https://demo.supabase.co' : rawUrl;
const supabaseKey = rawKey;

let supabase: ReturnType<typeof createClient<Database>> | any;

try {
  supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'User-Agent': 'Mintenance-App/1.1.1',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  console.log('✅ Supabase client initialized successfully');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 API Key (first 10 chars):', supabaseKey.substring(0, 10) + '...');
} catch (error) {
  console.error('Supabase client initialization failed:', error);

  // Create a robust mock client for development that supports contractor queries
  const createMockQueryChain = () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      // Return empty array for list queries (used by contractor discovery)
      then: (callback: any) => callback({ data: [], error: null }),
      // Support async iteration
      [Symbol.asyncIterator]: async function* () {},
    };

    // Make it thenable for direct await
    Object.defineProperty(chain, 'then', {
      value: (onResolve: any) => {
        return Promise.resolve({ data: [], error: null }).then(onResolve);
      },
      writable: true
    });

    return chain;
  };

  supabase = {
    auth: {
      signUp: () =>
        Promise.resolve({
          data: null,
          error: new Error('Supabase not configured'),
        }),
      signInWithPassword: () =>
        Promise.resolve({
          data: null,
          error: new Error('Supabase not configured'),
        }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: (table: string) => {
      if (table === 'users' || table === 'contractor_profiles' || table === 'contractor_matches') {
        // Return chainable mock for contractor-related queries
        return createMockQueryChain();
      }

      // Default mock for other tables
      return {
        select: () => createMockQueryChain(),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => createMockQueryChain(),
        delete: () => Promise.resolve({ data: null, error: null }),
      };
    },
  };

  console.log('Using mock Supabase client for development');
}

// Warn loudly if a dashboard URL was detected
if (isDashboardUrl) {
  console.error(
    '[config/supabase] Detected a Supabase Dashboard URL. Please use the Project API URL from Settings → API (looks like https://<project>.supabase.co) and the anon key.'
  );
}

// Network connectivity test function
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string; latency?: number }> => {
  try {
    const startTime = Date.now();
    console.log('🔍 Testing Supabase connectivity...');

    // Simple health check via auth endpoint
    const { data, error } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    if (error && error.message.includes('Network request failed')) {
      console.error('❌ Supabase connectivity test failed:', error.message);
      return { success: false, error: error.message, latency };
    }

    console.log(`✅ Supabase connectivity test successful (${latency}ms)`);
    return { success: true, latency };
  } catch (error: any) {
    console.error('❌ Supabase connectivity test error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

export { supabase };
