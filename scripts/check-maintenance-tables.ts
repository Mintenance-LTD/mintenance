/**
 * Check if maintenance AI tables exist in database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMaintenanceTables() {
  console.log('🔍 Checking for Maintenance AI tables...\n');

  const tablesToCheck = [
    'maintenance_assessments',
    'maintenance_training_labels',
    'maintenance_corrections',
    'maintenance_segmentation_masks',
    'maintenance_knowledge_base',
    'contractor_contributions'
  ];

  const existingTables: string[] = [];
  const missingTables: string[] = [];

  for (const table of tablesToCheck) {
    try {
      // Try to query the table (limit 1 to be fast)
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
        console.log(`❌ ${table} - NOT FOUND`);
      } else if (error) {
        console.log(`⚠️ ${table} - ERROR: ${error.message}`);
      } else {
        existingTables.push(table);
        console.log(`✅ ${table} - EXISTS`);
      }
    } catch (err) {
      console.log(`❌ ${table} - ERROR checking`);
      missingTables.push(table);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`   Tables found: ${existingTables.length}`);
  console.log(`   Tables missing: ${missingTables.length}`);

  if (missingTables.length > 0) {
    console.log('\n⚠️ Missing tables indicate the maintenance migration has not been applied.');
    console.log('   To fix this, the migration needs to be applied to the database.');

    // Let's check if we can at least use existing tables
    console.log('\n🔄 Checking alternative storage options...');

    // Check if we can use gpt4_training_labels table instead
    const { error: gpt4Error } = await supabase
      .from('gpt4_training_labels')
      .select('*')
      .limit(1);

    if (!gpt4Error) {
      console.log('✅ Can use gpt4_training_labels table for training data');
    }

    // Check if we can use building_assessments
    const { count } = await supabase
      .from('building_assessments')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log(`✅ Can repurpose ${count} building_assessments for training`);
    }
  } else {
    console.log('\n✅ All maintenance tables exist! Ready to store training data.');
  }

  console.log('\n✨ Check complete!');
}

checkMaintenanceTables()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });