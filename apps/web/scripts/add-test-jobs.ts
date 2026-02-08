/**
 * Script to add test jobs with real London addresses for map testing
 * Run with: npx tsx scripts/add-test-jobs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ukrjudtlvapiajkjbcrd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testJobs = [
  {
    title: 'Fix Leaking Kitchen Tap',
    description: 'My kitchen tap has been leaking for the past week. Water is dripping constantly and it needs urgent attention. The tap is a mixer tap and might need new washers or complete replacement.',
    location: '10 Downing Street, Westminster, London SW1A 2AA',
    category: 'plumbing',
    budget: 150,
    status: 'posted',
    required_skills: ['plumbing', 'emergency repairs'],
  },
  {
    title: 'Paint Living Room Walls',
    description: 'Need to repaint living room walls (approximately 40 square meters). Current paint is peeling in some areas. Looking for professional finish with high-quality paint. Room needs to be prepared, primed and painted.',
    location: 'Buckingham Palace, London SW1A 1AA',
    category: 'painting',
    budget: 800,
    status: 'posted',
    required_skills: ['painting', 'decorating'],
  },
  {
    title: 'Install New Light Fixtures',
    description: 'Replace 3 ceiling light fixtures in bedrooms and install dimmer switches. All electrical work must be certified. Fixtures already purchased, just need installation.',
    location: 'Tower Bridge, Tower Bridge Road, London SE1 2UP',
    category: 'electrical',
    budget: 350,
    status: 'posted',
    required_skills: ['electrical', 'lighting'],
  },
  {
    title: 'Repair Broken Fence Panels',
    description: 'Storm damage has broken 4 fence panels in back garden. Panels are 6ft high. Need removal of damaged panels and installation of new ones. Materials can be sourced by contractor.',
    location: 'Hyde Park, London W2 2UH',
    category: 'carpentry',
    budget: 450,
    status: 'posted',
    required_skills: ['carpentry', 'outdoor work'],
  },
  {
    title: 'Unblock Bathroom Drain',
    description: 'Bathroom sink and shower drain are running very slowly. Tried basic drain cleaner but no improvement. May need professional drain cleaning equipment.',
    location: 'The O2 Arena, Peninsula Square, London SE10 0DX',
    category: 'plumbing',
    budget: 120,
    status: 'posted',
    required_skills: ['plumbing', 'drain cleaning'],
  },
  {
    title: 'Install Smart Thermostat',
    description: 'Want to upgrade from traditional thermostat to Nest or similar smart thermostat. Need proper installation and setup with existing boiler system.',
    location: 'Wembley Stadium, London HA9 0WS',
    category: 'hvac',
    budget: 250,
    status: 'posted',
    required_skills: ['hvac', 'smart home'],
  },
  {
    title: 'Tile Bathroom Floor',
    description: 'Small bathroom (3m x 2m) needs new floor tiles. Old tiles need to be removed, floor prepared and new tiles installed with proper waterproofing.',
    location: 'Camden Market, Camden High Street, London NW1 8AF',
    category: 'tiling',
    budget: 600,
    status: 'posted',
    required_skills: ['tiling', 'flooring'],
  },
  {
    title: 'Fix Squeaky Floorboards',
    description: 'Several floorboards in hallway and main bedroom are squeaking badly. Need to be secured properly or replaced if damaged.',
    location: 'Covent Garden, London WC2E 8RF',
    category: 'carpentry',
    budget: 200,
    status: 'posted',
    required_skills: ['carpentry', 'flooring'],
  },
];

async function addTestJobs() {
  // console.log('🚀 Adding test jobs to database...\n');

  // First, get a homeowner user to assign the jobs to
  const { data: homeowners, error: homeownerError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('role', 'homeowner')
    .limit(1);

  if (homeownerError || !homeowners || homeowners.length === 0) {
    console.error('❌ No homeowner found in database. Please create a homeowner account first.');
    return;
  }

  const homeowner = homeowners[0];
  // console.log(`✅ Using homeowner: ${homeowner.email}\n`);

  // Add each test job
  for (const job of testJobs) {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...job,
        homeowner_id: homeowner.id,
        photos: [],
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to add job "${job.title}":`, error.message);
    } else {
      // console.log(`✅ Added job: "${job.title}" at ${job.location}`);
    }
  }

  // console.log('\n✨ Test jobs added successfully!');
  // console.log('📍 All jobs have real London addresses that will show on the map.');
  // console.log('🗺️ Go to /contractor/jobs-near-you to see them on the map!');
}

// Run the script
addTestJobs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });