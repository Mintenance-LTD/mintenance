/**
 * Verify Edge Function Environment Variables
 * 
 * This script tests the setup-contractor-payout Edge Function
 * to verify that all required environment variables are configured.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), 'apps', 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Make sure apps/web/.env.local is configured correctly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyEdgeFunctionEnv() {
  console.log('🔍 Verifying Edge Function environment variables...\n');

  // Get a test contractor ID (we'll use a dummy ID for testing env vars only)
  // The function will fail at contractor lookup, but we can see env var errors first
  const testContractorId = '00000000-0000-0000-0000-000000000000';

  try {
    console.log('📡 Invoking Edge Function to check environment variables...');
    console.log('   Function: setup-contractor-payout');
    console.log('   Test Contractor ID:', testContractorId);
    console.log('');

    // Use direct fetch to get better error messages
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/setup-contractor-payout`;
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ contractorId: testContractorId }),
    });

    const responseBody = await response.json();
    const errorMessage = responseBody.error || responseBody.message || `HTTP ${response.status}`;
    const errorDetails = responseBody.details;

    if (!response.ok) {
      // Check for environment variable errors specifically
      if (errorMessage.includes('STRIPE_SECRET_KEY')) {
        console.error('❌ Missing Environment Variable: STRIPE_SECRET_KEY');
        console.error('   💡 Set this in Supabase Dashboard > Functions > setup-contractor-payout > Settings > Environment Variables');
        console.error('   💡 Get your key from: https://dashboard.stripe.com/apikeys\n');
      } else if (errorMessage.includes('APP_URL')) {
        console.error('❌ Missing Environment Variable: APP_URL');
        console.error('   💡 Set this in Supabase Dashboard > Functions > setup-contractor-payout > Settings > Environment Variables');
        console.error('   💡 Example: https://mintenance.co.uk or http://localhost:3000\n');
      } else if (errorMessage.includes('SUPABASE_URL')) {
        console.error('❌ Missing Environment Variable: SUPABASE_URL');
        console.error('   💡 Set this in Supabase Dashboard > Functions > setup-contractor-payout > Settings > Environment Variables');
        console.error('   💡 Value should be:', supabaseUrl, '\n');
      } else if (errorMessage.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error('❌ Missing Environment Variable: SUPABASE_SERVICE_ROLE_KEY');
        console.error('   💡 Set this in Supabase Dashboard > Functions > setup-contractor-payout > Settings > Environment Variables');
        console.error('   💡 Get your key from: Supabase Dashboard > Settings > API > service_role key\n');
      } else if (errorMessage.includes('Contractor not found') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
        // Database-related errors mean env vars are set and function executed!
        console.log('✅ Environment variables are configured correctly!');
        console.log('   The function executed successfully (database error is expected with test ID)\n');
        console.log('📋 Summary:');
        console.log('   ✅ STRIPE_SECRET_KEY: Set');
        console.log('   ✅ APP_URL: Set');
        console.log('   ✅ SUPABASE_URL: Set');
        console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY: Set\n');
        console.log('✅ All environment variables are properly configured!');
        if (errorDetails) {
          console.log('   Note:', errorDetails);
        }
        process.exit(0);
      } else {
        // Unknown error - show full error message
        console.error('❌ Edge Function Error:');
        console.error('   Message:', errorMessage);
        if (errorDetails) {
          console.error('   Details:', errorDetails);
        }
        console.error('   Response Status:', response.status);
        console.error('\n💡 Check Supabase Dashboard logs for more details:');
        console.error('   https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/functions/setup-contractor-payout/logs\n');
      }
      
      process.exit(1);
    }

    // If we get here, the function returned successfully (shouldn't happen with test ID)
    console.log('⚠️ Unexpected success response from Edge Function:');
    console.log('   Response:', responseBody);
    console.log('\n💡 This is unexpected. Check function logs for details.');
    process.exit(1);

  } catch (error) {
    console.error('❌ Error invoking Edge Function:');
    console.error('   Error:', (error as Error).message);
    console.error('   Full error:', error);
    console.error('\n💡 Make sure:');
    console.error('   1. Edge Function is deployed');
    console.error('   2. Service role key has correct permissions');
    console.error('   3. Network connection is working');
    process.exit(1);
  }
}

verifyEdgeFunctionEnv();
