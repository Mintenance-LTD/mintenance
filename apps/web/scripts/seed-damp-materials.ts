/**
 * Seed Damp/Mold Prevention Materials
 * Adds specialty materials for damp proofing and mold prevention
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔧 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const dampMaterials = [
  // Damp Proof Membranes (DPM)
  {
    name: 'Damp Proof Membrane (DPM) 4m x 25m Roll',
    category: 'sealants',
    unit: 'each',
    unit_price: 45.00,
    supplier_name: 'Screwfix',
    sku: 'DPM-4X25-300',
    description: '300 micron polythene damp proof membrane, 4m wide x 25m long (100m²)',
    in_stock: true,
    specifications: {
      thickness: '300 micron',
      coverage: '100m²',
      material: 'Polythene',
      standard: 'BS 6515',
    }
  },
  {
    name: 'Heavy Duty Damp Proof Membrane 1200 Gauge',
    category: 'sealants',
    unit: 'each',
    unit_price: 85.00,
    supplier_name: 'Travis Perkins',
    sku: 'DPM-1200-4X25',
    description: '1200 gauge (300 micron) heavy duty DPM for floors and walls',
    in_stock: true,
    specifications: {
      thickness: '1200 gauge',
      width: '4m',
      length: '25m',
      material: 'Polythene',
    }
  },
  {
    name: 'Damp Proof Course (DPC) 100mm x 20m',
    category: 'sealants',
    unit: 'each',
    unit_price: 12.50,
    supplier_name: 'Wickes',
    sku: 'DPC-100-20M',
    description: 'Flexible DPC for walls, 100mm wide',
    in_stock: true,
    specifications: {
      width: '100mm',
      length: '20m',
      standard: 'BS 6515',
    }
  },
  {
    name: 'Damp Proof Course (DPC) 150mm x 20m',
    category: 'sealants',
    unit: 'each',
    unit_price: 18.00,
    supplier_name: 'Wickes',
    sku: 'DPC-150-20M',
    description: 'Flexible DPC for walls, 150mm wide',
    in_stock: true,
    specifications: {
      width: '150mm',
      length: '20m',
    }
  },

  // Anti-Mold Paints
  {
    name: 'Anti-Mold Paint - White Matt (5L)',
    category: 'paint',
    unit: 'liter',
    unit_price: 9.50,
    supplier_name: 'B&Q',
    sku: 'AMP-WHT-5L',
    description: 'Anti-mold and anti-bacterial matt emulsion paint, 5 liters',
    in_stock: true,
    specifications: {
      coverage: '50-60m² per 5L',
      finish: 'Matt',
      color: 'White',
      features: 'Anti-mold, Anti-bacterial',
    }
  },
  {
    name: 'Anti-Mould Paint - White (2.5L)',
    category: 'paint',
    unit: 'liter',
    unit_price: 11.00,
    supplier_name: 'Screwfix',
    sku: 'RONSEAL-AMP-2.5L',
    description: 'Ronseal Anti-Mould Paint, prevents mold growth',
    in_stock: true,
    specifications: {
      coverage: '30m² per 2.5L',
      finish: 'Matt',
      brand: 'Ronseal',
      drying_time: '2 hours',
    }
  },
  {
    name: 'Dulux Bathroom+ Soft Sheen Paint (2.5L)',
    category: 'paint',
    unit: 'liter',
    unit_price: 13.50,
    supplier_name: 'B&Q',
    sku: 'DULUX-BATH-2.5L',
    description: 'Moisture resistant paint with anti-mold protection',
    in_stock: true,
    specifications: {
      coverage: '30m² per 2.5L',
      finish: 'Soft Sheen',
      brand: 'Dulux',
      features: 'Moisture resistant, Anti-mold',
    }
  },

  // Mold Treatments & Sealants
  {
    name: 'Mould Killer & Remover (1L)',
    category: 'sealants',
    unit: 'liter',
    unit_price: 8.50,
    supplier_name: 'Screwfix',
    sku: 'MK-REMOVER-1L',
    description: 'Professional mould and mildew remover spray',
    in_stock: true,
    specifications: {
      coverage: '10-15m²',
      type: 'Ready-to-use spray',
      active_time: '15 minutes',
    }
  },
  {
    name: 'Damp Seal Paint (2.5L)',
    category: 'paint',
    unit: 'liter',
    unit_price: 16.00,
    supplier_name: 'Wickes',
    sku: 'DAMPSEAL-2.5L',
    description: 'Seals damp patches and prevents staining',
    in_stock: true,
    specifications: {
      coverage: '25m²',
      coats: '2 recommended',
      features: 'Stain blocking, Moisture barrier',
    }
  },
  {
    name: 'Tanking Slurry (5kg)',
    category: 'sealants',
    unit: 'kg',
    unit_price: 4.50,
    supplier_name: 'Travis Perkins',
    sku: 'TANK-SLURRY-5KG',
    description: 'Cementitious waterproof coating for basements and cellars',
    in_stock: true,
    specifications: {
      coverage: '2.5m² at 2mm thickness',
      mixing: 'Add water',
      application: 'Brush or trowel',
    }
  },

  // Ventilation & Moisture Control
  {
    name: 'Air Brick Terracotta 9x3 inch',
    category: 'other',
    unit: 'each',
    unit_price: 2.80,
    supplier_name: 'Jewson',
    sku: 'AIR-BRICK-9X3',
    description: 'Terracotta air brick for wall ventilation',
    in_stock: true,
    specifications: {
      size: '9x3 inch',
      material: 'Terracotta',
      purpose: 'Ventilation',
    }
  },
  {
    name: 'Damp Proof Paint Additive (1L)',
    category: 'paint',
    unit: 'liter',
    unit_price: 12.00,
    supplier_name: 'B&Q',
    sku: 'DPP-ADDITIVE-1L',
    description: 'Add to any paint to make it moisture resistant',
    in_stock: true,
    specifications: {
      coverage: 'Treats 5L of paint',
      type: 'Additive',
      features: 'Anti-mold, Moisture resistant',
    }
  },
];

async function seedDampMaterials() {
  console.log('\n📦 Seeding Damp/Mold Prevention Materials...\n');

  try {
    // Check existing materials first
    const { data: existing } = await supabase
      .from('materials')
      .select('name')
      .in('category', ['sealants', 'paint', 'other'])
      .ilike('name', '%damp%')
      .or('name.ilike.%mold%,name.ilike.%mould%');

    console.log(`Found ${existing?.length || 0} existing damp/mold materials`);

    // Insert materials
    let insertedCount = 0;
    let skippedCount = 0;

    for (const material of dampMaterials) {
      // Check if already exists
      const alreadyExists = existing?.some(e =>
        e.name.toLowerCase() === material.name.toLowerCase()
      );

      if (alreadyExists) {
        console.log(`⏭️  Skipping: ${material.name} (already exists)`);
        skippedCount++;
        continue;
      }

      const { data, error } = await supabase
        .from('materials')
        .insert([material])
        .select();

      if (error) {
        console.error(`❌ Error inserting ${material.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${material.name} - £${material.unit_price}/${material.unit}`);
        insertedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Seeding Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Inserted: ${insertedCount} materials`);
    console.log(`⏭️  Skipped: ${skippedCount} materials (already exist)`);
    console.log(`📦 Total in batch: ${dampMaterials.length} materials`);

    // Verify total count
    const { count } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true });

    console.log(`\n🗄️  Total materials in database: ${count}`);

    // Show sample searches
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Testing Searches:');
    console.log('='.repeat(60));

    const testSearches = [
      'damp proof membrane',
      'anti-mold paint',
      'damp proof course',
      'mould killer',
    ];

    for (const query of testSearches) {
      const { data: results } = await supabase
        .from('materials')
        .select('name, unit_price, unit')
        .ilike('name', `%${query}%`)
        .limit(3);

      console.log(`\n"${query}": ${results?.length || 0} matches`);
      if (results && results.length > 0) {
        results.forEach(r => {
          console.log(`  • ${r.name} - £${r.unit_price}/${r.unit}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDampMaterials()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
