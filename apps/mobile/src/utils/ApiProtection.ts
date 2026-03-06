/**
 * ApiProtection.ts - Facade
 * Re-exports all public API from sub-modules. No consumer import changes needed.
 */
 
export type { ApiRequest, ApiResponse, SecurityConfig, AbusePattern, SecurityViolation } from "./api-protection/types";
export { DEFAULT_SECURITY_CONFIG, DEFAULT_ABUSE_PATTERNS } from "./api-protection/types";
export { RateLimitGuard } from "./api-protection/RateLimitGuard";
export { DDoSDetector } from "./api-protection/DDoSDetector";
export { AbuseDetector } from "./api-protection/AbuseDetector";
export { RequestValidator } from "./api-protection/RequestValidator";
export { ApiProtectionService, apiProtectionService } from "./api-protection/ApiProtectionService";

import apiProtectionServiceDefault from "./api-protection/ApiProtectionService";
export default apiProtectionServiceDefault;
