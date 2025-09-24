/**
 * Security Audit and Penetration Testing Types
 *
 * Type definitions for security testing framework
 */

export interface SecurityVulnerability {
  id: string;
  type: 'injection' | 'xss' | 'csrf' | 'auth' | 'access_control' | 'data_exposure' | 'config' | 'crypto' | 'business_logic';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  remediation: string;
  cwe?: string; // Common Weakness Enumeration
  owasp?: string; // OWASP Top 10 reference
  affectedComponents: string[];
  proofOfConcept?: string;
  discoveredAt: number;
  status: 'open' | 'confirmed' | 'fixed' | 'false_positive';
}

export interface PenetrationTestResult {
  testId: string;
  testName: string;
  category: string;
  success: boolean;
  vulnerabilityFound: boolean;
  vulnerability?: SecurityVulnerability;
  executionTime: number;
  details: string;
  evidence?: any;
}

export interface SecurityAuditReport {
  auditId: string;
  timestamp: number;
  version: string;
  environment: 'development' | 'staging' | 'production';
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    overallScore: number; // 0-100
    riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'critical';
  };
  testResults: PenetrationTestResult[];
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  complianceChecks: {
    owasp: boolean;
    gdpr: boolean;
    ccpa: boolean;
    pci_dss?: boolean;
  };
}

export interface PenetrationTestSuite {
  name: string;
  description: string;
  tests: PenetrationTest[];
  prerequisites?: string[];
}

export interface PenetrationTest {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<PenetrationTestResult>;
}