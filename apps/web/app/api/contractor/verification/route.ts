import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, BadRequestError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

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

export async function GET(request: Request) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
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
  } catch (error: unknown) {
    return handleAPIError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    
    // CSRF protection
    await requireCSRF(request);
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      throw new UnauthorizedError('Contractor access required');
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
      throw new BadRequestError('Company name, business address, and license number are required');
    }

    const validator = new LicenseValidator();
    const licenseValidation = validator.validate(licenseNumber);

    if (!licenseValidation.valid) {
      throw new BadRequestError(licenseValidation.message || 'Invalid license number');
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
      throw updateError;
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
  } catch (error: unknown) {
    return handleAPIError(error);
  }
}

interface VerificationStatusResponse {
  hasBusinessAddress: boolean;
  hasLicenseNumber: boolean;
  hasGeolocation: boolean;
  hasCompanyName: boolean;
  isFullyVerified: boolean;
  data: Record<string, unknown> | null;
}
