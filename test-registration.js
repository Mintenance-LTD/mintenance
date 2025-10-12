const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testRegistration() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test user creation
    const testUser = {
      email: 'test@example.com',
      password_hash: 'hashed_password_placeholder',
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner',
      phone: '+44 7700 900000'
    };
    
    console.log('Creating test user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (userError) {
      console.error('❌ User creation failed:', userError);
      return;
    }
    
    console.log('✅ User created successfully:', userData);
    
    // Clean up - delete the test user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'test@example.com');
    
    if (deleteError) {
      console.error('⚠️ Failed to clean up test user:', deleteError);
    } else {
      console.log('✅ Test user cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRegistration();
