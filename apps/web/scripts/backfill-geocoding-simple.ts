/**
 * Simple geocoding backfill script
 * Run with: npx tsx scripts/backfill-geocoding-simple.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !googleMapsApiKey) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    console.warn(`   Geocoding failed: ${data.status}`);
    return null;
  } catch (error) {
    console.error(`   Error:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting job geocoding backfill...\n');

  // Fetch all jobs needing geocoding
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, location, latitude, longitude')
    .not('location', 'is', null)
    .or('latitude.is.null,longitude.is.null');

  if (error) {
    console.error('❌ Error fetching jobs:', error);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ No jobs need geocoding!');
    return;
  }

  console.log(`📍 Found ${jobs.length} jobs needing geocoding\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] ${job.title}`);
    console.log(`   Location: ${job.location}`);

    if (job.latitude && job.longitude) {
      console.log(`   ⏭️  Already has coordinates\n`);
      continue;
    }

    const coords = await geocodeAddress(job.location);

    if (coords) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', job.id);

      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}\n`);
        failCount++;
      } else {
        console.log(`   ✅ Geocoded: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}\n`);
        successCount++;
      }
    } else {
      console.log(`   ❌ Geocoding failed\n`);
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📍 Total: ${jobs.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Done! Refresh your discover page to see jobs on the map.');
}

main().catch(console.error);
