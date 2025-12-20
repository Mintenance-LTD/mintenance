/**
 * Security Module - Main Export
 *
 * Provides consolidated access to security audit and penetration testing functionality
 */

export { SecurityAuditService } from './core/SecurityAuditService';
export { ComplianceManager } from './managers/ComplianceManager';
export { RecommendationEngine } from './managers/RecommendationEngine';
export { AuditSummaryCalculator } from './managers/AuditSummaryCalculator';

export { SqlInjectionTestSuite } from './testSuites/SqlInjectionTests';
export { XssTestSuite } from './testSuites/XssTests';
export { AuthenticationTestSuite } from './testSuites/AuthenticationTests';
export { AuthorizationTestSuite } from './testSuites/AuthorizationTests';

export type {
  SecurityVulnerability,
  PenetrationTestResult,
  SecurityAuditReport,
  PenetrationTestSuite,
  PenetrationTest
} from './types';

// Create and export singleton instance
import { SecurityAuditService } from './core/SecurityAuditService';
export const securityAuditService = new SecurityAuditService();
export default securityAuditService;