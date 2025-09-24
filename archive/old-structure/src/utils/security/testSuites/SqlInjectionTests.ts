/**
 * SQL Injection Test Suite
 *
 * Comprehensive SQL injection vulnerability testing
 */

import { SecurityManager } from '../../SecurityManager';
import { logger } from '../../logger';
import type { PenetrationTest, PenetrationTestResult, SecurityVulnerability } from '../types';

export class SqlInjectionTestSuite {
  static createBasicSQLInjectionTest(): PenetrationTest {
    const payload = "' OR '1'='1";
    return this.createSQLInjectionTest('basic_sqli', 'Basic SQL Injection', payload);
  }

  static createUnionSQLInjectionTest(): PenetrationTest {
    const payload = "' UNION SELECT 1,2,3--";
    return this.createSQLInjectionTest('union_sqli', 'UNION-based SQL Injection', payload);
  }

  static createTimeBasedSQLInjectionTest(): PenetrationTest {
    const payload = "'; WAITFOR DELAY '00:00:05'--";
    return this.createSQLInjectionTest('time_based_sqli', 'Time-based Blind SQL Injection', payload);
  }

  static createErrorBasedSQLInjectionTest(): PenetrationTest {
    const payload = "' AND (SELECT COUNT(*) FROM information_schema.tables)>0--";
    return this.createSQLInjectionTest('error_based_sqli', 'Error-based SQL Injection', payload);
  }

  private static createSQLInjectionTest(id: string, name: string, payload: string): PenetrationTest {
    return {
      id,
      name,
      description: `Tests for SQL injection using payload: ${payload}`,
      category: 'sql_injection',
      severity: 'high',
      execute: async (): Promise<PenetrationTestResult> => {
        const startTime = Date.now();

        try {
          const testData = {
            searchQuery: payload,
            jobTitle: payload,
            description: payload,
          };

          const titleValidation = SecurityManager.validateTextInput(testData.jobTitle, {
            maxLength: 100,
            fieldName: 'Job Title',
          });

          const descValidation = SecurityManager.validateTextInput(testData.description, {
            maxLength: 1000,
            fieldName: 'Description',
          });

          const vulnerabilityFound =
            (titleValidation.sanitized && titleValidation.sanitized.includes('SELECT')) ||
            (descValidation.sanitized && descValidation.sanitized.includes('UNION')) ||
            (titleValidation.sanitized && titleValidation.sanitized.includes('DROP'));

          let vulnerability: SecurityVulnerability | undefined;

          if (vulnerabilityFound) {
            vulnerability = {
              id: `vuln_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'injection',
              severity: 'high',
              title: `SQL Injection in ${name}`,
              description: `The application appears vulnerable to SQL injection attacks using payload: ${payload}`,
              impact: 'Attackers could potentially read, modify, or delete database data, bypass authentication, or execute administrative operations.',
              remediation: 'Implement parameterized queries, input validation, and proper escaping. Use ORM frameworks that provide built-in protection.',
              cwe: 'CWE-89',
              owasp: 'A03:2021 – Injection',
              affectedComponents: ['Database queries', 'Search functionality', 'User input processing'],
              proofOfConcept: `Input: ${payload}\nSanitized: ${titleValidation.sanitized || descValidation.sanitized}`,
              discoveredAt: Date.now(),
              status: 'open',
            };
          }

          return {
            testId: id,
            testName: name,
            category: 'sql_injection',
            success: true,
            vulnerabilityFound,
            vulnerability,
            executionTime: Date.now() - startTime,
            details: vulnerabilityFound
              ? `SQL injection vulnerability detected with payload: ${payload}`
              : `Input properly sanitized. No SQL injection vulnerability found.`,
            evidence: {
              payload,
              titleValidation,
              descValidation,
            },
          };
        } catch (error) {
          return {
            testId: id,
            testName: name,
            category: 'sql_injection',
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