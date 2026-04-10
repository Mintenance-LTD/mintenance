/**
 * ApiProtection.ts - Facade
 * Re-exports all public API from sub-modules. No consumer import changes needed.
 */

export type {
  ApiRequest,
  ApiResponse,
  SecurityViolation,
} from './api-protection/types';
export {
  ApiProtectionService,
  apiProtectionService,
} from './api-protection/ApiProtectionService';

import apiProtectionServiceDefault from './api-protection/ApiProtectionService';
