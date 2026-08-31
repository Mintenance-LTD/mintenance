import { logger } from '@mintenance/shared';

/** Validate a configurable VLM endpoint and block common SSRF targets. */
export function validateVlmEndpoint(raw: string): string {
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      logger.warn(
        'MINT_AI_VLM_ENDPOINT must be HTTPS in production, ignoring',
        { service: 'AssessmentGenerator' }
      );
      return '';
    }
    if (!['https:', 'http:'].includes(url.protocol)) return '';

    const hostname = url.hostname;
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal') ||
      hostname === '[::1]'
    ) {
      logger.warn('MINT_AI_VLM_ENDPOINT points to reserved address, ignoring', {
        service: 'AssessmentGenerator',
      });
      return '';
    }
    return raw;
  } catch {
    logger.warn('MINT_AI_VLM_ENDPOINT is not a valid URL, ignoring', {
      service: 'AssessmentGenerator',
    });
    return '';
  }
}
