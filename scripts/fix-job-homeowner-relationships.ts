import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample homeowners to create
const homeowners = [
  {
    email: 'john.smith@example.com',
    first_name: 'John',
    last_name: 'Smith',
    role: 'homeowner',
    city: 'London',
    address: '123 Baker Street, Westminster',
    postcode: 'W1U 6RP',
    latitude: 51.5238,
    longitude: -0.1585,
  },
  {
    email: 'sarah.jones@example.com',
    first_name: 'Sarah',
    last_name: 'Jones',
    role: 'homeowner',
    city: 'London',
    address: '45 High Street, Camden',
    postcode: 'NW1 7BY',
    latitude: 51.5391,
    longitude: -0.1419,
  },
  {
    email: 'mike.wilson@example.com',
    first_name: 'Mike',
    last_name: 'Wilson',
    role: 'homeowner',
    city: 'London',
    address: '78 Victoria Road, Hackney',
    postcode: 'E9 7HD',
    latitude: 51.5469,
    longitude: -0.0493,
  },
  {
    email: 'emma.brown@example.com',
    first_name: 'Emma',
    last_name: 'Brown',
    role: 'homeowner',
    city: 'London',
    address: '234 King Street, Hammersmith',
    postcode: 'W6 0QU',
    latitude: 51.4929,
    longitude: -0.2252,
  },
  {
    email: 'tom.davis@example.com',
    first_name: 'Tom',
    last_name: 'Davis',
    role: 'homeowner',
    city: 'London',
    address: '567 Church Road, Richmond',
    postcode: 'TW9 2PN',
    latitude: 51.4613,
    longitude: -0.3037,
  },
];

async function fixJobHomeownerRelationships() {
  console.log('🔧 Fixing job-homeowner relationships...\n');

  // Step 1: Check existing homeowners
  const { data: existingHomeowners, error: homeownerError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('role', 'homeowner');

  if (homeownerError) {
    console.error('Error fetching homeowners:', homeownerError);
    return;
  }

  console.log(`Found ${existingHomeowners?.length || 0} existing homeowners`);

  // Step 2: Create homeowners if we don't have enough
  let homeownerIds: string[] = [];

  if (!existingHomeowners || existingHomeowners.length < 5) {
    console.log('\n📝 Creating additional homeowners...');

    for (const homeowner of homeowners) {
      // Check if this email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', homeowner.email)
        .single();

      if (existing) {
        homeownerIds.push(existing.id);
        console.log(`✓ Homeowner ${homeowner.email} already exists`);
      } else {
        // Create new homeowner
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            ...homeowner,
            phone_verified: true,
            email_verified: true,
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating ${homeowner.email}:`, createError.message);
        } else if (newUser) {
          homeownerIds.push(newUser.id);
          console.log(`✅ Created homeowner: ${homeowner.first_name} ${homeowner.last_name}`);
        }
      }
    }
  } else {
    homeownerIds = existingHomeowners.map(h => h.id);
  }

  if (homeownerIds.length === 0) {
    console.error('❌ No homeowner IDs available');
    return;
  }

  // Step 3: Get jobs with invalid or missing homeowner_ids
  console.log('\n🔍 Checking jobs...');
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, homeowner_id, location, category, priority');

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
    return;
  }

  console.log(`Found ${jobs?.length || 0} total jobs`);

  // Step 4: Validate and fix jobs
  const validHomeownerIds = new Set(homeownerIds);
  let fixedCount = 0;
  let validCount = 0;

  for (const job of jobs || []) {
    if (!job.homeowner_id || !validHomeownerIds.has(job.homeowner_id)) {
      // Assign a random valid homeowner
      const randomHomeownerId = homeownerIds[Math.floor(Math.random() * homeownerIds.length)];

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ homeowner_id: randomHomeownerId })
        .eq('id', job.id);

      if (updateError) {
        console.error(`❌ Error updating job "${job.title}":`, updateError.message);
      } else {
        console.log(`✅ Fixed job "${job.title}" - assigned to valid homeowner`);
        fixedCount++;
      }
    } else {
      validCount++;
    }
  }

  // Step 5: Summary
  console.log('\n📊 Summary:');
  console.log(`✅ Valid jobs: ${validCount}`);
  console.log(`🔧 Fixed jobs: ${fixedCount}`);
  console.log(`👤 Total homeowners: ${homeownerIds.length}`);

  // Step 6: Display sample data
  console.log('\n📋 Sample Jobs with Homeowners:');
  const { data: sampleJobs } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      location,
      budget,
      category,
      priority,
      homeowner:users!homeowner_id (
        first_name,
        last_name,
        email
      )
    `)
    .limit(5);

  sampleJobs?.forEach((job: any) => {
    console.log(`\n- ${job.title}`);
    console.log(`  Location: ${job.location || 'Not specified'}`);
    console.log(`  Budget: £${job.budget}`);
    console.log(`  Category: ${job.category || 'General'}`);
    console.log(`  Homeowner: ${job.homeowner?.first_name} ${job.homeowner?.last_name} (${job.homeowner?.email})`);
  });
}

fixJobHomeownerRelationships()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });