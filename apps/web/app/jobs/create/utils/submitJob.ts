/**
 * Job submission utility with geocoding support
 */

import type { JobFormData } from './validation';
import { logger } from '@mintenance/shared';

/**
 * Geocode an address using Google Maps Geocoding API
 */
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      logger.warn('Google Maps API key not configured, skipping geocoding', { service: 'app' });
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
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

    logger.warn('Geocoding failed:', data.status, data.error_message', { service: 'app' });
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
      await new Promise(resolve => setTimeout(resolve, 50));
    } else {
      logger.warn('[Submit] Failed to fetch fresh CSRF token, using provided token', { service: 'app' });
    }
  } catch (tokenError) {
    logger.warn('[Submit] Error fetching fresh CSRF token, using provided token:', tokenError', { service: 'app' });
  }

  if (!tokenToUse) {
    throw new Error('CSRF token is required for job submission');
  }

  // Geocode the location before submitting
  const coordinates = await geocodeAddress(formData.location?.trim() || '');

  const budgetValue = typeof formData.budget === 'number'
    ? formData.budget
    : parseFloat(String(formData.budget));
  const propertyIdValue = formData.property_id || null;

  const requestBody: {
    title: string;
    description: string;
    location: string;
    category: string;
    budget: number;
    requiredSkills: string[];
    property_id: string | null;
    photoUrls: string[];
    latitude?: number;
    longitude?: number;
    aiAssessmentMetadata?: BuildingAssessmentData;
  } = {
    title: formData.title.trim(),
    description: formData.description?.trim() || '',
    location: formData.location?.trim() || '',
    category: formData.category,
    // Don't send urgency field - it's not supported by the API/database
    // Ensure budget is always a number for the API
    budget: budgetValue,
    requiredSkills: formData.requiredSkills || [],
    property_id: propertyIdValue,
    photoUrls,
  };

  // Add geocoded coordinates if available
  if (coordinates) {
    requestBody.latitude = coordinates.latitude;
    requestBody.longitude = coordinates.longitude;
  }

  // Optionally attach AI assessment metadata (non-blocking)
  // The API will store this for future use (e.g., matching, insights)
  if (aiAssessment) {
    requestBody.aiAssessmentMetadata = aiAssessment;
  }

  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      credentials: 'include', // Ensure cookies are sent
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': tokenToUse,  // Use the fresh token
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
          errorData = { error: textError || `Failed to create job (${response.status})` };
        }
      } else {
        // Non-JSON response
        const textError = await response.text().catch(() => 'Unknown error');
        errorData = { error: textError || `Failed to create job (${response.status})` };
      }
      
      logger.error('Job submission failed:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        error: errorData
      }', { service: 'app' });
      
      const errorMessage = errorData.error || errorData.message || errorData.details || `Failed to create job (${response.status})`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    // logger.info('Job creation API response:', data', { service: 'app' });

    // The API returns { job: { id, ... } }
    const jobId = data.job?.id || data.jobId || data.id;

    if (!jobId) {
      logger.error('No job ID in response. Full response data:', JSON.stringify(data, null, 2', { service: 'app' }));
      return {
        success: false,
        error: 'Job created but no ID returned',
      };
    }

    // logger.info('Job created successfully with ID:', jobId', { service: 'app' });

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
      }).catch(error => {
        // Don't fail job creation if assessment fails
        logger.warn('Failed to trigger AI assessment:', error, { service: 'app' });
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
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

