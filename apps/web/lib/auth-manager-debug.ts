// Temporary debug version of auth-manager.ts
// Use this to add timing logs and identify slowness

import { createTokenPair, createAuthCookieHeaders } from './auth';
import { DatabaseManager } from './database';
import { logger } from '@mintenance/shared';
import { serverSupabase } from './api/supabaseServer';

export async function debugLogin(email: string, password: string) {
  // console.log('🔍 Starting login debug...');

  // Step 1: Validate input
  console.time('⏱️  Step 1: Validate Input');
  if (!email?.trim() || !password?.trim()) {
    // console.log('❌ Missing credentials');
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
    console.error('❌ Supabase Auth Error:', authError.message);
    console.error('   Error Code:', authError.code);
    console.error('   Full Error:', JSON.stringify(authError, null, 2));
    return;
  }

  // console.log('✅ Supabase Auth Success');
  // console.log('   User ID:', authData.user?.id);
  // console.log('   Email:', authData.user?.email);
  // console.log('   Email Confirmed:', !!authData.user?.email_confirmed_at);

  // Step 3: Get User Profile
  console.time('⏱️  Step 3: Get User Profile');
  const { data: userProfile, error: profileError } = await serverSupabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .eq('id', authData.user.id)
    .single();
  console.timeEnd('⏱️  Step 3: Get User Profile');

  if (profileError) {
    console.error('❌ Profile Error:', profileError.message);
  } else {
    // console.log('✅ Profile Retrieved');
    // console.log('   Role:', userProfile?.role);
  }

  // Step 4: Create Tokens
  console.time('⏱️  Step 4: Create Token Pair');
  const { accessToken, refreshToken } = await createTokenPair({
    id: userProfile?.id || authData.user.id,
    email: userProfile?.email || authData.user.email || email,
    role: userProfile?.role || 'homeowner',
  });
  console.timeEnd('⏱️  Step 4: Create Token Pair');

  // console.log('✅ Login Debug Complete!');
  // console.log('=====================================');
}

// Usage: Add to login route temporarily
// import { debugLogin } from '@/lib/auth-manager-debug';
// await debugLogin(email, password);
