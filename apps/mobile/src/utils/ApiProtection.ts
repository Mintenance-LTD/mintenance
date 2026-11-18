/**
 * ApiProtection.ts - Facade
 * Re-exports all public API from sub-modules. No consumer import changes needed.
 */

import { apiProtectionService as apiProtectionServiceDefault } from './api-protection/ApiProtectionService';

export type {
  ApiRequest,
  ApiResponse,
  SecurityViolation,
} from './api-protection/types';
export {
  ApiProtectionService,
  apiProtectionService,
} from './api-protection/ApiProtectionService';
