/**
 * Security Audit Service
 *
 * Main service class for comprehensive security auditing and penetration testing
 */

import { logger } from '../../logger';
import { ComplianceManager } from '../managers/ComplianceManager';
import { RecommendationEngine } from '../managers/RecommendationEngine';
import { AuditSummaryCalculator } from '../managers/AuditSummaryCalculator';
import { SqlInjectionTestSuite } from '../testSuites/SqlInjectionTests';
import { XssTestSuite } from '../testSuites/XssTests';
import { AuthenticationTestSuite } from '../testSuites/AuthenticationTests';
import { AuthorizationTestSuite } from '../testSuites/AuthorizationTests';
import type {
  SecurityAuditReport,
  SecurityVulnerability,
  PenetrationTestResult,
  PenetrationTestSuite
} from '../types';

export class SecurityAuditService {
  private vulnerabilities: SecurityVulnerability[] = [];
  private testResults: PenetrationTestResult[] = [];
  private auditHistory: SecurityAuditReport[] = [];
  private isRunning = false;
  private testSuites: Map<string, PenetrationTestSuite> = new Map();

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Initialize penetration test suites
   */
  private initializeTestSuites(): void {
    // SQL Injection Tests
    this.testSuites.set('sql_injection', {
      name: 'SQL Injection Tests',
      description: 'Tests for SQL injection vulnerabilities',
      tests: [
        SqlInjectionTestSuite.createBasicSQLInjectionTest(),
        SqlInjectionTestSuite.createUnionSQLInjectionTest(),
        SqlInjectionTestSuite.createTimeBasedSQLInjectionTest(),
        SqlInjectionTestSuite.createErrorBasedSQLInjectionTest(),
      ],
    });

    // XSS Tests
    this.testSuites.set('xss', {
      name: 'Cross-Site Scripting Tests',
      description: 'Tests for XSS vulnerabilities',
      tests: [
        XssTestSuite.createReflectedXSSTest(),
        XssTestSuite.createStoredXSSTest(),
        XssTestSuite.createDOMXSSTest(),
        XssTestSuite.createFilterBypassXSSTest(),
      ],
    });

    // Authentication Tests
    this.testSuites.set('authentication', {
      name: 'Authentication Security Tests',
      description: 'Tests for authentication vulnerabilities',
      tests: [
        AuthenticationTestSuite.createBruteForceTest(),
        AuthenticationTestSuite.createWeakPasswordTest(),
        AuthenticationTestSuite.createSessionManagementTest(),
        AuthenticationTestSuite.createJWTSecurityTest(),
        AuthenticationTestSuite.createBiometricFallbackTest(),
      ],
    });

    // Authorization Tests
    this.testSuites.set('authorization', {
      name: 'Authorization Security Tests',
      description: 'Tests for authorization and access control vulnerabilities',
      tests: [
        AuthorizationTestSuite.createPrivilegeEscalationTest(),
        AuthorizationTestSuite.createIdorTest(),
        AuthorizationTestSuite.createRoleBasedAccessTest(),
        AuthorizationTestSuite.createResourceAccessTest(),
      ],
    });

    logger.info('SecurityAudit', 'Penetration test suites initialized', {
      suiteCount: this.testSuites.size,
      totalTests: Array.from(this.testSuites.values()).reduce((sum, suite) => sum + suite.tests.length, 0),
    });
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit(environment: 'development' | 'staging' | 'production' = 'development'): Promise<SecurityAuditReport> {
    if (this.isRunning) {
      throw new Error('Security audit is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('SecurityAudit', 'Starting comprehensive security audit', {
      auditId,
      environment,
      timestamp: new Date().toISOString(),
    });

    try {
      this.testResults = [];
      this.vulnerabilities = [];

      // Run all test suites
      for (const [suiteName, suite] of this.testSuites.entries()) {
        logger.info('SecurityAudit', `Running test suite: ${suite.name}`, {
          testCount: suite.tests.length,
        });

        for (const test of suite.tests) {
          try {
            const result = await test.execute();
            this.testResults.push(result);

            if (result.vulnerability) {
              this.vulnerabilities.push(result.vulnerability);
            }

            logger.debug('SecurityAudit', `Test completed: ${test.name}`, {
              success: result.success,
              vulnerabilityFound: result.vulnerabilityFound,
            });
          } catch (error) {
            logger.error('SecurityAudit', `Test failed: ${test.name}`, error);
            this.testResults.push({
              testId: test.id,
              testName: test.name,
              category: test.category,
              success: false,
              vulnerabilityFound: false,
              executionTime: 0,
              details: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      }

      // Generate compliance checks
      const complianceChecks = await ComplianceManager.performComplianceChecks(this.vulnerabilities);

      // Calculate metrics
      const summary = AuditSummaryCalculator.calculateAuditSummary(this.testResults, this.vulnerabilities);

      // Generate recommendations
      const recommendations = RecommendationEngine.generateRecommendations(this.vulnerabilities);

      const report: SecurityAuditReport = {
        auditId,
        timestamp: Date.now(),
        version: '1.0.0',
        environment,
        summary,
        testResults: this.testResults,
        vulnerabilities: this.vulnerabilities,
        recommendations,
        complianceChecks,
      };

      // Store report in history
      this.auditHistory.push(report);

      // Keep only last 10 reports
      if (this.auditHistory.length > 10) {
        this.auditHistory = this.auditHistory.slice(-10);
      }

      const executionTime = Date.now() - startTime;
      logger.info('SecurityAudit', 'Security audit completed', {
        auditId,
        executionTime,
        totalTests: summary.totalTests,
        vulnerabilities: summary.vulnerabilities,
        overallScore: summary.overallScore,
        riskLevel: summary.riskLevel,
      });

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteName: string): Promise<PenetrationTestResult[]> {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteName}`);
    }

    logger.info('SecurityAudit', `Running test suite: ${suite.name}`);

    const results: PenetrationTestResult[] = [];

    for (const test of suite.tests) {
      try {
        const result = await test.execute();
        results.push(result);
      } catch (error) {
        logger.error('SecurityAudit', `Test failed: ${test.name}`, error);
        results.push({
          testId: test.id,
          testName: test.name,
          category: test.category,
          success: false,
          vulnerabilityFound: false,
          executionTime: 0,
          details: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  }

  /**
   * Get latest audit report
   */
  getLatestAuditReport(): SecurityAuditReport | null {
    return this.auditHistory.length > 0 ? this.auditHistory[this.auditHistory.length - 1] : null;
  }

  /**
   * Get audit history
   */
  getAuditHistory(): SecurityAuditReport[] {
    return [...this.auditHistory];
  }

  /**
   * Get test suites information
   */
  getTestSuites(): Array<{ name: string; description: string; testCount: number }> {
    return Array.from(this.testSuites.entries()).map(([key, suite]) => ({
      name: suite.name,
      description: suite.description,
      testCount: suite.tests.length,
    }));
  }

  /**
   * Get vulnerability by ID
   */
  getVulnerability(id: string): SecurityVulnerability | undefined {
    return this.vulnerabilities.find(v => v.id === id);
  }

  /**
   * Update vulnerability status
   */
  updateVulnerabilityStatus(id: string, status: SecurityVulnerability['status']): boolean {
    const vulnerability = this.vulnerabilities.find(v => v.id === id);
    if (vulnerability) {
      vulnerability.status = status;
      logger.info('SecurityAudit', 'Vulnerability status updated', { id, status });
      return true;
    }
    return false;
  }

  /**
   * Generate security compliance report
   */
  generateComplianceReport(): {
    standards: Record<string, { compliant: boolean; issues: string[] }>;
    summary: string;
  } {
    return ComplianceManager.generateComplianceReport(this.vulnerabilities);
  }
}