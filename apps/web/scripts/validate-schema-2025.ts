/**
 * Schema Validation Script
 * Validates all database tables and fields used in the 2025 codebase
 * 
 * Run with: npx tsx scripts/validate-schema-2025.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================================
// TABLE DEFINITIONS
// ==========================================================

interface TableDefinition {
  name: string;
  requiredFields: string[];
  description: string;
}

const tables: TableDefinition[] = [
  {
    name: 'users',
    requiredFields: ['id', 'email', 'role', 'first_name', 'last_name', 'created_at'],
    description: 'Core user accounts',
  },
  {
    name: 'homeowner_profiles',
    requiredFields: ['id', 'user_id', 'created_at'],
    description: 'Homeowner-specific profile data',
  },
  {
    name: 'contractor_profiles',
    requiredFields: ['id', 'user_id', 'created_at'],
    description: 'Contractor-specific profile data',
  },
  {
    name: 'jobs',
    requiredFields: ['id', 'title', 'description', 'status', 'budget', 'homeowner_id', 'created_at'],
    description: 'Job postings and assignments',
  },
  {
    name: 'bids',
    requiredFields: ['id', 'job_id', 'contractor_id', 'bid_amount', 'status', 'created_at'],
    description: 'Contractor bids on jobs',
  },
  {
    name: 'contractor_quotes',
    requiredFields: ['id', 'contractor_id', 'total_amount', 'status', 'created_at'],
    description: 'Detailed contractor quotes',
  },
  {
    name: 'payments',
    requiredFields: ['id', 'amount', 'status', 'payer_id', 'payee_id', 'created_at'],
    description: 'Payment transactions',
  },
  {
    name: 'escrow_transactions',
    requiredFields: ['id', 'amount', 'status', 'payee_id', 'created_at'],
    description: 'Escrow payment holds',
  },
  {
    name: 'properties',
    requiredFields: ['id', 'homeowner_id', 'address', 'created_at'],
    description: 'Homeowner properties',
  },
  {
    name: 'messages',
    requiredFields: ['id', 'sender_id', 'receiver_id', 'content', 'created_at'],
    description: 'Direct messages between users',
  },
  {
    name: 'message_threads',
    requiredFields: ['id', 'homeowner_id', 'contractor_id', 'created_at'],
    description: 'Message conversation threads',
  },
  {
    name: 'message_reactions',
    requiredFields: ['id', 'message_id', 'user_id', 'emoji', 'created_at'],
    description: 'Emoji reactions on messages',
  },
  {
    name: 'notifications',
    requiredFields: ['id', 'user_id', 'type', 'message', 'is_read', 'created_at'],
    description: 'User notifications',
  },
  {
    name: 'reviews',
    requiredFields: ['id', 'job_id', 'reviewer_id', 'rating', 'created_at'],
    description: 'Job reviews and ratings',
  },
];

// ==========================================================
// VALIDATION FUNCTIONS
// ==========================================================

interface ValidationResult {
  table: string;
  exists: boolean;
  accessible: boolean;
  fields: {
    found: string[];
    missing: string[];
    extra: string[];
  };
  rowCount: number;
  error?: string;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('*').limit(0);
    return !error;
  } catch {
    return false;
  }
}

async function getTableFields(tableName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      // Try to get schema info another way
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: tableName })
        .single();
      
      if (!schemaError && schemaData) {
        return schemaData.columns || [];
      }
      
      return [];
    }
    
    return Object.keys(data[0]);
  } catch (error) {
    console.warn(`⚠️  Could not determine fields for ${tableName}:`, error);
    return [];
  }
}

async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}

async function validateTable(table: TableDefinition): Promise<ValidationResult> {
  const result: ValidationResult = {
    table: table.name,
    exists: false,
    accessible: false,
    fields: {
      found: [],
      missing: [],
      extra: [],
    },
    rowCount: 0,
  };

  try {
    // Check if table exists and is accessible
    result.exists = await checkTableExists(table.name);
    
    if (!result.exists) {
      result.error = 'Table does not exist or is not accessible';
      return result;
    }

    result.accessible = true;

    // Get actual fields
    const actualFields = await getTableFields(table.name);
    result.fields.found = actualFields;

    // Check required fields
    result.fields.missing = table.requiredFields.filter(
      (field) => !actualFields.includes(field)
    );

    // Find extra fields (not required but present)
    result.fields.extra = actualFields.filter(
      (field) => !table.requiredFields.includes(field)
    );

    // Get row count
    result.rowCount = await getTableRowCount(table.name);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// ==========================================================
// MAIN VALIDATION
// ==========================================================

async function validateSchema() {
  console.log('🔍 Starting Schema Validation...\n');
  console.log(`📊 Validating ${tables.length} tables\n`);

  const results: ValidationResult[] = [];

  for (const table of tables) {
    console.log(`Checking ${table.name}...`);
    const result = await validateTable(table);
    results.push(result);

    if (!result.exists) {
      console.log(`  ❌ Table does not exist\n`);
    } else if (result.fields.missing.length > 0) {
      console.log(`  ⚠️  Missing fields: ${result.fields.missing.join(', ')}`);
      console.log(`  ✅ Found ${result.fields.found.length} fields, ${result.rowCount} rows\n`);
    } else {
      console.log(`  ✅ All required fields present`);
      console.log(`  📋 ${result.fields.found.length} fields, ${result.rowCount} rows\n`);
    }
  }

  // Write results to file
  const outputPath = path.join(process.cwd(), 'schema-validation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results written to: ${outputPath}\n`);

  // Summary
  const missingTables = results.filter((r) => !r.exists);
  const missingFields = results.filter((r) => r.fields.missing.length > 0);
  const allValid = results.every((r) => r.exists && r.fields.missing.length === 0);

  console.log('📊 Validation Summary:');
  console.log(`   Total tables: ${tables.length}`);
  console.log(`   ✅ Valid: ${results.length - missingTables.length - missingFields.length}`);
  console.log(`   ❌ Missing tables: ${missingTables.length}`);
  console.log(`   ⚠️  Missing fields: ${missingFields.length}\n`);

  if (missingTables.length > 0) {
    console.log('❌ Missing Tables:');
    missingTables.forEach((r) => {
      console.log(`   - ${r.table}: ${r.error || 'Not found'}`);
    });
    console.log('');
  }

  if (missingFields.length > 0) {
    console.log('⚠️  Tables with Missing Fields:');
    missingFields.forEach((r) => {
      console.log(`   - ${r.table}: ${r.fields.missing.join(', ')}`);
    });
    console.log('');
  }

  if (allValid) {
    console.log('✅ All tables validated successfully!\n');
    process.exit(0);
  } else {
    console.log('❌ Schema validation failed. Please review the results above.\n');
    process.exit(1);
  }
}

// Run validation
validateSchema().catch((error) => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});

