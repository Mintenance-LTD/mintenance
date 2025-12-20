/**
 * Script to set a password for an admin user
 * Usage: node scripts/set-admin-password.js <email> <password>
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdminPassword(email, password) {
  try {
    console.log(`\n🔐 Setting password for admin: ${email}`);
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update the user with the password hash
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim())
      .select('id, email, role')
      .single();
    
    if (error) {
      console.error('❌ Error updating password:', error.message);
      process.exit(1);
    }
    
    if (!data) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }
    
    console.log('✅ Password set successfully!');
    console.log(`   User ID: ${data.id}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   Role: ${data.role}`);
    console.log(`\n💡 You can now log in at: http://localhost:3000/login`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/set-admin-password.js <email> <password>');
  console.error('\nExample:');
  console.error('  node scripts/set-admin-password.js liam@mintenance.co.uk "YourSecurePassword123!"');
  process.exit(1);
}

setAdminPassword(email, password);

