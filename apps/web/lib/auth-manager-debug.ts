// Temporary debug version of auth-manager.ts
// Use this to add timing logs and identify slowness

import { createTokenPair, createAuthCookieHeaders } from './auth';
import { DatabaseManager } from './database';
import { logger } from '@mintenance/shared';
import { serverSupabase } from './api/supabaseServer';

export async function debugLogin(email: string, password: string) {
  // logger.debug('🔍 Starting login debug...', [object Object], { service: 'lib' });

  // Step 1: Validate input
  console.time('⏱️  Step 1: Validate Input');
  if (!email?.trim() || !password?.trim()) {
    // logger.info('❌ Missing credentials', [object Object], { service: 'lib' });
    return;
  }
  console.timeEnd('⏱️  Step 1: Validate Input');

  // Step 2: Supabase Auth
  console.time('⏱️  Step 2: Supabase Auth');
  const { data: authData, error: authError } = await serverSupabase.auth.signInWithPassword({
    email,
    password,
  });
  console.timeEnd('⏱️  Step 2: Supabase Auth');

  if (authError) {
    logger.error('❌ Supabase Auth Error:', authError.message', [object Object], { service: 'lib' });
    logger.error('   Error Code:', authError.code', [object Object], { service: 'lib' });
    logger.error('   Full Error:', JSON.stringify(authError, null, 2', [object Object], { service: 'lib' }));
    return;
  }

  // logger.info('✅ Supabase Auth Success', [object Object], { service: 'lib' });
  // logger.info('   User ID:', authData.user?.id', [object Object], { service: 'lib' });
  // logger.info('   Email:', authData.user?.email', [object Object], { service: 'lib' });
  // logger.info('   Email Confirmed:', !!authData.user?.email_confirmed_at', [object Object], { service: 'lib' });

  // Step 3: Get User Profile
  console.time('⏱️  Step 3: Get User Profile');
  const { data: userProfile, error: profileError } = await serverSupabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .eq('id', authData.user.id)
    .single();
  console.timeEnd('⏱️  Step 3: Get User Profile');

  if (profileError) {
    logger.error('❌ Profile Error:', profileError.message', [object Object], { service: 'lib' });
  } else {
    // logger.info('✅ Profile Retrieved', [object Object], { service: 'lib' });
    // logger.info('   Role:', userProfile?.role', [object Object], { service: 'lib' });
  }

  // Step 4: Create Tokens
  console.time('⏱️  Step 4: Create Token Pair');
  const { accessToken, refreshToken } = await createTokenPair({
    id: userProfile?.id || authData.user.id,
    email: userProfile?.email || authData.user.email || email,
    role: userProfile?.role || 'homeowner',
  });
  console.timeEnd('⏱️  Step 4: Create Token Pair');

  // logger.debug('✅ Login Debug Complete!', [object Object], { service: 'lib' });
  // logger.info('=====================================', [object Object], { service: 'lib' });
}

// Usage: Add to login route temporarily
// import { debugLogin } from '@/lib/auth-manager-debug';
// await debugLogin(email, password);
