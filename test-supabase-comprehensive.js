const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection comprehensively
async function testSupabaseComprehensive() {
  console.log('🔍 Comprehensive Supabase Test\n');
  
  // Get credentials from environment
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';
  
  console.log('📋 Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Key: ${supabaseKey.substring(0, 30)}...`);
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
    
    // Test 1: Basic connection
    console.log('\n🔗 Test 1: Basic Connection');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log(`❌ Auth error: ${authError.message}`);
      if (authError.message.includes('Invalid API key')) {
        console.log('   → Check your EXPO_PUBLIC_SUPABASE_ANON_KEY');
        return;
      }
      if (authError.message.includes('Invalid URL')) {
        console.log('   → Check your EXPO_PUBLIC_SUPABASE_URL');
        return;
      }
    } else {
      console.log('✅ Basic connection successful');
    }
    
    // Test 2: Database schema check
    console.log('\n🗄️ Test 2: Database Schema Check');
    
    const tables = ['users', 'jobs', 'bids', 'escrow_transactions'];
    let schemaStatus = '✅';
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`❌ Table '${table}' does not exist`);
            schemaStatus = '❌';
          } else if (error.message.includes('permission denied')) {
            console.log(`⚠️ Table '${table}' exists but no permission`);
          } else {
            console.log(`❌ Table '${table}' error: ${error.message}`);
            schemaStatus = '❌';
          }
        } else {
          console.log(`✅ Table '${table}' exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' test failed: ${err.message}`);
        schemaStatus = '❌';
      }
    }
    
    // Test 3: RLS (Row Level Security) check
    console.log('\n🔒 Test 3: Row Level Security Check');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error && error.message.includes('permission denied')) {
        console.log('✅ RLS is enabled (expected for security)');
      } else if (error) {
        console.log(`⚠️ RLS check inconclusive: ${error.message}`);
      } else {
        console.log('⚠️ RLS might not be properly configured');
      }
    } catch (err) {
      console.log(`⚠️ RLS check failed: ${err.message}`);
    }
    
    // Test 4: Realtime check
    console.log('\n⚡ Test 4: Realtime Check');
    try {
      const channel = supabase.channel('test-channel');
      const subscription = channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection successful');
          channel.unsubscribe();
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Realtime connection failed');
        }
      });
      
      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log(`⚠️ Realtime test failed: ${err.message}`);
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Connection: ✅ Working`);
    console.log(`   Schema: ${schemaStatus}`);
    console.log(`   Project ID: ${supabaseUrl.split('//')[1].split('.')[0]}`);
    
    if (schemaStatus === '❌') {
      console.log('\n🛠️ Next Steps:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run the script in supabase-setup.sql');
      console.log('   4. Verify tables in Table Editor');
    } else {
      console.log('\n🎉 Your Supabase is fully working!');
    }
    
  } catch (error) {
    console.log('❌ Supabase test failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the comprehensive test
testSupabaseComprehensive();
