/**
 * @deprecated This file has been refactored into smaller modules.
 * Please import from src/services/marketing-management/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { MarketingManagementService as NewMarketingManagementService } from '../marketing-management';

// Re-export the new service for backward compatibility
export { NewMarketingManagementService as MarketingManagementService };
export * from '../marketing-management';
