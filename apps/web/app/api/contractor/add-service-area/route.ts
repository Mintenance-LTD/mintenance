import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Geocode Manager
 * Handles address geocoding using Google Maps Geocoding API
 */
class GeocodeManager {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.apiKey) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY not configured, using fallback coordinates');
      // Return approximate coordinates for UK cities as fallback
      return this.getFallbackCoordinates(address);
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }

      console.error('Geocoding failed:', data.status, data.error_message);
      return this.getFallbackCoordinates(address);
    } catch (error) {
      console.error('Geocoding API error:', error);
      return this.getFallbackCoordinates(address);
    }
  }

  private getFallbackCoordinates(location: string): { lat: number; lng: number } {
    const locationLower = location.toLowerCase();
    
    // Common UK cities - approximate coordinates
    const ukCities: Record<string, { lat: number; lng: number }> = {
      'london': { lat: 51.5074, lng: -0.1278 },
      'manchester': { lat: 53.4808, lng: -2.2426 },
      'birmingham': { lat: 52.4862, lng: -1.8904 },
      'leeds': { lat: 53.8008, lng: -1.5491 },
      'glasgow': { lat: 55.8642, lng: -4.2518 },
      'liverpool': { lat: 53.4084, lng: -2.9916 },
      'edinburgh': { lat: 55.9533, lng: -3.1883 },
      'bristol': { lat: 51.4545, lng: -2.5879 },
      'sheffield': { lat: 53.3811, lng: -1.4701 },
      'cardiff': { lat: 51.4816, lng: -3.1791 },
      'belfast': { lat: 54.5973, lng: -5.9301 },
      'newcastle': { lat: 54.9783, lng: -1.6178 },
    };

    for (const [city, coords] of Object.entries(ukCities)) {
      if (locationLower.includes(city)) {
        return coords;
      }
    }

    // Default to London if no match found
    console.warn(`No coordinates found for "${location}", defaulting to London`);
    return { lat: 51.5074, lng: -0.1278 };
  }
}

/**
 * POST /api/contractor/add-service-area
 * Adds a new service area for a contractor with geocoding
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized - contractor access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { location, radius_km } = body;

    if (!location || !radius_km) {
      return NextResponse.json(
        { error: 'Location and radius_km are required' },
        { status: 400 }
      );
    }

    // Geocode the location
    const geocoder = new GeocodeManager();
    const coordinates = await geocoder.geocodeAddress(location);

    if (!coordinates) {
      return NextResponse.json(
        { error: 'Could not geocode the provided location' },
        { status: 400 }
      );
    }

    // Check if area already exists
    const { data: existing } = await supabase
      .from('service_areas')
      .select('id')
      .eq('contractor_id', user.id)
      .eq('area_name', location)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Service area already exists for this location' },
        { status: 409 }
      );
    }

    // Insert new service area
    const { data: newArea, error: insertError } = await supabase
      .from('service_areas')
      .insert({
        contractor_id: user.id,
        area_name: location,
        description: `Service coverage for ${location} area`,
        area_type: 'radius',
        center_latitude: coordinates.lat,
        center_longitude: coordinates.lng,
        radius_km: radius_km,
        is_active: true,
        is_primary_area: false,
      })
      .select()
      .single();

    // Ensure contractor remains visible on homeowner radar
    await supabase
      .from('users')
      .update({
        is_visible_on_map: true,
        last_location_visibility_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (insertError) {
      console.error('Error inserting service area:', insertError);
      return NextResponse.json(
        { error: 'Failed to create service area', details: insertError.message },
        { status: 500 }
      );
    }

    // Return formatted response matching component interface
    return NextResponse.json({
      id: newArea.id,
      location: newArea.area_name,
      radius_km: newArea.radius_km,
      is_active: newArea.is_active,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Service area creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

