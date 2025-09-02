// Test Authentication Script
// Run with: node test-auth.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('🧪 Testing Supabase Authentication...\n');

  // Test 1: Check connection
  console.log('1. Testing connection...');
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Connection successful');
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return;
  }

  // Test 2: Test user registration
  console.log('\n2. Testing user registration...');
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    first_name: 'Test',
    last_name: 'User',
    role: 'homeowner'
  };

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          first_name: testUser.first_name,
          last_name: testUser.last_name,
          role: testUser.role
        }
      }
    });

    if (error) throw error;
    console.log('✅ User registration successful');
    console.log('📧 User ID:', data.user?.id);
    
    // Wait a moment for the trigger to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if profile was created
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Profile creation failed:', profileError.message);
      } else {
        console.log('✅ Profile created successfully');
        console.log('👤 Profile:', JSON.stringify(profile, null, 2));
      }
    }

  } catch (error) {
    console.log('❌ Registration failed:', error.message);
  }

  console.log('\n🎉 Authentication test completed!');
}

testAuth().catch(console.error);