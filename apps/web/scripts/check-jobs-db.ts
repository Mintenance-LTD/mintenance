import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkJobs() {
  console.log('🔍 Checking jobs in database...\n');

  // Get all jobs
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, status, homeowner_id, created_at, location')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  console.log(`Found ${jobs?.length || 0} recent jobs:\n`);

  if (jobs && jobs.length > 0) {
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Location: ${job.location || 'Not specified'}`);
      console.log(`   Homeowner ID: ${job.homeowner_id}`);
      console.log(`   Created: ${new Date(job.created_at).toLocaleDateString()}\n`);
    });

    // Test fetching one specific job like the bid page does
    const testJobId = jobs[0].id;
    console.log(`\n🧪 Testing fetch for job ID: ${testJobId}`);

    const { data: testJob, error: testError } = await supabase
      .from('jobs')
      .select(`
        *,
        homeowner:homeowner_id (
          first_name,
          last_name,
          email,
          profile_image_url
        )
      `)
      .eq('id', testJobId)
      .single();

    if (testError) {
      console.error('Error fetching single job:', testError);
    } else {
      console.log('✅ Successfully fetched job with homeowner details');
      console.log(`   Title: ${testJob.title}`);
      console.log(`   Homeowner: ${testJob.homeowner?.first_name} ${testJob.homeowner?.last_name}`);
    }
  } else {
    console.log('No jobs found in database');
  }

  // Check for posted jobs without contractor
  const { data: availableJobs, count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .in('status', ['posted'])
    .is('contractor_id', null);

  console.log(`\n📊 Stats:`);
  console.log(`   Available jobs (posted, no contractor): ${count || 0}`);

  // Check total jobs
  const { count: totalCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total jobs in database: ${totalCount || 0}`);
}

checkJobs().catch(console.error);