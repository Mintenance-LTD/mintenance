import { MaterialsService } from './lib/services/MaterialsService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const service = new MaterialsService();

async function testSearch() {
  console.log('=== Testing Material Search ===\n');

  const searches = [
    'damp proof membrane',
    'anti-mold paint',
    'timber',
    'paint',
    'plasterboard',
    'cement'
  ];

  for (const query of searches) {
    const results = await service.findSimilarMaterials(query, { limit: 3 });
    console.log(`Search: "${query}"`);
    console.log(`  Results: ${results.length}`);
    if (results.length > 0) {
      results.forEach(r => {
        console.log(`  - ${r.name} (similarity: ${r.similarity.toFixed(2)})`);
      });
    } else {
      console.log('  - No matches found');
    }
    console.log('');
  }
}

testSearch();
