/**
 * Cross-Site Scripting (XSS) Test Suite
 *
 * Comprehensive XSS vulnerability testing
 */

import { SecurityManager } from '../../SecurityManager';
import type { PenetrationTest, PenetrationTestResult, SecurityVulnerability } from '../types';

export class XssTestSuite {
  static createReflectedXSSTest(): PenetrationTest {
    const payload = "<script>alert('XSS')</script>";
    return this.createXSSTest('reflected_xss', 'Reflected XSS', payload);
  }

  static createStoredXSSTest(): PenetrationTest {
    const payload = "<img src=x onerror=alert('XSS')>";
    return this.createXSSTest('stored_xss', 'Stored XSS', payload);
  }

  static createDOMXSSTest(): PenetrationTest {
    const payload = "javascript:alert('XSS')";
    return this.createXSSTest('dom_xss', 'DOM-based XSS', payload);
  }

  static createFilterBypassXSSTest(): PenetrationTest {
    const payload = "<svg onload=alert('XSS')>";
    return this.createXSSTest('filter_bypass_xss', 'XSS Filter Bypass', payload);
  }

  private static createXSSTest(id: string, name: string, payload: string): PenetrationTest {
    return {
      id,
      name,
      description: `Tests for XSS vulnerability using payload: ${payload}`,
      category: 'xss',
      severity: 'medium',
      execute: async (): Promise<PenetrationTestResult> => {
        const startTime = Date.now();

        try {
          const validation = SecurityManager.validateTextInput(payload, {
            maxLength: 500,
            allowHtml: false,
            fieldName: 'User Input',
          });

          const vulnerabilityFound =
            validation.sanitized && (
              validation.sanitized.includes('<script>') ||
              validation.sanitized.includes('javascript:') ||
              validation.sanitized.includes('onerror=') ||
              validation.sanitized.includes('onload=')
            );

          let vulnerability: SecurityVulnerability | undefined;

          if (vulnerabilityFound) {
            vulnerability = {
              id: `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'xss',
              severity: 'medium',
              title: `Cross-Site Scripting (XSS) in ${name}`,
              description: `The application appears vulnerable to XSS attacks using payload: ${payload}`,
              impact: 'Attackers could execute malicious scripts in users\' browsers, steal cookies, session tokens, or perform actions on behalf of users.',
              remediation: 'Implement proper input validation, output encoding, Content Security Policy (CSP), and use secure coding practices.',
              cwe: 'CWE-79',
              owasp: 'A03:2021 – Injection',
              affectedComponents: ['User input fields', 'Display components', 'Message rendering'],
              proofOfConcept: `Input: ${payload}\nSanitized: ${validation.sanitized}`,
              discoveredAt: Date.now(),
              status: 'open',
            };
          }

          return {
            testId: id,
            testName: name,
            category: 'xss',
            success: true,
            vulnerabilityFound,
            vulnerability,
            executionTime: Date.now() - startTime,
            details: vulnerabilityFound
              ? `XSS vulnerability detected with payload: ${payload}`
              : `Input properly sanitized. No XSS vulnerability found.`,
            evidence: {
              payload,
              validation,
            },
          };
        } catch (error) {
          return {
            testId: id,
            testName: name,
            category: 'xss',
            success: false,
            vulnerabilityFound: false,
            executionTime: Date.now() - startTime,
            details: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    };
  }
}