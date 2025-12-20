/**
 * Fix job geocoding - add lat/lng to existing jobs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'apps', 'web', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!googleMapsApiKey) {
  console.error('❌ Missing GOOGLE_MAPS_API_KEY - geocoding will not work');
  console.log('Add it to your apps/web/.env.local file:');
  console.log('GOOGLE_MAPS_API_KEY=your_api_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Delay to respect Google Maps API rate limits (50 requests per second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      console.warn(`Geocoding failed for "${address}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding "${address}":`, error);
    return null;
  }
}

async function fixJobGeocoding() {
  console.log('🔍 Fixing job geocoding...\n');

  // Get jobs without geocoding
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, location, city, postcode')
    .or('latitude.is.null,longitude.is.null')
    .limit(100);

  if (error) {
    console.error('❌ Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ All jobs already have geocoding data');
    return;
  }

  console.log(`📋 Found ${jobs.length} jobs without geocoding\n`);

  let successCount = 0;
  let failCount = 0;

  for (const job of jobs) {
    // Build address from available fields
    let address = job.location || '';
    if (!address && job.city) {
      address = job.city;
      if (job.postcode) address += ', ' + job.postcode;
    }

    if (!address) {
      console.log(`⚠️  Job ${job.id} has no location data`);
      failCount++;
      continue;
    }

    console.log(`📍 Geocoding job ${job.id}: "${address}"`);

    const coords = await geocodeAddress(address);

    if (coords) {
      // Update job with coordinates
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          latitude: coords.lat,
          longitude: coords.lng,
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`❌ Failed to update job ${job.id}:`, updateError);
        failCount++;
      } else {
        console.log(`✅ Updated job ${job.id} with lat: ${coords.lat}, lng: ${coords.lng}`);
        successCount++;
      }
    } else {
      console.log(`⚠️  Could not geocode job ${job.id}`);
      failCount++;
    }

    // Respect API rate limits (50 requests per second = 20ms between requests)
    await delay(20);
  }

  console.log('\n📊 Geocoding Summary:');
  console.log(`✅ Successfully geocoded: ${successCount}`);
  console.log(`❌ Failed to geocode: ${failCount}`);

  // Now update the job creation API to save lat/lng
  console.log('\n📝 Note: The job creation API should be updated to save lat/lng during creation');
}

// Run the script
fixJobGeocoding().then(() => {
  console.log('\n✅ Geocoding fix complete');
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});