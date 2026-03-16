/**
 * Audit Summary Calculator
 *
 * Calculates security audit metrics and scores
 */

import type { SecurityAuditReport, SecurityVulnerability, PenetrationTestResult } from '../types';

export class AuditSummaryCalculator {
  /**
   * Calculate comprehensive audit summary
   */
  static calculateAuditSummary(
    testResults: PenetrationTestResult[],
    vulnerabilities: SecurityVulnerability[]
  ): SecurityAuditReport['summary'] {
    const totalTests = testResults.length;
    const passed = testResults.filter(r => r.success && !r.vulnerabilityFound).length;
    const failed = testResults.filter(r => !r.success || r.vulnerabilityFound).length;

    const vulnerabilityCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
    };

    const overallScore = this.calculateOverallScore(vulnerabilityCounts);
    const riskLevel = this.determineRiskLevel(vulnerabilityCounts);

    return {
      totalTests,
      passed,
      failed,
      vulnerabilities: vulnerabilityCounts,
      overallScore,
      riskLevel,
    };
  }

  /**
   * Calculate overall security score (0-100)
   */
  private static calculateOverallScore(vulnerabilityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }): number {
    const maxScore = 100;
    const deductions =
      (vulnerabilityCounts.critical * 25) +
      (vulnerabilityCounts.high * 15) +
      (vulnerabilityCounts.medium * 10) +
      (vulnerabilityCounts.low * 5) +
      (vulnerabilityCounts.info * 1);

    return Math.max(0, maxScore - deductions);
  }

  /**
   * Determine risk level based on vulnerabilities
   */
  private static determineRiskLevel(vulnerabilityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }): 'very_low' | 'low' | 'medium' | 'high' | 'critical' {
    if (vulnerabilityCounts.critical > 0) return 'critical';
    if (vulnerabilityCounts.high > 0) return 'high';
    if (vulnerabilityCounts.medium > 2) return 'medium';
    if (vulnerabilityCounts.low > 5) return 'low';
    return 'very_low';
  }
}