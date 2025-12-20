/**
 * Clean up test data and ensure real data flow
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  // Identify test email patterns
  const testEmailPatterns = [
    'test.%',
    '%@test.com',
    '%@example.com',
    'demo%',
    'sample%',
  ];

  // Get test user IDs
  const { data: testUsers, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .or(testEmailPatterns.map(p => `email.ilike.${p}`).join(','));

  if (userError) {
    console.error('❌ Error fetching test users:', userError);
    return;
  }

  console.log(`📊 Found ${testUsers?.length || 0} test users\n`);

  if (testUsers && testUsers.length > 0) {
    console.log('Test users to be affected:');
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    console.log('');

    const testUserIds = testUsers.map(u => u.id);

    // Count related data
    const { count: jobCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('homeowner_id', testUserIds);

    const { count: bidCount } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .in('contractor_id', testUserIds);

    console.log('📊 Related data summary:');
    console.log(`  - Jobs from test users: ${jobCount || 0}`);
    console.log(`  - Bids from test users: ${bidCount || 0}`);
    console.log('');

    // Prompt for confirmation
    console.log('⚠️  WARNING: This will delete all test data!');
    console.log('To proceed, uncomment the deletion code in the script.\n');

    // UNCOMMENT TO ACTUALLY DELETE TEST DATA
    /*
    // Delete test jobs
    const { error: jobError } = await supabase
      .from('jobs')
      .delete()
      .in('homeowner_id', testUserIds);

    if (jobError) {
      console.error('❌ Error deleting test jobs:', jobError);
    } else {
      console.log(`✅ Deleted ${jobCount || 0} test jobs`);
    }

    // Delete test bids
    const { error: bidError } = await supabase
      .from('bids')
      .delete()
      .in('contractor_id', testUserIds);

    if (bidError) {
      console.error('❌ Error deleting test bids:', bidError);
    } else {
      console.log(`✅ Deleted ${bidCount || 0} test bids`);
    }
    */
  }

  // Check system health
  console.log('\n🔍 System Health Check:\n');

  // Check for real users (non-test)
  const { count: realUserCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('email', 'ilike', '%test%')
    .not('email', 'ilike', '%demo%')
    .not('email', 'ilike', '%example%');

  console.log(`👥 Real users: ${realUserCount || 0}`);

  // Check for jobs with attachments
  const { count: jobsWithImages } = await supabase
    .from('job_attachments')
    .select('DISTINCT job_id', { count: 'exact', head: true });

  console.log(`📸 Jobs with images: ${jobsWithImages || 0}`);

  // Check for jobs with geocoding
  const { count: jobsWithGeo } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  console.log(`📍 Jobs with geocoding: ${jobsWithGeo || 0}`);

  // Check for jobs linked to properties
  const { count: jobsWithProperties } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .not('property_id', 'is', null);

  console.log(`🏠 Jobs linked to properties: ${jobsWithProperties || 0}`);

  // Check contractor skills
  const { count: contractorSkillsCount } = await supabase
    .from('contractor_skills')
    .select('*', { count: 'exact', head: true });

  console.log(`🔧 Contractor skills configured: ${contractorSkillsCount || 0}`);

  // Check notifications
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'job_nearby');

  console.log(`🔔 Job nearby notifications: ${notificationCount || 0}`);
}

// Run the script
cleanupTestData().then(() => {
  console.log('\n✅ Test data review complete');
  console.log('\n📝 Next steps:');
  console.log('1. Create real user accounts for testing');
  console.log('2. Create properties for homeowners');
  console.log('3. Add contractor skills and locations');
  console.log('4. Create jobs with real addresses and images');
  console.log('5. Test contractor discovery and bidding');
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});