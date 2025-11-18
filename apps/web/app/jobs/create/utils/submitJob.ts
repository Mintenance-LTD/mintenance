/**
 * Job submission utility
 */

import type { JobFormData } from './validation';

interface SubmitJobOptions {
  formData: JobFormData;
  photoUrls: string[];
  csrfToken: string;
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
}: SubmitJobOptions): Promise<SubmitJobResult> {
  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        category: formData.category,
        urgency: formData.urgency,
        budget: parseFloat(formData.budget),
        requiredSkills: formData.requiredSkills,
        property_id: formData.property_id || null,
        photoUrls,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to create job',
      };
    }

    const data = await response.json();
    return {
      success: true,
      jobId: data.job?.id || data.jobId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

