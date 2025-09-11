const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseSchema() {
  console.log('Checking Supabase Database Schema\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials not configured.');
    console.log('Set SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_* equivalents) and retry.');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Connected to Supabase');
    console.log(`Project: ${supabaseUrl}`);
    console.log('');

    console.log('Checking table access...');
    const expectedTables = ['users', 'jobs', 'bids', 'escrow_transactions'];
    for (const tableName of expectedTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        if (error) {
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log(`Table '${tableName}' does not exist`);
          } else if (error.message.includes('permission denied')) {
            console.log(`Table '${tableName}' exists (RLS enabled)`);
          } else {
            console.log(`Table '${tableName}' error: ${error.message}`);
          }
        } else {
          console.log(`Table '${tableName}' exists and accessible`);
        }
      } catch (err) {
        console.log(`Table '${tableName}' test failed: ${err.message}`);
      }
    }

    console.log('\nSummary:');
    console.log('Your Supabase project is accessible');
    console.log('To set up the database schema:');
    console.log('1. Go to SQL Editor in your Supabase dashboard');
    console.log('2. Run the script in supabase-setup.sql');
    console.log('3. Verify tables in Table Editor');
  } catch (error) {
    console.log('Database check failed:');
    console.log(`Error: ${error.message}`);
  }
}

checkDatabaseSchema();

