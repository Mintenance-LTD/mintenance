/**
 * Compliance Service
 * 
 * Handles building regulation compliance checking and scoring
 * for UK building standards.
 */

import type { ComplianceSeverity } from './types';

export interface ComplianceIssue {
  issue: string;
  regulation?: string;
  severity: ComplianceSeverity;
  description: string;
  recommendation: string;
}

export interface ComplianceResult {
  complianceIssues: ComplianceIssue[];
  requiresProfessionalInspection: boolean;
  complianceScore: number;
}

export class ComplianceService {
  /**
   * Process compliance issues from AI response
   */
  static processCompliance(issues: any[]): ComplianceResult {
    const processedIssues = issues.map((issue) => ({
      issue: issue.issue || 'unknown_issue',
      regulation: issue.regulation,
      severity: this.normalizeComplianceSeverity(issue.severity),
      description: issue.description || 'Compliance issue detected',
      recommendation: issue.recommendation || 'Professional inspection recommended',
    }));

    const complianceScore = this.calculateComplianceScore(processedIssues);

    return {
      complianceIssues: processedIssues,
      requiresProfessionalInspection: processedIssues.length > 0,
      complianceScore,
    };
  }

  /**
   * Normalize compliance severity
   */
  private static normalizeComplianceSeverity(severity: any): ComplianceSeverity {
    const valid: ComplianceSeverity[] = ['info', 'warning', 'violation'];
    if (valid.includes(severity)) {
      return severity;
    }
    const s = String(severity).toLowerCase();
    if (s.includes('violation') || s.includes('non-compliant')) {
      return 'violation';
    }
    if (s.includes('warning') || s.includes('potential')) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Calculate compliance score (0-100)
   * Higher score = better compliance
   */
  static calculateComplianceScore(issues: ComplianceIssue[]): number {
    if (issues.length === 0) {
      return 100; // No issues = perfect compliance
    }

    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'violation':
          score -= 30;
          break;
        case 'warning':
          score -= 15;
          break;
        case 'info':
          score -= 5;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

