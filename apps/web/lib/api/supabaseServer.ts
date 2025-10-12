import { createClient } from '@supabase/supabase-js';

// Temporarily hardcode for testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

console.log('🔍 SupabaseServer.ts Environment Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('[Supabase] Missing service role configuration on the server');
}

// Singleton service-role client. Never import this in client-side code.
export const serverSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

