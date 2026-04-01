import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';

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
      logger.error('Geocoding API error', error, { service: 'geocoding' });
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

interface VerificationStatusResponse {
  hasBusinessAddress: boolean;
  hasLicenseNumber: boolean;
  hasGeolocation: boolean;
  hasCompanyName: boolean;
  isFullyVerified: boolean;
  data: Record<string, unknown> | null;
}

/**
 * GET /api/contractor/verification
 * Fetch contractor verification status
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data: userData, error } = await serverSupabase
      .from('profiles')
      .select('business_address, license_number, latitude, longitude, company_name')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Fetch insurance and license from normalized tables
    const [insuranceRes, licenseRes] = await Promise.all([
      serverSupabase.from('contractor_insurance').select('provider, policy_number').eq('contractor_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      serverSupabase.from('contractor_licenses').select('name, number').eq('contractor_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

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
      data: {
        ...userData,
        insurance_provider: insuranceRes.data?.provider || null,
        insurance_policy_number: insuranceRes.data?.policy_number || null,
        license_type: licenseRes.data?.name || null,
      },
    };

    return NextResponse.json(verificationStatus, { status: 200 });
  }
);

/**
 * POST /api/contractor/verification
 * Submit contractor verification information
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const verificationSchema = z.object({
      companyName: z.string().min(1, 'Company name is required').max(300),
      businessAddress: z.string().min(1, 'Business address is required').max(500),
      licenseNumber: z.string().min(1, 'License number is required').max(50),
      licenseType: z.string().max(100).optional(),
      yearsExperience: z.number().int().min(0).max(100).optional(),
      insuranceProvider: z.string().max(300).optional(),
      insurancePolicyNumber: z.string().max(100).optional(),
      insuranceExpiryDate: z.string().max(30).optional(),
    });

    const validation = await validateRequest(request as never, verificationSchema);
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;
    const {
      companyName,
      businessAddress,
      licenseNumber,
      licenseType,
      yearsExperience,
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
    } = data;

    const validator = new LicenseValidator();
    const licenseValidation = validator.validate(licenseNumber);

    if (!licenseValidation.valid) {
      throw new BadRequestError(licenseValidation.message || 'Invalid license number');
    }

    const geocoder = new GeocodingService();
    const coordinates = await geocoder.geocodeAddress(businessAddress);

    const updateData: Record<string, unknown> = {
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

    // Save profile fields (company_name, license_number, address)
    const { data: updatedUser, error: updateError } = await serverSupabase
      .from('profiles')
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

    // Save insurance to contractor_insurance table (not profiles)
    if (insuranceProvider) {
      await serverSupabase.from('contractor_insurance').upsert({
        contractor_id: user.id,
        provider: insuranceProvider,
        policy_number: insurancePolicyNumber || null,
        expiry_date: insuranceExpiryDate || null,
        type: 'general_liability',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'contractor_id' });
    }

    // Save license type to contractor_licenses table
    if (licenseType) {
      await serverSupabase.from('contractor_licenses').upsert({
        contractor_id: user.id,
        name: licenseType,
        number: licenseNumber.trim().toUpperCase(),
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'contractor_id' });
    }

    return NextResponse.json(
      {
        message: 'Verification information submitted successfully.',
        verified: true,
        geocoded: Boolean(coordinates),
        coordinates: coordinates
          ? { latitude: coordinates.lat, longitude: coordinates.lng }
          : null,
        data: updatedUser,
      },
      { status: 200 },
    );
  }
);
