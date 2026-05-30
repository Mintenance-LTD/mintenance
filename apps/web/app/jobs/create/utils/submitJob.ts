/**
 * Job submission utility with geocoding support
 */

import type { JobFormData } from './validation';
import { logger } from '@mintenance/shared';

/**
 * Geocode an address using Google Maps Geocoding API.
 *
 * 2026-05-28 audit-90 P1: always biased to the UK via
 * `&region=uk&components=country:GB`. Without it, "65 Gloucester Road"
 * resolved to London SW7 instead of the homeowner's Cheltenham
 * property, putting the job ~143 km outside every local contractor's
 * radius. Server-side `JobCreationService.resolveJobCoordinates`
 * still overrides this for property-backed posts; the client geocode
 * is a fast best-effort that just shouldn't make things worse.
 */
async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('Google Maps API key not configured, skipping geocoding', {
        service: 'app',
      });
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=uk&components=country:GB&key=${apiKey}`
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

    logger.warn(
      `Geocoding failed: ${data.status} ${data.error_message || ''}`,
      { service: 'app' }
    );
    return null;
  } catch (error) {
    logger.error('Error geocoding address:', error, { service: 'app' });
    return null;
  }
}

interface BuildingAssessmentData {
  damageAssessment: {
    damageType: string;
    severity: string;
    confidence: number;
    description: string;
  };
  safetyHazards: {
    hasSafetyHazards: boolean;
    overallSafetyScore: number;
    criticalFlags: string[];
  };
  urgency?: {
    urgency: string;
    reasoning: string;
  };
}

interface SubmitJobOptions {
  formData: JobFormData;
  photoUrls: string[];
  csrfToken: string;
  aiAssessment?: BuildingAssessmentData;
  /** ISO date (YYYY-MM-DD) — homeowner's preferred start date from the
   *  Budget step. Stashed in `requirements.preferred_start_date` until
   *  the jobs table grows a dedicated column. */
  preferredDate?: string;
  /** 2026-05-13 (Hire-Again loop closure): UUID of a contractor the
   *  homeowner wants to re-engage. Passed straight through to
   *  /api/jobs which fires a direct "invited bid" notification on
   *  top of the normal nearby-broadcast. */
  preferredContractorId?: string;
  /** 2026-05-22: extra keys merged into the `requirements` jsonb. Used
   *  by no-photo flows (quick-create) to set
   *  `contractor_before_photos: true` so the server's photo gate
   *  accepts the post. */
  extraRequirements?: Record<string, unknown>;
}

interface SubmitJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

/**
 * Submit job creation request to API
 */
export async function submitJob({
  formData,
  photoUrls,
  csrfToken,
  aiAssessment,
  preferredDate,
  preferredContractorId,
  extraRequirements,
}: SubmitJobOptions): Promise<SubmitJobResult> {
  // CRITICAL FIX: Fetch a fresh CSRF token right before submission to ensure cookie and header match
  // This ensures consistency with the image upload which also fetches a fresh token
  let tokenToUse = csrfToken;
  try {
    const tokenResponse = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include',
    });
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      tokenToUse = tokenData.token;

      // Small delay to ensure cookie is processed by browser before next request
      await new Promise((resolve) => setTimeout(resolve, 50));
    } else {
      logger.warn(
        '[Submit] Failed to fetch fresh CSRF token, using provided token',
        { service: 'app' }
      );
    }
  } catch (tokenError) {
    logger.warn(
      `[Submit] Error fetching fresh CSRF token, using provided token: ${tokenError}`,
      { service: 'app' }
    );
  }

  if (!tokenToUse) {
    throw new Error('CSRF token is required for job submission');
  }

  // Geocode the location before submitting
  const coordinates = await geocodeAddress(formData.location?.trim() || '');

  const propertyIdValue = formData.property_id || null;

  const requestBody: {
    title: string;
    description: string;
    location: string;
    category: string;
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
    requiredSkills: string[];
    property_id: string | null;
    photoUrls: string[];
    latitude?: number;
    longitude?: number;
    requirements?: Record<string, unknown>;
    is_rental_property?: boolean;
    tenancy_metadata?: Record<string, unknown>;
    preferred_contractor_id?: string;
    room_ids?: string[];
  } = {
    title: formData.title.trim(),
    description: formData.description?.trim() || '',
    location: formData.location?.trim() || '',
    category: formData.category,
    requiredSkills: formData.requiredSkills || [],
    property_id: propertyIdValue,
    photoUrls,
  };

  if (formData.urgency) requestBody.urgency = formData.urgency;

  // R6 #19 landlord / tenancy fields. We forward the booleans + email
  // intent; the server can look up payer_user_id from the email in a
  // follow-up step (or leave NULL so the poster pays).
  if (formData.is_rental_property === true) {
    requestBody.is_rental_property = true;
  }
  if (formData.who_pays === 'someone_else' && formData.payer_email) {
    requestBody.tenancy_metadata = {
      who_pays: 'someone_else',
      payer_email: formData.payer_email.trim().toLowerCase(),
    };
  }

  // Add geocoded coordinates if available
  if (coordinates) {
    requestBody.latitude = coordinates.latitude;
    requestBody.longitude = coordinates.longitude;
  }

  // Hire-Again loop signal — UUID only, server validates as z.uuid()
  if (preferredContractorId) {
    requestBody.preferred_contractor_id = preferredContractorId;
  }

  // Property Rooms Slice 1: forward the homeowner-selected room ids so
  // the server can snapshot them into job_rooms. Server validates each
  // as a UUID and silently drops any room id that doesn't belong to
  // the selected property.
  if (formData.room_ids && formData.room_ids.length > 0) {
    requestBody.room_ids = formData.room_ids;
  }

  // AI assessment + preferred date are stashed inside `requirements`
  // (a generic jsonb on the jobs table — the schema accepts any keys
  // under it). The previous version sent `aiAssessmentMetadata` as a
  // top-level key, which the strict schema in @mintenance/api-contracts
  // REJECTED with "Unrecognized key" — every photo-bearing submit that
  // ran the AI assessment failed with a generic 400. Bug confirmed
  // 2026-05-12 user report (the "selectors don't work" / "post job"
  // appears stuck symptom).
  const reqs: Record<string, unknown> = { ...(extraRequirements ?? {}) };
  if (aiAssessment) reqs.ai_assessment_metadata = aiAssessment;
  if (preferredDate) reqs.preferred_start_date = preferredDate;
  if (Object.keys(reqs).length > 0) {
    requestBody.requirements = reqs;
  }

  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      credentials: 'include', // Ensure cookies are sent
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': tokenToUse, // Use the fresh token
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorData: unknown = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, read as text
          const textError = await response.text().catch(() => 'Unknown error');
          errorData = {
            error: textError || `Failed to create job (${response.status})`,
          };
        }
      } else {
        // Non-JSON response
        const textError = await response.text().catch(() => 'Unknown error');
        errorData = {
          error: textError || `Failed to create job (${response.status})`,
        };
      }

      logger.error(
        'Job submission failed:',
        {
          status: response.status,
          statusText: response.statusText,
          contentType,
          error: errorData,
        },
        { service: 'app' }
      );

      // Safely extract error message from error data object
      let errorMessage = `Failed to create job (${response.status})`;
      if (errorData && typeof errorData === 'object') {
        const errObj = errorData as Record<string, unknown>;
        const errStr = errObj.error || errObj.message || errObj.details;
        if (typeof errStr === 'string') {
          errorMessage = errStr;
        } else if (errStr && typeof errStr === 'object') {
          errorMessage = JSON.stringify(errStr);
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    // logger.info('Job creation API response:', data, { service: 'app' });

    // The API returns { job: { id, ... } }
    const jobId = data.job?.id || data.jobId || data.id;

    if (!jobId) {
      logger.error(
        'No job ID in response. Full response data:',
        JSON.stringify(data, null, 2),
        { service: 'app' }
      );
      return {
        success: false,
        error: 'Job created but no ID returned',
      };
    }

    // logger.info('Job created successfully with ID:', jobId, { service: 'app' });

    // Trigger AI assessment if photos were uploaded (non-blocking)
    if (photoUrls && photoUrls.length > 0 && jobId) {
      fetch('/api/building-surveyor/assess', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': tokenToUse,
        },
        body: JSON.stringify({
          imageUrls: photoUrls,
          jobId: jobId, // Pass the job ID to link assessment
          context: {
            location: formData.location,
            propertyType: 'residential',
          },
        }),
      }).catch((error) => {
        // Don't fail job creation if assessment fails
        logger.warn(`Failed to trigger AI assessment: ${error}`, {
          service: 'app',
        });
      });
    }

    return {
      success: true,
      jobId: jobId,
    };
  } catch (error) {
    logger.error('Job submission exception:', error, { service: 'app' });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
