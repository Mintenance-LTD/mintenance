import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Comprehensive list of real UK jobs across different areas of London and surroundings
const realJobs = [
  // North London Jobs
  {
    title: 'Complete Home Rewire - 4 Bed Victorian',
    description: 'Full electrical rewire needed for Victorian terrace. Old cloth wiring needs replacing. Consumer unit upgrade to current regs. 4 bedrooms, 2 reception rooms, kitchen, 2 bathrooms. Part M compliant. NICEIC certification required.',
    category: 'electrical',
    budget: 7500,
    priority: 'high',
    location: '23 Crouch End Hill, Crouch End, London N8 8AA',
    required_skills: ['Electrical Installation', 'NICEIC Certified', 'Victorian Properties', 'Consumer Units'],
    photos: [],
  },
  {
    title: 'Loft Conversion with En-suite',
    description: 'Convert loft space into master bedroom with en-suite bathroom. Dormer windows, insulation, electrics, plumbing for en-suite. Staircase already in place. Building regs approval obtained. Approximately 35sqm.',
    category: 'construction',
    budget: 32000,
    priority: 'medium',
    location: '156 Fortis Green Road, Muswell Hill, London N10 3DN',
    required_skills: ['Loft Conversions', 'Structural Work', 'Plumbing', 'Building Regulations'],
    photos: [],
  },
  {
    title: 'Garden Landscaping Project',
    description: 'Complete garden redesign. Remove old patio, level lawn area, install new Indian sandstone patio (40sqm), build raised beds, new fence panels (25m), automatic irrigation system, outdoor lighting.',
    category: 'landscaping',
    budget: 15000,
    priority: 'low',
    location: '89 Hampstead Lane, Highgate, London N6 4RS',
    required_skills: ['Landscaping', 'Patio Installation', 'Fencing', 'Irrigation Systems'],
    photos: [],
  },

  // East London Jobs
  {
    title: 'Commercial Kitchen Refurbishment',
    description: 'Restaurant kitchen complete refit. New extraction system, gas lines, commercial grade electrical, stainless steel units, floor resurfacing with non-slip coating. Must comply with health & safety regulations.',
    category: 'commercial',
    budget: 45000,
    priority: 'high',
    location: '234 Brick Lane, Shoreditch, London E1 6PU',
    required_skills: ['Commercial Kitchens', 'Gas Safe', 'Extraction Systems', 'Health & Safety'],
    photos: [],
  },
  {
    title: 'Victorian Sash Window Restoration',
    description: '12 original sash windows need complete restoration. Repair sash cords, replace broken panes, draught proofing, repaint. Listed building - sympathetic restoration required. Include scaffolding.',
    category: 'windows',
    budget: 8900,
    priority: 'medium',
    location: '67 Columbia Road, Bethnal Green, London E2 7RG',
    required_skills: ['Sash Windows', 'Listed Buildings', 'Window Restoration', 'Traditional Carpentry'],
    photos: [],
  },
  {
    title: 'Damp Proofing Treatment',
    description: 'Rising damp in Victorian basement flat. Full damp proof course needed, tanking to walls, replastering affected areas (approx 65sqm), treat timber joists. Include 20-year guarantee.',
    category: 'damp_proofing',
    budget: 6500,
    priority: 'high',
    location: '112 Mare Street, Hackney, London E8 4RH',
    required_skills: ['Damp Proofing', 'Tanking', 'Plastering', 'Basement Work'],
    photos: [],
  },

  // South London Jobs
  {
    title: 'New Bathroom Suite Installation',
    description: 'Remove old bathroom, install new suite: walk-in shower with rainfall head, freestanding bath, wall-hung toilet, double vanity unit. Underfloor heating, full tiling, LED mirror. 4x3m space.',
    category: 'bathroom',
    budget: 12000,
    priority: 'medium',
    location: '45 Lavender Hill, Battersea, London SW11 5QN',
    required_skills: ['Bathroom Installation', 'Plumbing', 'Tiling', 'Underfloor Heating'],
    photos: [],
  },
  {
    title: 'Two-Storey Extension Project',
    description: 'Build two-storey rear extension 4x5m. Ground floor kitchen extension, first floor additional bedroom with en-suite. Full architectural plans approved. Party wall agreements in place.',
    category: 'construction',
    budget: 75000,
    priority: 'low',
    location: '178 Wandsworth Common, Wandsworth, London SW18 2EJ',
    required_skills: ['Extensions', 'Structural Work', 'Project Management', 'Building Regulations'],
    photos: [],
  },
  {
    title: 'Emergency Roof Repair',
    description: 'Storm damage to roof. Multiple tiles missing, felt torn, water ingress into loft. Temporary covering in place. Need permanent repair urgently. Approx 15sqm affected area. Insurance work.',
    category: 'roofing',
    budget: 2800,
    priority: 'high',
    location: '92 Streatham High Road, Streatham, London SW16 1BS',
    required_skills: ['Roofing', 'Emergency Repairs', 'Insurance Work', 'Waterproofing'],
    photos: [],
  },

  // West London Jobs
  {
    title: 'Smart Home Installation',
    description: 'Install comprehensive smart home system. Lighting control (30 circuits), heating zones (5), security cameras (8), video doorbell, smart locks (3), automated blinds (10 windows). Include programming.',
    category: 'electrical',
    budget: 18000,
    priority: 'low',
    location: '56 Holland Park Avenue, Kensington, London W11 3QZ',
    required_skills: ['Smart Home Systems', 'Home Automation', 'Electrical', 'Programming'],
    photos: [],
  },
  {
    title: 'Garage Conversion to Office',
    description: 'Convert single garage to home office. Insulated walls and ceiling, new window, French doors, electrical circuits for office equipment, ethernet cabling, plastering, flooring, decoration.',
    category: 'conversion',
    budget: 22000,
    priority: 'medium',
    location: '234 Castlebar Road, Ealing, London W5 2DG',
    required_skills: ['Garage Conversions', 'Insulation', 'Electrical', 'Plastering'],
    photos: [],
  },
  {
    title: 'Period Property Restoration',
    description: 'Grade II listed Georgian townhouse restoration. Restore original features: cornicing, ceiling roses, fireplaces. Repair lime plaster, sash windows, original floorboards. Conservation officer approved.',
    category: 'renovation',
    budget: 95000,
    priority: 'low',
    location: '15 St Johns Wood High Street, St Johns Wood, London NW8 7NG',
    required_skills: ['Period Properties', 'Listed Buildings', 'Lime Plastering', 'Conservation'],
    photos: [],
  },

  // Central London Jobs
  {
    title: 'Office Fit-Out 2000 sqft',
    description: 'Complete office renovation. Open plan design, 3 meeting rooms with glass partitions, kitchen area, breakout space, LED lighting throughout, air conditioning, Cat6 cabling. 2000 sqft total.',
    category: 'commercial',
    budget: 125000,
    priority: 'high',
    location: '100 Tottenham Court Road, Fitzrovia, London W1T 4TJ',
    required_skills: ['Office Fit-out', 'Commercial', 'Project Management', 'M&E'],
    photos: [],
  },
  {
    title: 'Penthouse Terrace Waterproofing',
    description: 'Waterproof 150sqm penthouse terrace. Current system failed. Strip existing, new waterproof membrane, insulation, paving on pedestals, drainage system, balustrade repairs. 10-year guarantee required.',
    category: 'waterproofing',
    budget: 35000,
    priority: 'high',
    location: '25 Marylebone High Street, Marylebone, London W1U 4PH',
    required_skills: ['Waterproofing', 'Flat Roofs', 'Terraces', 'High-rise Work'],
    photos: [],
  },

  // Southeast London Jobs
  {
    title: 'Shop Front Security Upgrade',
    description: 'Upgrade security for retail unit. New roller shutters (electric), CCTV system (6 cameras with recording), alarm system, security lighting, reinforced door, safety glass. Police approved standards.',
    category: 'security',
    budget: 12500,
    priority: 'high',
    location: '456 Lewisham High Street, Lewisham, London SE13 6LJ',
    required_skills: ['Security Systems', 'CCTV', 'Roller Shutters', 'Commercial'],
    photos: [],
  },
  {
    title: 'Kitchen Extension & Renovation',
    description: 'Single storey rear extension 4x3m plus full kitchen renovation. Bi-fold doors, skylights, underfloor heating. New kitchen with island, quartz worktops, integrated appliances. Total 25sqm.',
    category: 'renovation',
    budget: 55000,
    priority: 'medium',
    location: '89 Blackheath Park, Blackheath, London SE3 9LA',
    required_skills: ['Extensions', 'Kitchen Installation', 'Bi-fold Doors', 'Underfloor Heating'],
    photos: [],
  },
  {
    title: 'Emergency Pipe Burst Repair',
    description: 'Burst pipe in ceiling causing major leak. Water damage to two rooms below. Need emergency plumber, then plastering, repainting, possibly ceiling replacement. Insurance claim assistance needed.',
    category: 'plumbing',
    budget: 3500,
    priority: 'high',
    location: '23 Honor Oak Park, Forest Hill, London SE23 3LB',
    required_skills: ['Emergency Plumbing', 'Water Damage', 'Insurance Work', 'Plastering'],
    photos: [],
  },

  // Southwest London Jobs
  {
    title: 'Tennis Court Resurfacing',
    description: 'Private tennis court needs complete resurfacing. Current macadam surface cracked. New porous macadam surface, line marking, net posts refurbishment, surrounding fence repair. LTA standards.',
    category: 'sports_facilities',
    budget: 28000,
    priority: 'low',
    location: '67 Wimbledon Park Road, Wimbledon, London SW19 6PE',
    required_skills: ['Sports Surfaces', 'Tennis Courts', 'Groundwork', 'Fencing'],
    photos: [],
  },
  {
    title: 'Heat Pump Installation',
    description: 'Replace gas boiler with air source heat pump. Full system design, removal of old boiler, install 12kW heat pump, new hot water cylinder, upgrade radiators as needed. RHI eligible installation.',
    category: 'hvac',
    budget: 15000,
    priority: 'medium',
    location: '234 Kingston Road, Merton, London SW20 8LX',
    required_skills: ['Heat Pumps', 'Heating Systems', 'Renewable Energy', 'MCS Certified'],
    photos: [],
  },
  {
    title: 'Basement Tanking & Conversion',
    description: 'Convert damp basement to habitable space. Full tanking system, new concrete floor, stud walls, electrical installation, emergency escape window, sump pump. Building control approval. 45sqm.',
    category: 'conversion',
    budget: 65000,
    priority: 'medium',
    location: '91 Putney Hill, Putney, London SW15 3NT',
    required_skills: ['Basement Conversions', 'Tanking', 'Waterproofing', 'Building Regulations'],
    photos: [],
  },

  // Northwest London Jobs
  {
    title: 'School Playground Resurfacing',
    description: 'Primary school playground needs new safety surface. Remove old tarmac, install wetpour rubber surface with graphics/games. Include drainage improvements. 500sqm total. DfE compliant.',
    category: 'commercial',
    budget: 45000,
    priority: 'medium',
    location: '123 Willesden Lane, Kilburn, London NW6 7YN',
    required_skills: ['Safety Surfacing', 'Schools', 'Playground Installation', 'Drainage'],
    photos: [],
  },
  {
    title: 'Solar Panel & Battery Installation',
    description: 'Install 5kW solar PV system with 10kWh battery storage. 14 panels on south-facing roof, hybrid inverter, smart monitoring. Include DNO application and MCS certification.',
    category: 'renewable_energy',
    budget: 12000,
    priority: 'low',
    location: '45 West End Lane, West Hampstead, London NW6 2LJ',
    required_skills: ['Solar PV', 'Battery Storage', 'MCS Certified', 'Electrical'],
    photos: [],
  },
  {
    title: 'Fire Damage Restoration',
    description: 'Kitchen fire damage restoration. Strip damaged units, treat smoke damage throughout ground floor, replaster affected walls, new electrical circuits, redecoration. Insurance approved contractor required.',
    category: 'restoration',
    budget: 35000,
    priority: 'high',
    location: '78 Harrow Road, Queens Park, London NW10 4AA',
    required_skills: ['Fire Damage', 'Insurance Work', 'Restoration', 'Project Management'],
    photos: [],
  },

  // Additional Mixed London Jobs
  {
    title: 'Disabled Access Adaptations',
    description: 'Adapt home for wheelchair access. Ramp to front door, widen doorways, wet room conversion with level access, stairlift installation, grab rails throughout. DFG grant work experience required.',
    category: 'accessibility',
    budget: 25000,
    priority: 'high',
    location: '156 Camden Road, Camden, London NW1 9HS',
    required_skills: ['Disabled Adaptations', 'Wet Rooms', 'Stairlifts', 'Grant Work'],
    photos: [],
  },
  {
    title: 'Japanese Garden Creation',
    description: 'Create authentic Japanese garden in 100sqm space. Water feature with koi pond, tea house structure, bamboo screening, appropriate planting, stepping stones, lighting. Design expertise essential.',
    category: 'landscaping',
    budget: 35000,
    priority: 'low',
    location: '23 Hampstead Heath, Hampstead, London NW3 2TU',
    required_skills: ['Japanese Gardens', 'Water Features', 'Specialist Landscaping', 'Garden Design'],
    photos: [],
  },
  {
    title: 'Wine Cellar Construction',
    description: 'Build climate-controlled wine cellar in basement. Insulation, cooling system, humidity control, bespoke racking for 1000 bottles, LED lighting, glass door. Include sommelier consultation.',
    category: 'specialist',
    budget: 28000,
    priority: 'low',
    location: '89 Belgravia Square, Belgravia, London SW1X 8QB',
    required_skills: ['Wine Cellars', 'Climate Control', 'Specialist Joinery', 'Basement Work'],
    photos: [],
  },
  {
    title: 'Chimney Rebuild & Restoration',
    description: 'Complete chimney stack rebuild. Scaffold, demolish unstable stack, rebuild with reclaimed bricks, new lead flashing, chimney pots, repointing. Include structural engineer report. Conservation area.',
    category: 'roofing',
    budget: 8500,
    priority: 'high',
    location: '34 Clapham Common North Side, Clapham, London SW4 0RN',
    required_skills: ['Chimney Work', 'Structural', 'Lead Work', 'Conservation'],
    photos: [],
  },
  {
    title: 'Swimming Pool Plant Room Upgrade',
    description: 'Upgrade pool filtration system. New pumps, sand filters, chemical dosing system, UV treatment, heat exchanger, control panel. Pool is 10x5m. Include commissioning and training.',
    category: 'specialist',
    budget: 22000,
    priority: 'medium',
    location: '67 The Bishops Avenue, East Finchley, London N2 0BG',
    required_skills: ['Swimming Pools', 'Filtration Systems', 'Water Treatment', 'Mechanical'],
    photos: [],
  },
  {
    title: 'Georgian Townhouse Full Refurb',
    description: 'Complete renovation of 5-storey Georgian townhouse. New services throughout, restore period features, basement excavation, rear extension, full decoration. 400sqm total. Listed building.',
    category: 'renovation',
    budget: 450000,
    priority: 'low',
    location: '12 Bedford Square, Bloomsbury, London WC1B 3JA',
    required_skills: ['Period Properties', 'Full Renovation', 'Listed Buildings', 'Project Management'],
    photos: [],
  },
  {
    title: 'Retail Unit Shopfit',
    description: 'New boutique shopfit. Bespoke joinery display units, POS counter, changing rooms, stockroom fit-out, decorative lighting, polished concrete floor, security systems. 100sqm retail space.',
    category: 'commercial',
    budget: 85000,
    priority: 'medium',
    location: '234 Kings Road, Chelsea, London SW3 5UE',
    required_skills: ['Retail Fit-out', 'Bespoke Joinery', 'Commercial', 'Lighting Design'],
    photos: [],
  },
];

async function seedMoreJobs() {
  console.log('🌱 Starting to seed more real jobs with UK addresses...');

  // Get some homeowner IDs to assign jobs to
  const { data: homeowners } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'homeowner')
    .limit(5);

  const homeownerIds = homeowners?.map(h => h.id) || [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const job of realJobs) {
    try {
      // Randomly assign to a homeowner
      const homeownerId = homeownerIds[Math.floor(Math.random() * homeownerIds.length)];

      const jobData = {
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        priority: job.priority,
        location: job.location,
        homeowner_id: homeownerId,
        status: 'posted',
        created_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // Random time in last 30 days
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
        console.log(`✅ Added job: ${job.title}`);
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
  console.log(`\n🗺️  Jobs are spread across London with real addresses`);
  console.log(`📍 Categories include: electrical, plumbing, construction, renovation, landscaping, commercial, and more!`);
}

seedMoreJobs()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });