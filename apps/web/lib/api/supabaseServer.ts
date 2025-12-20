import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please set this in your .env.local file. ' +
    'For local development: http://127.0.0.1:54321'
  );
}

if (!supabaseServiceKey) {
  throw new Error(
    '[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'Please set this in your .env.local file. ' +
    'This is the service role key from your Supabase project settings. ' +
    'NEVER commit this key to version control.'
  );
}

// Singleton service-role client. Never import this in client-side code.
export const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

