/**
 * Recommendation Engine
 *
 * Generates security recommendations based on findings
 */

import type { SecurityVulnerability } from '../types';

export class RecommendationEngine {
  /**
   * Generate security recommendations based on vulnerabilities
   */
  static generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];

    // Critical vulnerabilities
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      recommendations.push('🚨 CRITICAL: Address all critical severity vulnerabilities immediately to prevent potential security breaches.');
    }

    // High severity vulnerabilities
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      recommendations.push('⚠️ HIGH PRIORITY: Remediate high severity vulnerabilities within 7 days to reduce security risk.');
    }

    // Input validation
    const injectionVulns = vulnerabilities.filter(v => v.type === 'injection' || v.type === 'xss');
    if (injectionVulns.length > 0) {
      recommendations.push('🛡️ INPUT VALIDATION: Implement comprehensive input validation and sanitization across all user inputs.');
    }

    // Authentication issues
    const authVulns = vulnerabilities.filter(v => v.type === 'auth');
    if (authVulns.length > 0) {
      recommendations.push('🔐 AUTHENTICATION: Strengthen authentication mechanisms and implement proper session management.');
    }

    // Access control issues
    const accessVulns = vulnerabilities.filter(v => v.type === 'access_control');
    if (accessVulns.length > 0) {
      recommendations.push('👮 ACCESS CONTROL: Review and enhance authorization controls and role-based access management.');
    }

    // Data protection
    const dataVulns = vulnerabilities.filter(v => v.type === 'data_exposure');
    if (dataVulns.length > 0) {
      recommendations.push('🔒 DATA PROTECTION: Implement proper data encryption, secure storage, and privacy controls.');
    }

    // General recommendations
    if (vulnerabilities.length === 0) {
      recommendations.push('✅ EXCELLENT: No vulnerabilities detected. Continue following security best practices.');
    } else {
      recommendations.push('📊 MONITORING: Implement continuous security monitoring and regular vulnerability assessments.');
      recommendations.push('🎓 TRAINING: Provide security awareness training to development team members.');
      recommendations.push('📝 DOCUMENTATION: Document security controls and incident response procedures.');
    }

    return recommendations;
  }
}