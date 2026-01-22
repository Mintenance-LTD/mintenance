import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!googleMapsApiKey) {
    // Return approximate coordinates for common London areas
    const areaCoordinates: Record<string, { lat: number; lng: number }> = {
      'chelsea': { lat: 51.4875, lng: -0.1687 },
      'kensington': { lat: 51.4989, lng: -0.1991 },
      'hampstead': { lat: 51.5569, lng: -0.1763 },
      'shoreditch': { lat: 51.5264, lng: -0.0778 },
      'battersea': { lat: 51.4749, lng: -0.1565 },
      'wimbledon': { lat: 51.4214, lng: -0.2069 },
      'camden': { lat: 51.5391, lng: -0.1419 },
      'hackney': { lat: 51.5450, lng: -0.0553 },
      'greenwich': { lat: 51.4826, lng: 0.0077 },
      'westminster': { lat: 51.4975, lng: -0.1357 },
      'bloomsbury': { lat: 51.5246, lng: -0.1340 },
      'clapham': { lat: 51.4619, lng: -0.1382 },
      'ealing': { lat: 51.5130, lng: -0.3089 },
      'richmond': { lat: 51.4613, lng: -0.3037 },
      'islington': { lat: 51.5448, lng: -0.1027 },
      'brixton': { lat: 51.4613, lng: -0.1156 },
      'putney': { lat: 51.4634, lng: -0.2158 },
      'fulham': { lat: 51.4749, lng: -0.2069 },
      'hammersmith': { lat: 51.4929, lng: -0.2252 },
      'notting hill': { lat: 51.5094, lng: -0.2052 },
    };

    // Try to find a matching area
    const addressLower = address.toLowerCase();
    for (const [area, coords] of Object.entries(areaCoordinates)) {
      if (addressLower.includes(area)) {
        // Add some random offset to spread jobs around the area
        return {
          lat: coords.lat + (Math.random() - 0.5) * 0.02,
          lng: coords.lng + (Math.random() - 0.5) * 0.02,
        };
      }
    }

    // Default to central London with random offset
    return {
      lat: 51.5074 + (Math.random() - 0.5) * 0.1,
      lng: -0.1278 + (Math.random() - 0.5) * 0.1,
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  return null;
}

async function geocodeAllJobs() {
  console.log('🗺️  Starting to geocode all jobs...\n');

  // Fetch all jobs that have a location but no coordinates
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, location, latitude, longitude')
    .not('location', 'is', null);

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  console.log(`Found ${jobs?.length || 0} jobs to process\n`);

  let geocodedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const job of jobs || []) {
    // Skip if already has coordinates
    if (job.latitude && job.longitude) {
      console.log(`⏭️  Skipping "${job.title}" - already has coordinates`);
      skippedCount++;
      continue;
    }

    // Geocode the address
    const coords = await geocodeAddress(job.location);

    if (coords) {
      // Update the job with coordinates
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          latitude: coords.lat,
          longitude: coords.lng,
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`❌ Error updating "${job.title}":`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ Geocoded "${job.title}" - ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        geocodedCount++;
      }
    } else {
      console.error(`❌ Failed to geocode "${job.title}" - ${job.location}`);
      errorCount++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Geocoded: ${geocodedCount} jobs`);
  console.log(`⏭️  Skipped (already had coords): ${skippedCount} jobs`);
  console.log(`❌ Errors: ${errorCount} jobs`);

  // Show sample geocoded jobs
  console.log('\n📍 Sample geocoded jobs:');
  const { data: sampleJobs } = await supabase
    .from('jobs')
    .select('title, location, latitude, longitude')
    .not('latitude', 'is', null)
    .limit(5);

  sampleJobs?.forEach((job: unknown) => {
    console.log(`- ${job.title}`);
    console.log(`  Location: ${job.location}`);
    console.log(`  Coordinates: ${job.latitude?.toFixed(4)}, ${job.longitude?.toFixed(4)}`);
  });
}

// Also update some contractors with real locations
async function updateContractorLocations() {
  console.log('\n👷 Updating contractor locations...\n');

  const contractorLocations = [
    { email: 'contractor@example.com', latitude: 51.5200, longitude: -0.1000, address: '45 City Road, Shoreditch, London EC1Y 1AE' },
    { email: 'test.contractor@mintenance.com', latitude: 51.5074, longitude: -0.1278, address: '123 Oxford Street, London W1D 1BS' },
  ];

  for (const contractor of contractorLocations) {
    const { error } = await supabase
      .from('users')
      .update({
        latitude: contractor.latitude,
        longitude: contractor.longitude,
        address: contractor.address,
      })
      .eq('email', contractor.email)
      .eq('role', 'contractor');

    if (!error) {
      console.log(`✅ Updated contractor location: ${contractor.email}`);
    }
  }
}

async function main() {
  await geocodeAllJobs();
  await updateContractorLocations();
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });