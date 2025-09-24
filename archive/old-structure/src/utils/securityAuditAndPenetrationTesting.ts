/**
 * Security Audit and Penetration Testing Service
 *
 * DEPRECATED: This file has been refactored into modular components.
 * Use the new security module: src/utils/security/
 *
 * @deprecated Use SecurityAuditService from src/utils/security/ instead
 */

// Re-export from the new modular structure
export {
  securityAuditService,
  SecurityAuditService,
  type SecurityVulnerability,
  type PenetrationTestResult,
  type SecurityAuditReport,
  type PenetrationTestSuite,
  type PenetrationTest
} from './security';

// Legacy class for backward compatibility
export class SecurityAuditAndPenetrationTestingService {
  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  async runSecurityAudit(environment: 'development' | 'staging' | 'production' = 'development') {
    const { securityAuditService } = await import('./security');
    return securityAuditService.runSecurityAudit(environment);
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  async runTestSuite(suiteName: string) {
    const { securityAuditService } = await import('./security');
    return securityAuditService.runTestSuite(suiteName);
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  getLatestAuditReport() {
    throw new Error('Use securityAuditService.getLatestAuditReport() from src/utils/security/ instead');
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  getAuditHistory() {
    throw new Error('Use securityAuditService.getAuditHistory() from src/utils/security/ instead');
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  getTestSuites() {
    throw new Error('Use securityAuditService.getTestSuites() from src/utils/security/ instead');
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  getVulnerability(id: string) {
    throw new Error('Use securityAuditService.getVulnerability() from src/utils/security/ instead');
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  updateVulnerabilityStatus(id: string, status: any) {
    throw new Error('Use securityAuditService.updateVulnerabilityStatus() from src/utils/security/ instead');
  }

  /**
   * @deprecated Use securityAuditService from src/utils/security/ instead
   */
  generateComplianceReport() {
    throw new Error('Use securityAuditService.generateComplianceReport() from src/utils/security/ instead');
  }
}

// Export singleton instance for backward compatibility
export const securityAuditAndPenetrationTestingService = new SecurityAuditAndPenetrationTestingService();

export default securityAuditAndPenetrationTestingService;