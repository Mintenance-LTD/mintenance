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
  });
  console.log('✅ Supabase client initialized successfully');
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

export { supabase };
