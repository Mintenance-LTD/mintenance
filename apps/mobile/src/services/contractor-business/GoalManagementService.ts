/**
 * @deprecated This file has been refactored into smaller modules.
 * Please import from src/services/goal-management/index.ts instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { GoalManagementService as NewGoalManagementService } from '../goal-management';

// Re-export the new service for backward compatibility
export { NewGoalManagementService as GoalManagementService };
export * from '../goal-management';
