import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Using service role key:', supabaseKey ? 'Yes' : 'No');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMaterialsDatabase() {
  try {
    // Check if table exists and count materials
    const { data, error, count } = await supabase
      .from('materials')
      .select('*', { count: 'exact' })
      .limit(5);

    console.log('\n=== Materials Database Test ===');
    console.log('Total materials:', count);
    console.log('Error:', error);

    if (data && data.length > 0) {
      console.log('\nSample materials:');
      data.forEach((m: any, i: number) => {
        console.log(`${i + 1}. ${m.name} (${m.category}) - £${m.unit_price}/${m.unit}`);
      });
    } else {
      console.log('No materials found in database');
    }

    // Test similarity search
    console.log('\n=== Testing Similarity Search ===');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_materials_similarity', {
        search_query: 'paint',
        match_threshold: 0.3,
        match_limit: 5
      });

    console.log('Search error:', searchError);
    console.log('Search results for "paint":', searchResults?.length || 0);
    if (searchResults && searchResults.length > 0) {
      searchResults.forEach((r: any) => {
        console.log(`  - ${r.name} (similarity: ${r.similarity})`);
      });
    }

  } catch (err) {
    console.error('Test error:', err);
  }
}

testMaterialsDatabase();
