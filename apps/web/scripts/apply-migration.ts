#!/usr/bin/env tsx
/**
 * Apply stripe_customer_id Migration
 *
 * Directly applies the migration to add stripe_customer_id column to users table
 *
 * Usage: npm run apply:migration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🔧 Applying stripe_customer_id Migration\n');

  try {
    // Check if column already exists
    console.log('1️⃣ Checking if stripe_customer_id column exists...');

    const { data: beforeData, error: beforeError } = await supabase
      .from('users')
      .select('id, stripe_customer_id')
      .limit(1);

    if (!beforeError) {
      console.log('✅ Column already exists! No migration needed.\n');
      return true;
    }

    if (!beforeError.message.includes('stripe_customer_id')) {
      throw beforeError;
    }

    console.log('⚠️  Column does not exist. Applying migration via SQL...\n');

    // Use the SQL editor endpoint
    console.log('📝 Migration SQL:');
    console.log('   ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;');
    console.log('   CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);\n');

    console.log('⚠️  Unable to apply migration programmatically.');
    console.log('   Please apply manually in Supabase dashboard:\n');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/sql/new');
    console.log('   2. Paste the SQL above');
    console.log('   3. Click "Run"\n');

    console.log('   Or use the migration file:');
    console.log('   supabase/migrations/20250101000001_add_stripe_customer_id.sql\n');

    return false;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

applyMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
