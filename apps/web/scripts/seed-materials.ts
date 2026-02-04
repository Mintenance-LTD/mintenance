import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const materials = [
  // LUMBER - Timber & Wood Products
  {
    name: '2x4 Timber (4.8m)',
    category: 'lumber',
    description: 'Sawn softwood timber, kiln dried, regularised',
    unit_price: 8.50,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 7.50,
    sku: 'LBR-2X4-48',
    brand: 'Jewson',
    in_stock: true,
    stock_quantity: 450,
    lead_time_days: 0,
    specifications: { length: '4.8m', width: '47mm', depth: '100mm', treatment: 'kiln dried' },
    supplier_name: 'Jewson'
  },
  {
    name: '4x4 Timber Post (2.4m)',
    category: 'lumber',
    description: 'Pressure treated fence post',
    unit_price: 15.00,
    unit: 'each',
    bulk_quantity: 10,
    bulk_unit_price: 13.50,
    sku: 'LBR-4X4-24',
    brand: 'Wickes',
    in_stock: true,
    stock_quantity: 200,
    lead_time_days: 0,
    specifications: { length: '2.4m', width: '100mm', depth: '100mm', treatment: 'pressure treated' },
    supplier_name: 'Wickes'
  },
  {
    name: '18mm Plywood Sheet (2440x1220mm)',
    category: 'lumber',
    description: 'Hardwood faced plywood, structural grade',
    unit_price: 42.00,
    unit: 'sheet',
    bulk_quantity: 10,
    bulk_unit_price: 38.00,
    sku: 'LBR-PLY-18',
    brand: 'Travis Perkins',
    in_stock: true,
    stock_quantity: 120,
    lead_time_days: 0,
    specifications: { thickness: '18mm', width: '1220mm', length: '2440mm', grade: 'structural' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: '12mm MDF Sheet (2440x1220mm)',
    category: 'lumber',
    description: 'Medium density fibreboard, smooth finish',
    unit_price: 28.00,
    unit: 'sheet',
    bulk_quantity: 10,
    bulk_unit_price: 25.00,
    sku: 'LBR-MDF-12',
    brand: 'B&Q',
    in_stock: true,
    stock_quantity: 85,
    lead_time_days: 0,
    specifications: { thickness: '12mm', width: '1220mm', length: '2440mm', finish: 'smooth' },
    supplier_name: 'B&Q'
  },

  // CONCRETE - Cement, Sand, Aggregates
  {
    name: 'General Purpose Cement (25kg)',
    category: 'concrete',
    description: 'Portland cement, suitable for all general building work',
    unit_price: 6.50,
    unit: 'kg',
    bulk_quantity: 100,
    bulk_unit_price: 5.80,
    sku: 'CNC-CEM-25',
    brand: 'Blue Circle',
    in_stock: true,
    stock_quantity: 600,
    lead_time_days: 0,
    specifications: { weight: '25kg', type: 'Portland cement', grade: 'CEM I' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Building Sand (Bulk Bag)',
    category: 'concrete',
    description: 'Washed building sand, 850kg bulk bag',
    unit_price: 85.00,
    unit: 'bundle',
    bulk_quantity: 5,
    bulk_unit_price: 75.00,
    sku: 'CNC-SND-BB',
    brand: 'Jewson',
    in_stock: true,
    stock_quantity: 45,
    lead_time_days: 1,
    specifications: { weight: '850kg', type: 'washed building sand', moisture: 'air dried' },
    supplier_name: 'Jewson'
  },
  {
    name: '20mm Gravel Aggregate (Bulk Bag)',
    category: 'concrete',
    description: 'Clean gravel aggregate, 850kg bulk bag',
    unit_price: 90.00,
    unit: 'bundle',
    bulk_quantity: 5,
    bulk_unit_price: 80.00,
    sku: 'CNC-GRV-20',
    brand: 'Wickes',
    in_stock: true,
    stock_quantity: 38,
    lead_time_days: 1,
    specifications: { weight: '850kg', size: '20mm', type: 'clean gravel' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Concrete Mix (25kg)',
    category: 'concrete',
    description: 'Ready-mixed concrete, just add water',
    unit_price: 4.20,
    unit: 'kg',
    bulk_quantity: 50,
    bulk_unit_price: 3.80,
    sku: 'CNC-MIX-25',
    brand: 'Wickes',
    in_stock: true,
    stock_quantity: 320,
    lead_time_days: 0,
    specifications: { weight: '25kg', type: 'ready-mixed', strength: 'C20' },
    supplier_name: 'Wickes'
  },

  // BRICK - Bricks, Blocks, Mortar
  {
    name: 'London Brick (per brick)',
    category: 'brick',
    description: 'Standard red facing brick, 65mm',
    unit_price: 0.65,
    unit: 'each',
    bulk_quantity: 500,
    bulk_unit_price: 0.55,
    sku: 'BRK-LON-RED',
    brand: 'London Brick Company',
    in_stock: true,
    stock_quantity: 15000,
    lead_time_days: 0,
    specifications: { length: '215mm', width: '102.5mm', height: '65mm', color: 'red' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Concrete Block (440x215x100mm)',
    category: 'brick',
    description: 'Solid concrete block, standard density',
    unit_price: 1.85,
    unit: 'each',
    bulk_quantity: 100,
    bulk_unit_price: 1.65,
    sku: 'BRK-BLK-STD',
    brand: 'Jewson',
    in_stock: true,
    stock_quantity: 2400,
    lead_time_days: 0,
    specifications: { length: '440mm', width: '100mm', height: '215mm', density: 'standard' },
    supplier_name: 'Jewson'
  },
  {
    name: 'Mortar Mix (25kg)',
    category: 'brick',
    description: 'Pre-mixed mortar, just add water',
    unit_price: 5.50,
    unit: 'kg',
    bulk_quantity: 40,
    bulk_unit_price: 4.90,
    sku: 'BRK-MRT-25',
    brand: 'Blue Circle',
    in_stock: true,
    stock_quantity: 280,
    lead_time_days: 0,
    specifications: { weight: '25kg', type: 'general purpose', mix: '4:1' },
    supplier_name: 'Wickes'
  },

  // TILE - Ceramic, Porcelain, Adhesive
  {
    name: 'White Ceramic Wall Tile (200x200mm)',
    category: 'tile',
    description: 'Gloss white ceramic tiles, per sqm',
    unit_price: 18.00,
    unit: 'sqm',
    bulk_quantity: 20,
    bulk_unit_price: 16.00,
    sku: 'TLE-CER-WHT',
    brand: 'B&Q',
    in_stock: true,
    stock_quantity: 150,
    lead_time_days: 0,
    specifications: { size: '200x200mm', finish: 'gloss', material: 'ceramic', color: 'white' },
    supplier_name: 'B&Q'
  },
  {
    name: 'Porcelain Floor Tile (600x600mm)',
    category: 'tile',
    description: 'Grey porcelain floor tiles, per sqm',
    unit_price: 35.00,
    unit: 'sqm',
    bulk_quantity: 15,
    bulk_unit_price: 32.00,
    sku: 'TLE-POR-GRY',
    brand: 'Topps Tiles',
    in_stock: true,
    stock_quantity: 95,
    lead_time_days: 2,
    specifications: { size: '600x600mm', finish: 'matt', material: 'porcelain', color: 'grey' },
    supplier_name: 'Topps Tiles'
  },
  {
    name: 'Tile Adhesive (20kg)',
    category: 'tile',
    description: 'Flexible tile adhesive for walls and floors',
    unit_price: 22.00,
    unit: 'kg',
    bulk_quantity: 10,
    bulk_unit_price: 19.50,
    sku: 'TLE-ADH-20',
    brand: 'BAL',
    in_stock: true,
    stock_quantity: 180,
    lead_time_days: 0,
    specifications: { weight: '20kg', type: 'flexible', coverage: '4-5sqm' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Tile Grout (5kg)',
    category: 'tile',
    description: 'Waterproof tile grout, white',
    unit_price: 12.00,
    unit: 'kg',
    bulk_quantity: 10,
    bulk_unit_price: 10.50,
    sku: 'TLE-GRT-WHT',
    brand: 'BAL',
    in_stock: true,
    stock_quantity: 220,
    lead_time_days: 0,
    specifications: { weight: '5kg', color: 'white', waterproof: true, coverage: '8-10sqm' },
    supplier_name: 'Screwfix'
  },

  // INSULATION - Loft, Cavity Wall, Pipe
  {
    name: 'Loft Insulation Roll (100mm)',
    category: 'insulation',
    description: 'Glass mineral wool, 100mm thickness, 8.3sqm roll',
    unit_price: 24.00,
    unit: 'sqm',
    bulk_quantity: 50,
    bulk_unit_price: 21.00,
    sku: 'INS-LFT-100',
    brand: 'Knauf',
    in_stock: true,
    stock_quantity: 125,
    lead_time_days: 0,
    specifications: { thickness: '100mm', material: 'glass mineral wool', coverage: '8.3sqm' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Cavity Wall Insulation Batts (100mm)',
    category: 'insulation',
    description: 'PIR cavity wall insulation, per sqm',
    unit_price: 32.00,
    unit: 'sqm',
    bulk_quantity: 30,
    bulk_unit_price: 29.00,
    sku: 'INS-CAV-100',
    brand: 'Celotex',
    in_stock: true,
    stock_quantity: 85,
    lead_time_days: 1,
    specifications: { thickness: '100mm', material: 'PIR', r_value: '4.5' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Pipe Insulation Foam (22mm)',
    category: 'insulation',
    description: 'Foam pipe insulation, 22mm bore, per meter',
    unit_price: 1.20,
    unit: 'meter',
    bulk_quantity: 50,
    bulk_unit_price: 1.00,
    sku: 'INS-PPE-22',
    brand: 'Climaflex',
    in_stock: true,
    stock_quantity: 450,
    lead_time_days: 0,
    specifications: { bore: '22mm', material: 'foam', thickness: '9mm' },
    supplier_name: 'Screwfix'
  },

  // DRYWALL - Plasterboard, Joint Compound
  {
    name: 'Plasterboard Sheet (2400x1200x12.5mm)',
    category: 'drywall',
    description: 'Standard plasterboard, tapered edge',
    unit_price: 8.50,
    unit: 'sheet',
    bulk_quantity: 30,
    bulk_unit_price: 7.50,
    sku: 'DRY-PLB-STD',
    brand: 'British Gypsum',
    in_stock: true,
    stock_quantity: 240,
    lead_time_days: 0,
    specifications: { width: '1200mm', length: '2400mm', thickness: '12.5mm', edge: 'tapered' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Joint Compound (12.5kg)',
    category: 'drywall',
    description: 'Ready-mixed joint compound for filling and finishing',
    unit_price: 11.00,
    unit: 'kg',
    bulk_quantity: 10,
    bulk_unit_price: 9.50,
    sku: 'DRY-JNT-125',
    brand: 'British Gypsum',
    in_stock: true,
    stock_quantity: 165,
    lead_time_days: 0,
    specifications: { weight: '12.5kg', type: 'ready-mixed', drying_time: '2-4 hours' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Plasterboard Beading (3m)',
    category: 'drywall',
    description: 'Metal corner beading for plasterboard edges',
    unit_price: 1.80,
    unit: 'meter',
    bulk_quantity: 50,
    bulk_unit_price: 1.50,
    sku: 'DRY-BED-3M',
    brand: 'British Gypsum',
    in_stock: true,
    stock_quantity: 320,
    lead_time_days: 0,
    specifications: { length: '3m', material: 'galvanized steel', type: 'corner bead' },
    supplier_name: 'Screwfix'
  },

  // PAINT - Emulsion, Masonry, Primer
  {
    name: 'Matt Emulsion Paint - White (10L)',
    category: 'paint',
    description: 'Interior matt emulsion, brilliant white',
    unit_price: 35.00,
    unit: 'liter',
    bulk_quantity: 5,
    bulk_unit_price: 32.00,
    sku: 'PNT-EMU-WHT',
    brand: 'Dulux',
    in_stock: true,
    stock_quantity: 145,
    lead_time_days: 0,
    specifications: { volume: '10L', finish: 'matt', color: 'brilliant white', coverage: '14sqm/L' },
    supplier_name: 'B&Q'
  },
  {
    name: 'Masonry Paint - White (10L)',
    category: 'paint',
    description: 'Exterior masonry paint, weather resistant',
    unit_price: 45.00,
    unit: 'liter',
    bulk_quantity: 5,
    bulk_unit_price: 42.00,
    sku: 'PNT-MAS-WHT',
    brand: 'Sandtex',
    in_stock: true,
    stock_quantity: 98,
    lead_time_days: 0,
    specifications: { volume: '10L', finish: 'textured', color: 'white', coverage: '8sqm/L' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Wood Primer/Undercoat (2.5L)',
    category: 'paint',
    description: 'Oil-based wood primer and undercoat',
    unit_price: 22.00,
    unit: 'liter',
    bulk_quantity: 5,
    bulk_unit_price: 19.50,
    sku: 'PNT-PRM-WD',
    brand: 'Dulux',
    in_stock: true,
    stock_quantity: 112,
    lead_time_days: 0,
    specifications: { volume: '2.5L', base: 'oil-based', color: 'white', coverage: '12sqm/L' },
    supplier_name: 'B&Q'
  },
  {
    name: 'Gloss Paint - White (2.5L)',
    category: 'paint',
    description: 'High gloss finish for wood and metal',
    unit_price: 28.00,
    unit: 'liter',
    bulk_quantity: 5,
    bulk_unit_price: 25.00,
    sku: 'PNT-GLS-WHT',
    brand: 'Dulux',
    in_stock: true,
    stock_quantity: 135,
    lead_time_days: 0,
    specifications: { volume: '2.5L', finish: 'gloss', color: 'brilliant white', coverage: '17sqm/L' },
    supplier_name: 'Screwfix'
  },

  // ROOFING - Tiles, Felt, Ridge, Flashing
  {
    name: 'Concrete Roof Tile',
    category: 'roofing',
    description: 'Redland concrete roof tile, smooth grey',
    unit_price: 1.85,
    unit: 'each',
    bulk_quantity: 100,
    bulk_unit_price: 1.65,
    sku: 'RFG-TLE-CON',
    brand: 'Redland',
    in_stock: true,
    stock_quantity: 2800,
    lead_time_days: 3,
    specifications: { material: 'concrete', color: 'smooth grey', coverage: '10 per sqm' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Roofing Felt (10m Roll)',
    category: 'roofing',
    description: 'Type 1F roofing felt, 10m x 1m roll',
    unit_price: 18.00,
    unit: 'meter',
    bulk_quantity: 10,
    bulk_unit_price: 16.00,
    sku: 'RFG-FLT-1F',
    brand: 'IKO',
    in_stock: true,
    stock_quantity: 85,
    lead_time_days: 0,
    specifications: { length: '10m', width: '1m', type: '1F', weight: '14kg' },
    supplier_name: 'Jewson'
  },
  {
    name: 'Ridge Tile',
    category: 'roofing',
    description: 'Angled ridge tile for roof apex',
    unit_price: 8.50,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 7.50,
    sku: 'RFG-RDG-ANG',
    brand: 'Redland',
    in_stock: true,
    stock_quantity: 245,
    lead_time_days: 3,
    specifications: { material: 'concrete', color: 'grey', length: '450mm' },
    supplier_name: 'Travis Perkins'
  },
  {
    name: 'Lead Flashing (Code 4, 150mm)',
    category: 'roofing',
    description: 'Lead flashing roll, Code 4, 150mm wide',
    unit_price: 45.00,
    unit: 'meter',
    bulk_quantity: 10,
    bulk_unit_price: 42.00,
    sku: 'RFG-FLS-LD4',
    brand: 'Associated Lead',
    in_stock: true,
    stock_quantity: 65,
    lead_time_days: 2,
    specifications: { code: '4', width: '150mm', material: 'lead', weight: '1.8kg/m' },
    supplier_name: 'Jewson'
  },

  // PLUMBING - Pipes, Fittings, Radiators
  {
    name: '15mm Copper Pipe (3m)',
    category: 'plumbing',
    description: 'Half-hard copper pipe, 15mm diameter',
    unit_price: 12.50,
    unit: 'meter',
    bulk_quantity: 20,
    bulk_unit_price: 11.00,
    sku: 'PLM-CPR-15',
    brand: 'Yorkshire',
    in_stock: true,
    stock_quantity: 280,
    lead_time_days: 0,
    specifications: { diameter: '15mm', material: 'copper', length: '3m', grade: 'half-hard' },
    supplier_name: 'Screwfix'
  },
  {
    name: '22mm Copper Pipe (3m)',
    category: 'plumbing',
    description: 'Half-hard copper pipe, 22mm diameter',
    unit_price: 18.50,
    unit: 'meter',
    bulk_quantity: 20,
    bulk_unit_price: 16.50,
    sku: 'PLM-CPR-22',
    brand: 'Yorkshire',
    in_stock: true,
    stock_quantity: 210,
    lead_time_days: 0,
    specifications: { diameter: '22mm', material: 'copper', length: '3m', grade: 'half-hard' },
    supplier_name: 'Screwfix'
  },
  {
    name: '40mm PVC Waste Pipe (3m)',
    category: 'plumbing',
    description: 'White PVC waste pipe for sinks and basins',
    unit_price: 5.50,
    unit: 'meter',
    bulk_quantity: 20,
    bulk_unit_price: 4.80,
    sku: 'PLM-PVC-40',
    brand: 'Floplast',
    in_stock: true,
    stock_quantity: 340,
    lead_time_days: 0,
    specifications: { diameter: '40mm', material: 'PVC', color: 'white', length: '3m' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Compression Fitting 15mm Elbow',
    category: 'plumbing',
    description: 'Brass compression elbow fitting, 15mm',
    unit_price: 2.20,
    unit: 'each',
    bulk_quantity: 50,
    bulk_unit_price: 1.90,
    sku: 'PLM-FIT-15E',
    brand: 'Conex',
    in_stock: true,
    stock_quantity: 520,
    lead_time_days: 0,
    specifications: { diameter: '15mm', material: 'brass', type: 'elbow', angle: '90 degrees' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Single Panel Radiator (600x1000mm)',
    category: 'plumbing',
    description: 'Type 11 single panel radiator with brackets',
    unit_price: 85.00,
    unit: 'each',
    bulk_quantity: 5,
    bulk_unit_price: 78.00,
    sku: 'PLM-RAD-11',
    brand: 'Stelrad',
    in_stock: true,
    stock_quantity: 45,
    lead_time_days: 2,
    specifications: { height: '600mm', width: '1000mm', type: '11', output: '1200 BTU' },
    supplier_name: 'Wickes'
  },
  {
    name: 'Mixer Tap (Chrome)',
    category: 'plumbing',
    description: 'Basin mixer tap, chrome finish',
    unit_price: 45.00,
    unit: 'each',
    bulk_quantity: 5,
    bulk_unit_price: 40.00,
    sku: 'PLM-TAP-MIX',
    brand: 'Bristan',
    in_stock: true,
    stock_quantity: 78,
    lead_time_days: 1,
    specifications: { finish: 'chrome', type: 'mixer', spout_reach: '120mm' },
    supplier_name: 'B&Q'
  },

  // ELECTRICAL - Cable, Sockets, Switches
  {
    name: '2.5mm Twin & Earth Cable (100m)',
    category: 'electrical',
    description: 'Electrical cable for ring mains and sockets',
    unit_price: 95.00,
    unit: 'meter',
    bulk_quantity: 3,
    bulk_unit_price: 88.00,
    sku: 'ELE-CBL-25',
    brand: 'Prysmian',
    in_stock: true,
    stock_quantity: 65,
    lead_time_days: 0,
    specifications: { size: '2.5mm', type: 'twin & earth', length: '100m', cores: '2 + earth' },
    supplier_name: 'Screwfix'
  },
  {
    name: '1.5mm Twin & Earth Cable (100m)',
    category: 'electrical',
    description: 'Electrical cable for lighting circuits',
    unit_price: 55.00,
    unit: 'meter',
    bulk_quantity: 3,
    bulk_unit_price: 50.00,
    sku: 'ELE-CBL-15',
    brand: 'Prysmian',
    in_stock: true,
    stock_quantity: 82,
    lead_time_days: 0,
    specifications: { size: '1.5mm', type: 'twin & earth', length: '100m', cores: '2 + earth' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Double Socket Outlet (White)',
    category: 'electrical',
    description: '13A double socket, switched, white plastic',
    unit_price: 3.50,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 3.00,
    sku: 'ELE-SCK-DBL',
    brand: 'MK Electric',
    in_stock: true,
    stock_quantity: 420,
    lead_time_days: 0,
    specifications: { rating: '13A', type: 'double', color: 'white', switched: true },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Light Switch (1-Gang)',
    category: 'electrical',
    description: 'Single gang light switch, white plastic',
    unit_price: 2.20,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 1.90,
    sku: 'ELE-SWT-1G',
    brand: 'MK Electric',
    in_stock: true,
    stock_quantity: 380,
    lead_time_days: 0,
    specifications: { gangs: '1', type: 'rocker', color: 'white', rating: '10A' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Consumer Unit (12-Way)',
    category: 'electrical',
    description: '12-way split-load consumer unit with RCDs',
    unit_price: 145.00,
    unit: 'each',
    bulk_quantity: 3,
    bulk_unit_price: 135.00,
    sku: 'ELE-CU-12W',
    brand: 'Hager',
    in_stock: true,
    stock_quantity: 28,
    lead_time_days: 2,
    specifications: { ways: '12', type: 'split-load', rcd: 'dual 63A', rating: '100A' },
    supplier_name: 'Screwfix'
  },

  // HARDWARE - Screws, Nails, Brackets, Hinges
  {
    name: 'Wood Screws (4x40mm, Box of 200)',
    category: 'hardware',
    description: 'Pozi drive wood screws, zinc plated',
    unit_price: 5.50,
    unit: 'box',
    bulk_quantity: 10,
    bulk_unit_price: 4.80,
    sku: 'HRD-SCW-440',
    brand: 'Screwfix',
    in_stock: true,
    stock_quantity: 285,
    lead_time_days: 0,
    specifications: { size: '4x40mm', type: 'wood screw', drive: 'pozi', finish: 'zinc plated' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Masonry Nails (75mm, Box of 100)',
    category: 'hardware',
    description: 'Hardened steel masonry nails',
    unit_price: 4.20,
    unit: 'box',
    bulk_quantity: 10,
    bulk_unit_price: 3.70,
    sku: 'HRD-NL-75',
    brand: 'Screwfix',
    in_stock: true,
    stock_quantity: 220,
    lead_time_days: 0,
    specifications: { length: '75mm', type: 'masonry nail', material: 'hardened steel' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Angle Bracket (100mm, Zinc)',
    category: 'hardware',
    description: 'Right angle fixing bracket, zinc plated',
    unit_price: 1.80,
    unit: 'each',
    bulk_quantity: 50,
    bulk_unit_price: 1.50,
    sku: 'HRD-BRK-100',
    brand: 'Screwfix',
    in_stock: true,
    stock_quantity: 540,
    lead_time_days: 0,
    specifications: { size: '100mm', material: 'steel', finish: 'zinc plated', angle: '90 degrees' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Butt Hinge (75mm, Brass)',
    category: 'hardware',
    description: 'Solid brass butt hinge with screws',
    unit_price: 3.20,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 2.80,
    sku: 'HRD-HNG-75',
    brand: 'B&Q',
    in_stock: true,
    stock_quantity: 310,
    lead_time_days: 0,
    specifications: { size: '75mm', material: 'brass', type: 'butt hinge', screws_included: true },
    supplier_name: 'B&Q'
  },

  // GLASS - Windows, Double Glazing
  {
    name: 'uPVC Window (900x1200mm)',
    category: 'glass',
    description: 'Double glazed uPVC casement window',
    unit_price: 285.00,
    unit: 'each',
    bulk_quantity: 5,
    bulk_unit_price: 265.00,
    sku: 'GLS-WIN-912',
    brand: 'Anglian',
    in_stock: true,
    stock_quantity: 18,
    lead_time_days: 7,
    specifications: { width: '900mm', height: '1200mm', glazing: 'double', material: 'uPVC' },
    supplier_name: 'Anglian'
  },
  {
    name: 'Mirror Tile (300x300mm)',
    category: 'glass',
    description: 'Adhesive backed mirror tile',
    unit_price: 8.50,
    unit: 'each',
    bulk_quantity: 10,
    bulk_unit_price: 7.50,
    sku: 'GLS-MIR-33',
    brand: 'B&Q',
    in_stock: true,
    stock_quantity: 145,
    lead_time_days: 0,
    specifications: { width: '300mm', height: '300mm', thickness: '4mm', backing: 'adhesive' },
    supplier_name: 'B&Q'
  },

  // SEALANTS - Silicone, Mastic, Foam
  {
    name: 'Silicone Sealant (Clear, 310ml)',
    category: 'sealants',
    description: 'Waterproof clear silicone sealant',
    unit_price: 4.50,
    unit: 'each',
    bulk_quantity: 12,
    bulk_unit_price: 3.80,
    sku: 'SEL-SIL-CLR',
    brand: 'Everbuild',
    in_stock: true,
    stock_quantity: 340,
    lead_time_days: 0,
    specifications: { volume: '310ml', color: 'clear', type: 'silicone', waterproof: true },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Decorators Caulk (White, 310ml)',
    category: 'sealants',
    description: 'Acrylic caulk for filling cracks, paintable',
    unit_price: 3.20,
    unit: 'each',
    bulk_quantity: 12,
    bulk_unit_price: 2.80,
    sku: 'SEL-CLK-WHT',
    brand: 'No Nonsense',
    in_stock: true,
    stock_quantity: 420,
    lead_time_days: 0,
    specifications: { volume: '310ml', color: 'white', type: 'acrylic', paintable: true },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Expanding Foam (750ml)',
    category: 'sealants',
    description: 'Polyurethane expanding foam filler',
    unit_price: 8.50,
    unit: 'each',
    bulk_quantity: 10,
    bulk_unit_price: 7.50,
    sku: 'SEL-FOM-750',
    brand: 'Everbuild',
    in_stock: true,
    stock_quantity: 185,
    lead_time_days: 0,
    specifications: { volume: '750ml', type: 'polyurethane', expansion: '35L yield' },
    supplier_name: 'Screwfix'
  },

  // FASTENERS - Bolts, Wall Plugs, Anchors
  {
    name: 'Rawl Plugs (Red, Box of 100)',
    category: 'fasteners',
    description: 'Red wall plugs for 4-8mm screws',
    unit_price: 2.50,
    unit: 'box',
    bulk_quantity: 10,
    bulk_unit_price: 2.00,
    sku: 'FST-PLG-RED',
    brand: 'Rawlplug',
    in_stock: true,
    stock_quantity: 380,
    lead_time_days: 0,
    specifications: { color: 'red', screw_size: '4-8mm', material: 'nylon', quantity: '100' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Coach Bolt (M10x80mm, Pack of 10)',
    category: 'fasteners',
    description: 'Hex head coach bolt with nut and washer',
    unit_price: 4.80,
    unit: 'bundle',
    bulk_quantity: 10,
    bulk_unit_price: 4.20,
    sku: 'FST-BLT-M10',
    brand: 'Timco',
    in_stock: true,
    stock_quantity: 245,
    lead_time_days: 0,
    specifications: { size: 'M10x80mm', type: 'coach bolt', material: 'steel', quantity: '10' },
    supplier_name: 'Screwfix'
  },
  {
    name: 'Heavy Duty Anchor (M12x100mm)',
    category: 'fasteners',
    description: 'Through-bolt anchor for heavy loads',
    unit_price: 3.50,
    unit: 'each',
    bulk_quantity: 20,
    bulk_unit_price: 3.00,
    sku: 'FST-ANC-M12',
    brand: 'Fischer',
    in_stock: true,
    stock_quantity: 180,
    lead_time_days: 0,
    specifications: { size: 'M12x100mm', type: 'through-bolt', load: 'heavy duty', material: 'steel' },
    supplier_name: 'Screwfix'
  }
];

async function seedMaterials() {
  console.log('🌱 Starting materials seed...');

  try {
    // Insert materials
    const { data, error } = await supabase
      .from('materials')
      .insert(materials)
      .select();

    if (error) {
      console.error('❌ Error seeding materials:', error);
      throw error;
    }

    console.log(`✅ Successfully seeded ${data?.length || 0} materials`);
    console.log('\n📊 Materials by category:');

    // Count by category
    const categoryCounts: Record<string, number> = {};
    materials.forEach(m => {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} items`);
    });

    console.log('\n✨ Materials database ready!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedMaterials();
