import { logger } from '@mintenance/shared';
import { validateURLs } from '@/lib/security/url-validation';
import { getConfig } from '../config/BuildingSurveyorConfig';

export interface ValidationResult {
  openaiApiKey: string;
  validatedImageUrls: string[];
}

/**
 * Validates configuration and image URLs before assessment.
 * Throws on missing API key, empty URLs, or invalid URLs.
 */
export async function validateInput(
  imageUrls: string[]
): Promise<ValidationResult> {
  const config = getConfig();
  if (!config.openaiApiKey) {
    logger.warn('OpenAI API key not configured', {
      service: 'BuildingSurveyorService',
    });
    throw new Error('AI assessment service is not configured');
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('At least one image is required for assessment');
  }

  // Data URIs are embedded binary — no server-side request is made, so SSRF checks don't apply.
  // Remote URLs must pass allowlist + private-IP checks.
  const dataUris = imageUrls.filter((u) => u.startsWith('data:image/'));
  const remoteUrls = imageUrls.filter((u) => !u.startsWith('data:'));

  // SECURITY: Validate remote URLs before sending to OpenAI
  const urlValidation =
    remoteUrls.length > 0
      ? await validateURLs(remoteUrls, true)
      : { valid: [], invalid: [] };

  if (urlValidation.invalid.length > 0) {
    logger.warn('Invalid image URLs rejected for building assessment', {
      service: 'BuildingSurveyorService',
      invalidUrls: urlValidation.invalid,
    });
    throw new Error(
      `Invalid image URLs: ${urlValidation.invalid.map((i) => i.error).join(', ')}`
    );
  }

  return {
    openaiApiKey: config.openaiApiKey,
    validatedImageUrls: [...urlValidation.valid, ...dataUris],
  };
}
