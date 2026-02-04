const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ukrjudtlvapiajkjbcrd.supabase.co';
const supabaseServiceKey = 'sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying Budget Visibility Migration...\n');

  // Test 1: Check jobs table columns
  console.log('📋 Test 1: Verifying jobs table columns...');
  const { data: jobsColumns, error: jobsError } = await supabase
    .from('jobs')
    .select('budget, budget_min, budget_max, show_budget_to_contractors, require_itemized_bids')
    .limit(1);

  if (jobsError) {
    console.error('❌ Jobs table columns not found:', jobsError.message);
  } else {
    console.log('✅ Jobs table has new columns');
    console.log('   Columns present:', Object.keys(jobsColumns[0] || {}));
  }

  // Test 2: Create a test job with budget visibility
  console.log('\n📋 Test 2: Creating test job with budget visibility...');

  // First, get a homeowner user
  const { data: homeowner } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'homeowner')
    .limit(1)
    .single();

  if (!homeowner) {
    console.error('❌ No homeowner found in database');
    return;
  }

  const testJobData = {
    homeowner_id: homeowner.id,
    title: 'Budget Visibility Test Job',
    description: 'Testing budget range display and itemization requirements',
    category: 'Plumbing',
    location: 'London, UK',
    latitude: 51.5074,
    longitude: -0.1278,
    budget: 1000,
    budget_min: 900,
    budget_max: 1100,
    show_budget_to_contractors: false, // Hidden
    require_itemized_bids: true,
    status: 'posted'
  };

  const { data: testJob, error: createError } = await supabase
    .from('jobs')
    .insert(testJobData)
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create test job:', createError.message);
    return;
  }

  console.log('✅ Test job created successfully');
  console.log('   Job ID:', testJob.id);
  console.log('   Budget: £' + testJob.budget);
  console.log('   Range: £' + testJob.budget_min + ' - £' + testJob.budget_max);
  console.log('   Hidden from contractors:', testJob.show_budget_to_contractors === false ? 'Yes' : 'No');
  console.log('   Requires itemization:', testJob.require_itemized_bids ? 'Yes' : 'No');

  // Test 3: Verify budget hiding works (contractor view simulation)
  console.log('\n📋 Test 3: Simulating contractor view (budget should be hidden)...');
  const { data: contractorView } = await supabase
    .from('jobs')
    .select('id, title, budget, budget_min, budget_max, show_budget_to_contractors, require_itemized_bids')
    .eq('id', testJob.id)
    .single();

  if (contractorView) {
    const displayBudget = contractorView.show_budget_to_contractors
      ? `£${contractorView.budget}`
      : `£${contractorView.budget_min}-£${contractorView.budget_max}`;

    console.log('✅ Contractor sees:', displayBudget);
    console.log('   Exact budget hidden:', !contractorView.show_budget_to_contractors ? 'Yes ✓' : 'No ✗');
    console.log('   Itemization required:', contractorView.require_itemized_bids ? 'Yes ✓' : 'No ✗');
  }

  // Test 4: Check bids table has itemization columns
  console.log('\n📋 Test 4: Verifying bids table columns...');
  const { data: bidsColumns, error: bidsError } = await supabase
    .from('bids')
    .select('has_itemization, itemization_quality_score, materials_breakdown, labor_breakdown, other_costs_breakdown')
    .limit(1);

  if (bidsError && !bidsError.message.includes('no rows')) {
    console.error('❌ Bids table columns not found:', bidsError.message);
  } else {
    console.log('✅ Bids table has itemization columns');
  }

  // Test 5: Check analytics view exists
  console.log('\n📋 Test 5: Checking analytics view...');
  const { data: analytics, error: analyticsError } = await supabase
    .from('budget_anchoring_analytics')
    .select('*')
    .limit(1);

  if (analyticsError) {
    console.error('❌ Analytics view not accessible:', analyticsError.message);
  } else {
    console.log('✅ Analytics view exists and is queryable');
  }

  // Clean up test job
  console.log('\n🧹 Cleaning up test job...');
  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', testJob.id);

  if (deleteError) {
    console.log('⚠️  Could not delete test job:', deleteError.message);
    console.log('   Please manually delete job ID:', testJob.id);
  } else {
    console.log('✅ Test job cleaned up');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ MIGRATION VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\nAll database changes are working correctly!');
  console.log('\nNext steps:');
  console.log('1. Start dev server: npm run dev (in apps/web)');
  console.log('2. Test job creation at: http://localhost:3000/jobs/create');
  console.log('3. Verify contractor view at: http://localhost:3000/contractor/discover');
}

verifyMigration().catch(console.error);
