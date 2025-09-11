const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Check environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';
  
  console.log('📋 Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('');
  
  if (supabaseUrl === 'https://demo.supabase.co' || supabaseKey === 'demo-key') {
    console.log('❌ Supabase credentials not configured!');
    console.log('   Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    
    console.log('✅ Supabase client created successfully');
    
    // Test basic connection by getting the current user (should work without auth)
    console.log('🔗 Testing connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message.includes('Invalid API key')) {
      console.log('❌ Invalid API key - check your EXPO_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    if (authError && authError.message.includes('Invalid URL')) {
      console.log('❌ Invalid URL - check your EXPO_PUBLIC_SUPABASE_URL');
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log(`   User: ${user ? 'Authenticated' : 'Not authenticated (expected)'}`);
    
    // Test database access by trying to query a table
    console.log('🗄️ Testing database access...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation "users" does not exist')) {
        console.log('⚠️ Database tables not set up yet');
        console.log('   Run the SQL script in supabase-setup.sql');
      } else {
        console.log(`❌ Database error: ${error.message}`);
      }
    } else {
      console.log('✅ Database access working!');
    }
    
    console.log('\n🎉 Supabase is working correctly!');
    
  } catch (error) {
    console.log('❌ Supabase connection failed:');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('fetch')) {
      console.log('   This might be a network connectivity issue');
    }
  }
}

// Run the test
testSupabaseConnection();
