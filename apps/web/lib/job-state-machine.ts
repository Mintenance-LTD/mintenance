/**
 * Re-export from shared package for backward compatibility.
 * All new code should import from '@mintenance/shared' directly.
 */
export {
  isValidStatusTransition,
  getValidNextStatuses,
  validateStatusTransition,
  isTerminalStatus,
} from '@mintenance/shared';
export type { JobStatus } from '@mintenance/shared';
