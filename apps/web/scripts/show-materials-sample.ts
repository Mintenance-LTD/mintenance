import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function showMaterialsSample() {
  const categories = ['lumber', 'paint', 'plumbing', 'electrical', 'tile'];

  console.log('📦 Materials Database Sample:\n');

  for (const category of categories) {
    const { data } = await supabase
      .from('materials')
      .select('name, unit_price, unit, supplier_name, in_stock')
      .eq('category', category)
      .limit(2);

    if (data && data.length > 0) {
      console.log(`${category.toUpperCase()}:`);
      data.forEach(m => {
        const price = '£' + m.unit_price.toFixed(2);
        const stock = m.in_stock ? '✓' : '✗';
        console.log(`  [${stock}] ${m.name} - ${price}/${m.unit} (${m.supplier_name})`);
      });
      console.log('');
    }
  }

  const { count } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true });

  console.log(`Total materials in database: ${count}\n`);
}

showMaterialsSample();
