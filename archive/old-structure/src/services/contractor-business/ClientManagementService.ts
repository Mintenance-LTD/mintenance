/**
 * @deprecated This file has been refactored into smaller modules.
 * Please import from src/services/client-management/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { ClientManagementService as NewClientManagementService } from '../client-management';

// Re-export the new service for backward compatibility
export { NewClientManagementService as ClientManagementService };
export * from '../client-management';
