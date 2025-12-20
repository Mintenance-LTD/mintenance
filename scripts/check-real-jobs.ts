/**
 * Check for real jobs in the database and their data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkJobs() {
  console.log('🔍 Checking jobs in database...\n');

  // Get recent jobs
  const { data: jobs, error, count } = await supabase
    .from('jobs')
    .select(`
      *,
      homeowner:users!jobs_homeowner_id_fkey(id, email, first_name, last_name),
      job_attachments(id, file_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching jobs:', error);
    return;
  }

  console.log(`📊 Total jobs in database: ${count}\n`);

  if (!jobs || jobs.length === 0) {
    console.log('No jobs found');
    return;
  }

  console.log('📋 Recent jobs:\n');
  jobs.forEach((job, index) => {
    console.log(`${index + 1}. ${job.title || 'Untitled'}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Category: ${job.category || 'N/A'}`);
    console.log(`   Budget: £${job.budget || job.budget_min || 0} - £${job.budget_max || job.budget || 0}`);
    console.log(`   Location: ${job.location || job.city || 'No location'}`);
    console.log(`   Property ID: ${job.property_id || 'None'}`);
    console.log(`   Lat/Lng: ${job.latitude || 'N/A'}, ${job.longitude || 'N/A'}`);
    console.log(`   Images: ${job.job_attachments?.length || 0} attachments`);
    console.log(`   Homeowner: ${job.homeowner?.email || 'Unknown'}`);
    console.log(`   Created: ${new Date(job.created_at).toLocaleDateString()}`);
    console.log('');
  });

  // Check for mock data patterns
  const mockPatterns = [
    'test', 'demo', 'example', 'lorem', 'sample', 'fake'
  ];

  const { data: mockJobs, error: mockError } = await supabase
    .from('jobs')
    .select('id, title, description')
    .or(mockPatterns.map(p => `title.ilike.%${p}%`).join(','))
    .limit(5);

  if (mockJobs && mockJobs.length > 0) {
    console.log('⚠️  Found potential mock/test data:');
    mockJobs.forEach(job => {
      console.log(`   - ${job.title} (ID: ${job.id})`);
    });
    console.log('');
  }

  // Check job_attachments table
  const { data: attachments, count: attachmentCount } = await supabase
    .from('job_attachments')
    .select('*', { count: 'exact', head: true });

  console.log(`📎 Total job attachments: ${attachmentCount || 0}\n`);

  // Check for jobs with missing geolocation
  const { count: missingGeoCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .or('latitude.is.null,longitude.is.null');

  console.log(`📍 Jobs missing geolocation: ${missingGeoCount || 0}\n`);

  // Check for jobs without property_id
  const { count: missingPropertyCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .is('property_id', null);

  console.log(`🏠 Jobs without property_id: ${missingPropertyCount || 0}\n`);
}

// Run the script
checkJobs().then(() => {
  console.log('✅ Job check complete');
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});