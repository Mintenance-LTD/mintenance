import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

class GeocodingService {
  private apiKey = process.env.GOOGLE_MAPS_API_KEY;

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!this.apiKey) {
      logger.warn('GOOGLE_MAPS_API_KEY not configured; verification will proceed without geocoding', {
        service: 'geocoding',
      });
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        };
      }

      logger.error('Geocoding failed', new Error(`Geocoding status: ${data.status}`), {
        service: 'geocoding',
        status: data.status,
      });
      return null;
    } catch (error) {
      logger.error('Geocoding API error', error, {
        service: 'geocoding',
      });
      return null;
    }
  }
}

class LicenseValidator {
  validate(licenseNumber: string): { valid: boolean; message?: string } {
    if (!licenseNumber || licenseNumber.trim().length < 5) {
      return { valid: false, message: 'License number must be at least 5 characters.' };
    }

    const cleanLicense = licenseNumber.trim().toUpperCase();

    if (!/^[A-Z0-9\-\/]+$/.test(cleanLicense)) {
      return { valid: false, message: 'License number contains invalid characters.' };
    }

    if (cleanLicense.length > 50) {
      return { valid: false, message: 'License number is too long.' };
    }

    return { valid: true };
  }
}

export async function GET() {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized - contractor access required' }, { status: 401 });
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('business_address, license_number, latitude, longitude, company_name')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    const verificationStatus: VerificationStatusResponse = {
      hasBusinessAddress: Boolean(userData?.business_address),
      hasLicenseNumber: Boolean(userData?.license_number),
      hasGeolocation: Boolean(userData?.latitude && userData?.longitude),
      hasCompanyName: Boolean(userData?.company_name),
      isFullyVerified: Boolean(
        userData?.business_address &&
          userData?.license_number &&
          userData?.latitude &&
          userData?.longitude &&
          userData?.company_name,
      ),
      data: userData,
    };

    return NextResponse.json(verificationStatus, { status: 200 });
  } catch (error: any) {
    logger.error('Verification status check error', error, {
      service: 'contractor_verification',
    });
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized - contractor access required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      businessAddress,
      licenseNumber,
      licenseType,
      yearsExperience,
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
    } = body;

    if (!companyName || !businessAddress || !licenseNumber) {
      return NextResponse.json(
        { error: 'Company name, business address, and license number are required.' },
        { status: 400 },
      );
    }

    const validator = new LicenseValidator();
    const licenseValidation = validator.validate(licenseNumber);

    if (!licenseValidation.valid) {
      return NextResponse.json({ error: licenseValidation.message }, { status: 400 });
    }

    const geocoder = new GeocodingService();
    const coordinates = await geocoder.geocodeAddress(businessAddress);

    const updateData: Record<string, any> = {
      company_name: companyName,
      business_address: coordinates?.formattedAddress || businessAddress,
      license_number: licenseNumber.trim().toUpperCase(),
      years_experience: yearsExperience || 0,
      updated_at: new Date().toISOString(),
      is_visible_on_map: true,
      last_location_visibility_at: new Date().toISOString(),
    };

    if (coordinates) {
      updateData.latitude = coordinates.lat;
      updateData.longitude = coordinates.lng;
      updateData.address = coordinates.formattedAddress;
    }

    if (insuranceProvider) {
      updateData.insurance_provider = insuranceProvider;
    }
    if (insurancePolicyNumber) {
      updateData.insurance_policy_number = insurancePolicyNumber;
    }
    if (insuranceExpiryDate) {
      updateData.insurance_expiry_date = insuranceExpiryDate;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating contractor verification', updateError, {
        service: 'contractor_verification',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update verification', details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: 'Verification information submitted successfully.',
        verified: true,
        geocoded: Boolean(coordinates),
        coordinates: coordinates
          ? {
              latitude: coordinates.lat,
              longitude: coordinates.lng,
            }
          : null,
        data: updatedUser,
      },
      { status: 200 },
    );
  } catch (error: any) {
    logger.error('Contractor verification error', error, {
      service: 'contractor_verification',
    });
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

interface VerificationStatusResponse {
  hasBusinessAddress: boolean;
  hasLicenseNumber: boolean;
  hasGeolocation: boolean;
  hasCompanyName: boolean;
  isFullyVerified: boolean;
  data: any;
}
