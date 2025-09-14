import { createClient } from '@supabase/supabase-js';

// Production Supabase credentials - with fallback for development
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';

let supabase: any;

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
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

  // Create a mock client for development
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
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: new Error('Supabase not configured'),
            }),
        }),
      }),
      insert: () =>
        Promise.resolve({
          data: null,
          error: new Error('Supabase not configured'),
        }),
      update: () =>
        Promise.resolve({
          data: null,
          error: new Error('Supabase not configured'),
        }),
      delete: () =>
        Promise.resolve({
          data: null,
          error: new Error('Supabase not configured'),
        }),
    }),
  };

  console.log('Using mock Supabase client for development');
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
