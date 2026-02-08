// Authentication Debug Script
// Run this in Node.js to test Supabase connection directly

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Authentication...');
console.log('URL:', supabaseUrl);
console.log(
  'Key:',
  supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET'
);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('\n🧪 Testing Authentication Flow...');

  try {
    // Test 1: Check connection
    console.log('\n1️⃣ Testing Supabase Connection...');
    const { data: connectionTest } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    console.log('✅ Connection successful');

    // Test 2: Try to sign up a test user
    console.log('\n2️⃣ Testing User Registration...');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: testEmail,
        password: 'testpassword123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
            role: 'homeowner',
          },
        },
      }
    );

    if (signUpError) {
      console.log('❌ Sign Up Error:', signUpError.message);
    } else {
      console.log(
        '✅ Sign Up Successful:',
        signUpData.user ? 'User created' : 'Check email for confirmation'
      );
    }

    // Test 3: Try to sign in with existing test user
    console.log('\n3️⃣ Testing Login with Test Credentials...');
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: 'test@homeowner.com',
        password: 'password123',
      });

    if (signInError) {
      console.log('❌ Sign In Error:', signInError.message);
      console.log(
        '💡 This might mean test users need to be created in Supabase'
      );
    } else {
      console.log(
        '✅ Sign In Successful:',
        signInData.user ? 'User logged in' : 'No user data'
      );
    }

    // Test 4: Check users table
    console.log('\n4️⃣ Checking Users Table...');
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('email, role')
      .limit(5);

    if (usersError) {
      console.log('❌ Users Table Error:', usersError.message);
    } else {
      console.log(
        '✅ Users Table Accessible:',
        usersData?.length || 0,
        'users found'
      );
      if (usersData?.length > 0) {
        console.log('Sample users:', usersData);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected Error:', error.message);
  }

  console.log('\n🎯 Diagnosis Complete');
  console.log('\n📋 Next Steps:');
  console.log('1. If connection failed: Check environment variables');
  console.log('2. If sign up failed: Check Supabase auth settings');
  console.log('3. If sign in failed: Run create-test-user.sql in Supabase');
  console.log(
    '4. If users table failed: Check RLS policies and database setup'
  );
}

testAuth().catch(console.error);
