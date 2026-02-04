import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create two clients - one with service role (admin), one with anon key (public)
const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSPolicies() {
  console.log('🔐 Testing Materials RLS Policies\n');
  let allTestsPassed = true;

  // Test 1: Public Read Access (should PASS)
  console.log('Test 1: Public Read Access');
  try {
    const { data, error } = await publicClient
      .from('materials')
      .select('id, name, category, unit_price')
      .limit(5);

    if (error) {
      console.log('❌ FAILED - Public read should be allowed');
      console.log('   Error:', error.message);
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED - Public can read materials (found ${data?.length || 0} items)`);
      if (data && data.length > 0) {
        console.log(`   Sample: ${data[0].name} - £${data[0].unit_price}`);
      }
    }
  } catch (err: any) {
    console.log('❌ FAILED - Unexpected error:', err.message);
    allTestsPassed = false;
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Test 2: Public Insert Access (should FAIL)
  console.log('Test 2: Public Insert Access (should be denied)');
  try {
    const { data, error } = await publicClient
      .from('materials')
      .insert({
        name: 'Test Material',
        category: 'other',
        unit_price: 10.00,
        unit: 'each',
        in_stock: true,
        lead_time_days: 0
      })
      .select();

    if (error) {
      if (error.code === '42501' || error.message.includes('denied') || error.message.includes('policy')) {
        console.log('✅ PASSED - Public insert correctly denied');
        console.log('   Expected error:', error.message);
      } else {
        console.log('❌ FAILED - Wrong error type');
        console.log('   Error:', error.message);
        allTestsPassed = false;
      }
    } else {
      console.log('❌ FAILED - Public insert should be denied but succeeded!');
      console.log('   Created:', data);
      allTestsPassed = false;
    }
  } catch (err: any) {
    console.log('❌ FAILED - Unexpected error:', err.message);
    allTestsPassed = false;
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Test 3: Admin Insert Access (should PASS)
  console.log('Test 3: Admin Insert Access');
  try {
    const testMaterial = {
      name: 'RLS Test Material',
      category: 'other' as const,
      unit_price: 99.99,
      unit: 'each' as const,
      description: 'Temporary test material for RLS verification',
      in_stock: true,
      lead_time_days: 0
    };

    const { data, error } = await adminClient
      .from('materials')
      .insert(testMaterial)
      .select();

    if (error) {
      console.log('❌ FAILED - Admin insert should be allowed');
      console.log('   Error:', error.message);
      allTestsPassed = false;
    } else {
      console.log('✅ PASSED - Admin can insert materials');
      console.log(`   Created: ${data[0].name} (ID: ${data[0].id})`);

      // Clean up - delete the test material
      const { error: deleteError } = await adminClient
        .from('materials')
        .delete()
        .eq('id', data[0].id);

      if (!deleteError) {
        console.log('   ✓ Test material cleaned up');
      }
    }
  } catch (err: any) {
    console.log('❌ FAILED - Unexpected error:', err.message);
    allTestsPassed = false;
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Test 4: Public Update Access (should FAIL)
  console.log('Test 4: Public Update Access (should be denied)');
  try {
    // Get a material ID to test update
    const { data: materials } = await publicClient
      .from('materials')
      .select('id, unit_price')
      .limit(1);

    if (materials && materials.length > 0) {
      const originalPrice = materials[0].unit_price;
      const { data, error, count } = await publicClient
        .from('materials')
        .update({ unit_price: 999.99 })
        .eq('id', materials[0].id)
        .select();

      if (error) {
        if (error.code === '42501' || error.message.includes('denied') || error.message.includes('policy')) {
          console.log('✅ PASSED - Public update correctly denied (error)');
          console.log('   Expected error:', error.message);
        } else {
          console.log('❌ FAILED - Wrong error type');
          console.log('   Error:', error.message);
          allTestsPassed = false;
        }
      } else if (!data || data.length === 0) {
        console.log('✅ PASSED - Public update correctly denied (0 rows affected)');
        console.log('   RLS policy blocked the update silently');
      } else {
        console.log('❌ FAILED - Public update should be denied but succeeded!');
        console.log(`   Updated price from £${originalPrice} to £${data[0].unit_price}`);
        allTestsPassed = false;
      }
    }
  } catch (err: any) {
    console.log('❌ FAILED - Unexpected error:', err.message);
    allTestsPassed = false;
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Test 5: Public Delete Access (should FAIL)
  console.log('Test 5: Public Delete Access (should be denied)');
  try {
    // Get a material ID to test delete
    const { data: materials } = await publicClient
      .from('materials')
      .select('id, name')
      .limit(1);

    if (materials && materials.length > 0) {
      const testId = materials[0].id;
      const testName = materials[0].name;

      const { data, error, count } = await publicClient
        .from('materials')
        .delete()
        .eq('id', testId)
        .select();

      if (error) {
        if (error.code === '42501' || error.message.includes('denied') || error.message.includes('policy')) {
          console.log('✅ PASSED - Public delete correctly denied (error)');
          console.log('   Expected error:', error.message);
        } else {
          console.log('❌ FAILED - Wrong error type');
          console.log('   Error:', error.message);
          allTestsPassed = false;
        }
      } else if (!data || data.length === 0) {
        console.log('✅ PASSED - Public delete correctly denied (0 rows affected)');
        console.log('   RLS policy blocked the delete silently');

        // Verify the material still exists
        const { data: checkData } = await publicClient
          .from('materials')
          .select('id')
          .eq('id', testId)
          .single();

        if (checkData) {
          console.log(`   ✓ Verified: ${testName} still exists`);
        }
      } else {
        console.log('❌ FAILED - Public delete should be denied but succeeded!');
        console.log(`   Deleted: ${testName} (ID: ${testId})`);
        allTestsPassed = false;
      }
    }
  } catch (err: any) {
    console.log('❌ FAILED - Unexpected error:', err.message);
    allTestsPassed = false;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Summary
  if (allTestsPassed) {
    console.log('✅ All RLS policy tests PASSED!');
    console.log('\nSummary:');
    console.log('  ✓ Public users can read materials catalog');
    console.log('  ✓ Public users cannot insert materials');
    console.log('  ✓ Public users cannot update materials');
    console.log('  ✓ Public users cannot delete materials');
    console.log('  ✓ Admin users can insert materials');
    console.log('\n🎉 Materials system RLS policies are working correctly!');
  } else {
    console.log('❌ Some RLS policy tests FAILED');
    console.log('   Review the errors above and check your RLS policies.');
    process.exit(1);
  }
}

testRLSPolicies();
