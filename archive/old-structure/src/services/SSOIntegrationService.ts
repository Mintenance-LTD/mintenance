/**
 * @deprecated This file has been refactored into smaller modules.
 * Please import from src/services/sso-integration/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { SSOIntegrationService as NewSSOIntegrationService } from './sso-integration';

// Re-export the new service for backward compatibility
export { NewSSOIntegrationService as SSOIntegrationService };
export * from './sso-integration';
