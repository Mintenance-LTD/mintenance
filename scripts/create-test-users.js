// Create Test Users Script
// Run with: node create-test-users.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUsers() {
  console.log('🧪 Creating test users...\n');

  const testUsers = [
    {
      email: 'test@homeowner.com',
      password: 'password123',
      userData: {
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
      },
    },
    {
      email: 'test@contractor.com',
      password: 'password123',
      userData: {
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
      },
    },
  ];

  for (const user of testUsers) {
    console.log(`Creating ${user.userData.role}: ${user.email}`);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: user.userData,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          console.log(`✅ ${user.email} already exists (skipping)`);
        } else {
          console.log(`❌ Failed to create ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created ${user.email} successfully`);

        // Wait a moment for the trigger to process
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.log(`❌ Error creating ${user.email}:`, error.message);
    }
  }

  console.log('\n🎉 Test user creation completed!');
  console.log('\n📱 You can now use these credentials in your app:');
  console.log('👤 Homeowner: test@homeowner.com / password123');
  console.log('🔧 Contractor: test@contractor.com / password123');
}

createTestUsers().catch(console.error);
