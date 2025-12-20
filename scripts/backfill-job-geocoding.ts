/**
 * Backfill geocoding data for existing jobs
 *
 * This script geocodes all jobs that have a location but missing latitude/longitude
 * Run with: npx tsx scripts/backfill-job-geocoding.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from apps/web/.env.local
config({ path: resolve(__dirname, '../apps/web/.env.local') });

import { serverSupabase } from '../apps/web/lib/api/supabaseServer';

// Google Maps Geocoding API
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    console.warn(`Geocoding failed for "${address}":`, data.status);
    return null;
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

async function backfillJobGeocoding() {
  console.log('🚀 Starting job geocoding backfill...\n');

  // Fetch all jobs with location but without coordinates
  const { data: jobs, error } = await serverSupabase
    .from('jobs')
    .select('id, title, location, latitude, longitude')
    .not('location', 'is', null)
    .or('latitude.is.null,longitude.is.null');

  if (error) {
    console.error('❌ Error fetching jobs:', error);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ No jobs need geocoding. All jobs already have coordinates!');
    return;
  }

  console.log(`📍 Found ${jobs.length} jobs needing geocoding\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] Processing: ${job.title}`);
    console.log(`   Location: ${job.location}`);

    // Skip if already has coordinates
    if (job.latitude && job.longitude) {
      console.log(`   ⏭️  Already has coordinates, skipping`);
      skippedCount++;
      continue;
    }

    // Geocode the location
    const coordinates = await geocodeAddress(job.location);

    if (coordinates) {
      // Update job with coordinates
      const { error: updateError } = await serverSupabase
        .from('jobs')
        .update({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        })
        .eq('id', job.id);

      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`   ✅ Geocoded: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`);
        successCount++;
      }
    } else {
      console.log(`   ❌ Geocoding failed`);
      failCount++;
    }

    // Add small delay to avoid rate limiting (Google Maps allows 50 req/sec)
    if (i < jobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Backfill Summary:');
  console.log(`   ✅ Successfully geocoded: ${successCount}`);
  console.log(`   ⏭️  Skipped (already had coordinates): ${skippedCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📍 Total processed: ${jobs.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (successCount > 0) {
    console.log('🎉 Geocoding backfill complete! Jobs should now appear on the discover map.');
  }
}

// Run the backfill
backfillJobGeocoding()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
