import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError } from '@/lib/errors/api-error';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';

class GeocodingService {
  private apiKey = process.env.GOOGLE_MAPS_API_KEY;

  async geocodeAddress(
    address: string
  ): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!this.apiKey) {
      logger.warn(
        'GOOGLE_MAPS_API_KEY not configured; verification will proceed without geocoding',
        {
          service: 'geocoding',
        }
      );
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

      logger.error(
        'Geocoding failed',
        new Error(`Geocoding status: ${data.status}`),
        {
          service: 'geocoding',
          status: data.status,
        }
      );
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
      return {
        valid: false,
        message: 'License number must be at least 5 characters.',
      };
    }

    const cleanLicense = licenseNumber.trim().toUpperCase();

    if (!/^[A-Z0-9\-\/]+$/.test(cleanLicense)) {
      return {
        valid: false,
        message: 'License number contains invalid characters.',
      };
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
  // 2026-05-26 audit-63 P1: profile-completeness only. Renamed from
  // `isFullyVerified` (which led callers — including
  // CreateContractDialog — to treat it as admin-reviewed). Kept the
  // old key as an alias on the wire for back-compat during the
  // mobile-build roll-forward; new callers should read
  // `isAdminVerified` to gate on the real review status.
  isProfileComplete: boolean;
  /** @deprecated Use isAdminVerified. Misleading: profile completeness only. */
  isFullyVerified: boolean;
  // True only when an admin has reviewed and approved the contractor
  // (profiles.verification_status='verified' or legacy admin_verified=true).
  isAdminVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected' | null;
  data: Record<string, unknown> | null;
}

/**
 * GET /api/contractor/verification
 * Fetch contractor verification status
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    // 2026-05-26 audit-63 P1: also fetch verification_status +
    // admin_verified so the response reflects whether an admin has
    // approved the contractor — not just whether the profile is
    // shaped correctly.
    const { data: userData, error } = await serverSupabase
      .from('profiles')
      .select(
        'business_address, license_number, latitude, longitude, company_name, verification_status, admin_verified'
      )
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Fetch insurance and license from normalized tables
    const [insuranceRes, licenseRes] = await Promise.all([
      serverSupabase
        .from('contractor_insurance')
        .select('provider, policy_number')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      serverSupabase
        .from('contractor_licenses')
        .select('name, number')
        .eq('contractor_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // 2026-05-26 audit-63 P1: profile-completeness is necessary but
    // not sufficient for "verified". The contractor must also have
    // passed admin review (verification_status='verified' or legacy
    // admin_verified=true). Surface both signals so callers can pick
    // the right gate for their use case.
    const isProfileComplete = Boolean(
      userData?.business_address &&
      userData?.license_number &&
      userData?.latitude &&
      userData?.longitude &&
      userData?.company_name
    );
    const isAdminVerified =
      userData?.verification_status === 'verified' ||
      userData?.admin_verified === true;

    const verificationStatus: VerificationStatusResponse = {
      hasBusinessAddress: Boolean(userData?.business_address),
      hasLicenseNumber: Boolean(userData?.license_number),
      hasGeolocation: Boolean(userData?.latitude && userData?.longitude),
      hasCompanyName: Boolean(userData?.company_name),
      isProfileComplete,
      // Legacy alias — old mobile builds still read `isFullyVerified`
      // expecting "I can bid now". Tighten the value so the legacy
      // key now requires BOTH profile completeness AND admin review.
      // Old callers that only meant "profile filled in" should
      // migrate to `isProfileComplete`.
      isFullyVerified: isProfileComplete && isAdminVerified,
      isAdminVerified,
      verificationStatus:
        (userData?.verification_status as
          | 'pending'
          | 'verified'
          | 'rejected'
          | null) ?? null,
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
      businessAddress: z
        .string()
        .min(1, 'Business address is required')
        .max(500),
      licenseNumber: z.string().min(1, 'License number is required').max(50),
      licenseType: z.string().max(100).optional(),
      yearsExperience: z.number().int().min(0).max(100).optional(),
      insuranceProvider: z.string().max(300).optional(),
      insurancePolicyNumber: z.string().max(100).optional(),
      insuranceExpiryDate: z.string().max(30).optional(),
    });

    const validation = await validateRequest(
      request as never,
      verificationSchema
    );
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
      throw new BadRequestError(
        licenseValidation.message || 'Invalid license number'
      );
    }

    const geocoder = new GeocodingService();
    const coordinates = await geocoder.geocodeAddress(businessAddress);

    // 2026-05-26 audit-63 P1: also set verification_status='pending'
    // (when the contractor isn't already 'verified') so the admin
    // review queue picks up the submission. Previously the POST
    // persisted profile fields but never touched the status enum,
    // so submissions sat in a "completed but not queued" limbo. We
    // never downgrade an already-verified contractor — they keep
    // their approved state even if they re-save the form to refresh
    // a detail.
    const { data: currentStatusRow } = await serverSupabase
      .from('profiles')
      .select('verification_status')
      .eq('id', user.id)
      .single();
    const shouldQueueForReview =
      currentStatusRow?.verification_status !== 'verified';

    const updateData: Record<string, unknown> = {
      company_name: companyName,
      business_address: coordinates?.formattedAddress || businessAddress,
      license_number: licenseNumber.trim().toUpperCase(),
      years_experience: yearsExperience || 0,
      updated_at: new Date().toISOString(),
      is_visible_on_map: true,
      last_location_visibility_at: new Date().toISOString(),
    };
    if (shouldQueueForReview) {
      updateData.verification_status = 'pending';
    }

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

    // 2026-05-23 audit: the previous upserts targeted
    // `onConflict: 'contractor_id'` but neither table has a unique
    // constraint on contractor_id (only the PK on id). Postgres would
    // have errored "no unique or exclusion constraint matching the
    // ON CONFLICT" — but the route ignored the return, so the
    // contractor saw "Verification submitted successfully" while the
    // insurance + license rows silently failed to land.
    //
    // Additionally the payloads omitted NOT NULL columns:
    //   contractor_insurance: start_date, policy_number, expiry_date
    //   contractor_licenses:  issuer, issue_date
    // Defaults below match the canonical capture flow (Insurance +
    // Licenses screens). The quick verification capture sets
    // start_date / issue_date = today and uses the typed name as the
    // issuer placeholder; contractors complete the proper detail via
    // /contractor/insurance + /contractor/licenses screens later.
    const today = new Date().toISOString().slice(0, 10);

    // Save insurance — manual upsert (select → update or insert)
    if (insuranceProvider && insurancePolicyNumber && insuranceExpiryDate) {
      const { data: existingInsurance } = await serverSupabase
        .from('contractor_insurance')
        .select('id')
        .eq('contractor_id', user.id)
        .eq('type', 'general_liability')
        .maybeSingle();

      const insurancePayload = {
        provider: insuranceProvider,
        policy_number: insurancePolicyNumber,
        expiry_date: insuranceExpiryDate,
        type: 'general_liability',
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { error: insuranceError } = existingInsurance
        ? await serverSupabase
            .from('contractor_insurance')
            .update(insurancePayload)
            .eq('id', existingInsurance.id)
        : await serverSupabase.from('contractor_insurance').insert({
            ...insurancePayload,
            contractor_id: user.id,
            // NOT NULL on live — verification capture doesn't ask for
            // it, so we anchor to today; contractor can correct via
            // the Insurance screen.
            start_date: today,
          });

      if (insuranceError) {
        logger.error(
          'Failed to persist contractor_insurance from verification',
          insuranceError,
          { service: 'contractor_verification', userId: user.id }
        );
        throw insuranceError;
      }
    }

    // Save license type — same manual upsert pattern
    if (licenseType) {
      const { data: existingLicense } = await serverSupabase
        .from('contractor_licenses')
        .select('id')
        .eq('contractor_id', user.id)
        .eq('name', licenseType)
        .maybeSingle();

      const licensePayload = {
        name: licenseType,
        number: licenseNumber.trim().toUpperCase(),
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      const { error: licenseError } = existingLicense
        ? await serverSupabase
            .from('contractor_licenses')
            .update(licensePayload)
            .eq('id', existingLicense.id)
        : await serverSupabase.from('contractor_licenses').insert({
            ...licensePayload,
            contractor_id: user.id,
            // Both NOT NULL on live. Issuer placeholder = the
            // licence type (e.g. 'Gas Safe', 'NICEIC') since the
            // quick form doesn't ask for the issuing body; contractor
            // updates via the Licenses screen.
            issuer: licenseType,
            issue_date: today,
          });

      if (licenseError) {
        logger.error(
          'Failed to persist contractor_licenses from verification',
          licenseError,
          { service: 'contractor_verification', userId: user.id }
        );
        throw licenseError;
      }
    }

    // 2026-05-26 audit-63 P1: previously returned `verified: true`
    // here despite never flipping profiles.verification_status or
    // admin_verified. Saving the form is "submitted for review" not
    // "approved" — only an admin's approval flips the status to
    // 'verified'. Now we also stamp verification_status='pending'
    // (unless already 'verified') in the update payload above so
    // the admin queue picks the submission up. The response below
    // reports the post-update enum value so the UI can render
    // "Pending review" / "Verified" copy correctly. We preserve a
    // `verified: boolean` field for legacy callers but with honest
    // semantics (only true once an admin has approved).
    const finalVerificationStatus = shouldQueueForReview
      ? 'pending'
      : currentStatusRow?.verification_status;
    return NextResponse.json(
      {
        message: shouldQueueForReview
          ? 'Verification information submitted for review.'
          : 'Verification information updated.',
        verified: finalVerificationStatus === 'verified',
        verificationStatus: finalVerificationStatus,
        submittedForReview: shouldQueueForReview,
        geocoded: Boolean(coordinates),
        coordinates: coordinates
          ? { latitude: coordinates.lat, longitude: coordinates.lng }
          : null,
        data: updatedUser,
      },
      { status: 200 }
    );
  }
);
