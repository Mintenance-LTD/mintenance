import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const realJobs = [
  // North London
  {
    title: 'Emergency Boiler Repair',
    description: 'Central heating boiler stopped working. Need urgent repair as we have no hot water or heating. Vaillant EcoTec Plus model.',
    category: 'hvac',
    budget: 450,
    priority: 'high',
    location: '42 Highgate Hill, Highgate, London N19 5NL',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'posted',
    required_skills: ['Gas Safe', 'Boiler Repair', 'Emergency Callout']
  },
  {
    title: 'Victorian House Roof Repair',
    description: 'Several roof tiles damaged in recent storm. Water leaking into loft space. Victorian terraced house needs experienced roofer.',
    category: 'roofing',
    budget: 1200,
    priority: 'high',
    location: '156 Muswell Hill Road, Muswell Hill, London N10 3JD',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440002',
    status: 'posted',
    required_skills: ['Roofing', 'Victorian Properties', 'Emergency Repair']
  },

  // East London
  {
    title: 'Kitchen Full Renovation',
    description: 'Complete kitchen renovation needed. Remove old units, install new kitchen including plumbing and electrical work. 4x3m space.',
    category: 'renovation',
    budget: 8500,
    priority: 'medium',
    location: '78 Roman Road, Bethnal Green, London E2 0PY',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440003',
    status: 'posted',
    required_skills: ['Kitchen Fitting', 'Plumbing', 'Electrical', 'Tiling']
  },
  {
    title: 'Garden Fence Replacement',
    description: 'Need 30m of garden fence replaced. Old fence blown down in storm. Prefer close board fencing, 6ft height.',
    category: 'landscaping',
    budget: 2200,
    priority: 'medium',
    location: '23 Victoria Park Road, Hackney, London E9 7HD',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440004',
    status: 'posted',
    required_skills: ['Fencing', 'Landscaping', 'Garden Work']
  },

  // South London
  {
    title: 'Bathroom Leak Emergency',
    description: 'Severe leak from upstairs bathroom causing damage to ceiling below. Need urgent plumber to locate and fix leak.',
    category: 'plumbing',
    budget: 350,
    priority: 'high',
    location: '112 Clapham High Street, Clapham, London SW4 7UL',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440005',
    status: 'posted',
    required_skills: ['Plumbing', 'Leak Detection', 'Emergency Callout']
  },
  {
    title: 'Loft Conversion Project',
    description: 'Convert loft into home office. Need structural work, insulation, Velux windows, electrical and heating. Planning permission obtained.',
    category: 'construction',
    budget: 25000,
    priority: 'low',
    location: '45 Dulwich Village, Dulwich, London SE21 7BN',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'posted',
    required_skills: ['Loft Conversion', 'Structural Work', 'Building Regs']
  },

  // West London
  {
    title: 'Rewire 3-Bed House',
    description: 'Full electrical rewire needed for 1950s house. Current wiring is old and unsafe. Need NICEIC certified electrician.',
    category: 'electrical',
    budget: 5500,
    priority: 'high',
    location: '89 King Street, Hammersmith, London W6 9HW',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440002',
    status: 'posted',
    required_skills: ['Electrical Rewire', 'NICEIC Certified', 'Testing']
  },
  {
    title: 'Patio and Decking Installation',
    description: 'Install new patio area (6x4m) and raised decking (4x3m) in back garden. Include lighting and steps between levels.',
    category: 'landscaping',
    budget: 6800,
    priority: 'low',
    location: '234 Uxbridge Road, Ealing, London W13 8QU',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440003',
    status: 'posted',
    required_skills: ['Patio Laying', 'Decking', 'Garden Design']
  },

  // Central London
  {
    title: 'Office Partition Walls',
    description: 'Install glass partition walls in commercial office space. 3 offices needed, approx 50sqm total. Include doors and soundproofing.',
    category: 'construction',
    budget: 12000,
    priority: 'medium',
    location: '100 Oxford Street, Westminster, London W1D 1LL',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440004',
    status: 'posted',
    required_skills: ['Office Fit-out', 'Partition Walls', 'Commercial']
  },
  {
    title: 'Flat Renovation - Full Refurb',
    description: '2-bed flat complete renovation. New bathroom, kitchen, flooring throughout, decoration. High-spec finish required.',
    category: 'renovation',
    budget: 35000,
    priority: 'medium',
    location: '15 Russell Square, Bloomsbury, London WC1B 5BE',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440005',
    status: 'posted',
    required_skills: ['Full Renovation', 'Project Management', 'High-end Finish']
  },

  // Additional varied locations
  {
    title: 'Driveway Resurfacing',
    description: 'Resurface front driveway (8x5m). Current tarmac cracked and uneven. Prefer block paving or resin bound surface.',
    category: 'landscaping',
    budget: 4200,
    priority: 'low',
    location: '67 Wimbledon Park Road, Wimbledon, London SW19 6PE',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'posted',
    required_skills: ['Driveway', 'Paving', 'Groundwork']
  },
  {
    title: 'Window Replacement - UPVC',
    description: 'Replace 8 windows with new double-glazed UPVC units. Include 1 bay window. Old wooden frames rotting.',
    category: 'windows',
    budget: 6500,
    priority: 'medium',
    location: '33 Forest Hill Road, Forest Hill, London SE23 3HN',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440002',
    status: 'posted',
    required_skills: ['Window Fitting', 'UPVC', 'FENSA Registered']
  },
  {
    title: 'Blocked Drain Emergency',
    description: 'Main drain blocked causing backup. Sewage smell in garden. Need emergency drain clearance and CCTV survey.',
    category: 'plumbing',
    budget: 280,
    priority: 'high',
    location: '198 Streatham High Road, Streatham, London SW16 1BB',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440003',
    status: 'posted',
    required_skills: ['Drainage', 'CCTV Survey', 'Emergency Service']
  },
  {
    title: 'Shop Front Shutters Repair',
    description: 'Electric roller shutters not working. Motor seems faulty. Need repair or replacement for shop security.',
    category: 'commercial',
    budget: 850,
    priority: 'high',
    location: '456 Green Lanes, Haringey, London N4 1AE',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440004',
    status: 'posted',
    required_skills: ['Shutter Repair', 'Commercial', 'Electrical']
  },
  {
    title: 'Extension Planning & Build',
    description: 'Single-storey rear extension 4x6m. Need architect, planning application, and build. Open plan kitchen/dining space.',
    category: 'construction',
    budget: 45000,
    priority: 'low',
    location: '91 Richmond Road, Kingston upon Thames, KT2 5BT',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440005',
    status: 'posted',
    required_skills: ['Extensions', 'Planning', 'Structural', 'Building Regs']
  },
  {
    title: 'Chimney Repair & Repointing',
    description: 'Chimney stack needs repointing and lead flashing replacement. Some bricks loose. Two-storey Victorian house.',
    category: 'roofing',
    budget: 1800,
    priority: 'medium',
    location: '25 Telegraph Hill, New Cross, London SE14 5TL',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440001',
    status: 'posted',
    required_skills: ['Chimney Work', 'Repointing', 'Lead Work']
  },
  {
    title: 'Security System Installation',
    description: 'Install comprehensive security system: CCTV (6 cameras), alarm system, and smart doorbell. Professional monitoring required.',
    category: 'electrical',
    budget: 3200,
    priority: 'medium',
    location: '178 Finchley Road, Swiss Cottage, London NW3 6BT',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440002',
    status: 'posted',
    required_skills: ['Security Systems', 'CCTV', 'Alarm Installation']
  },
  {
    title: 'Conservatory Roof Replacement',
    description: 'Replace old polycarbonate conservatory roof with solid tiled roof for better insulation. 4x3m conservatory.',
    category: 'construction',
    budget: 8900,
    priority: 'low',
    location: '52 Chiswick High Road, Chiswick, London W4 1SY',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440003',
    status: 'posted',
    required_skills: ['Conservatory', 'Roofing', 'Insulation']
  },
  {
    title: 'Wet Room Installation',
    description: 'Convert bathroom to wet room with walk-in shower. Need tanking, new drainage, tiling. Disabled access required.',
    category: 'bathroom',
    budget: 7500,
    priority: 'medium',
    location: '303 Kentish Town Road, Camden, London NW5 2TJ',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440004',
    status: 'posted',
    required_skills: ['Wet Room', 'Tanking', 'Disabled Access', 'Tiling']
  },
  {
    title: 'Solar Panel Installation',
    description: 'Install solar panels on south-facing roof. 4kW system preferred. Include battery storage. Need MCS certified installer.',
    category: 'electrical',
    budget: 9500,
    priority: 'low',
    location: '88 Barnes High Street, Barnes, London SW13 9LF',
    homeowner_id: '550e8400-e29b-41d4-a716-446655440005',
    status: 'posted',
    required_skills: ['Solar PV', 'MCS Certified', 'Battery Storage']
  }
];

async function seedJobs() {
  console.log('🌱 Starting to seed real jobs with UK addresses...');

  // First, ensure we have some properties (matching actual schema)
  const properties = [
    {
      address: '42 Highgate Hill, Highgate, London',
      postcode: 'N19 5NL',
      property_type: 'house',
      owner_id: '550e8400-e29b-41d4-a716-446655440001'
    },
    {
      address: '156 Muswell Hill Road, Muswell Hill, London',
      postcode: 'N10 3JD',
      property_type: 'house',
      owner_id: '550e8400-e29b-41d4-a716-446655440002'
    },
    {
      address: '78 Roman Road, Bethnal Green, London',
      postcode: 'E2 0PY',
      property_type: 'flat',
      owner_id: '550e8400-e29b-41d4-a716-446655440003'
    },
    {
      address: '23 Victoria Park Road, Hackney, London',
      postcode: 'E9 7HD',
      property_type: 'house',
      owner_id: '550e8400-e29b-41d4-a716-446655440004'
    },
    {
      address: '112 Clapham High Street, Clapham, London',
      postcode: 'SW4 7UL',
      property_type: 'flat',
      owner_id: '550e8400-e29b-41d4-a716-446655440005'
    }
  ];

  // Insert properties (with proper error handling)
  for (const property of properties) {
    const { error: propError } = await supabase
      .from('properties')
      .upsert(property, { onConflict: 'address,postcode' });

    if (propError && !propError.message.includes('duplicate')) {
      console.log('Note: Properties table may not exist or have different schema');
    }
  }

  // Get properties to link to jobs
  const { data: propertiesData } = await supabase
    .from('properties')
    .select('id, address, postcode, owner_id');

  const propertyMap = new Map();
  if (propertiesData) {
    propertiesData.forEach(p => {
      propertyMap.set(`${p.address}, ${p.postcode}`, p);
    });
  }

  // Delete old test jobs first (optional)
  console.log('🗑️  Cleaning up old test jobs...');
  await supabase
    .from('jobs')
    .delete()
    .like('title', '%Test Job%');

  // Insert new realistic jobs
  let successCount = 0;
  let errorCount = 0;

  for (const job of realJobs) {
    try {
      // Find matching property for this job
      const matchingProperty = Array.from(propertyMap.values()).find(p =>
        job.location.includes(p.address.split(',')[0])
      );

      const jobData = {
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        priority: job.priority,
        location: job.location,
        homeowner_id: job.homeowner_id,
        status: job.status,
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 7 days
      };

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error inserting job "${job.title}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Added job: ${job.title} at ${job.location}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing job "${job.title}":`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Seeding complete!`);
  console.log(`✅ Successfully added: ${successCount} jobs`);
  console.log(`❌ Errors: ${errorCount} jobs`);
  console.log(`\n🗺️  Jobs are spread across London with real addresses for proper map display`);
}

seedJobs()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });