/**
 * Unit tests for SecurityAuditService
 *
 * The unit under test (SecurityAuditService) runs real. We mock ONLY externals:
 *  - logger (no console noise / spy on calls)
 *  - the 4 penetration test suites (so we control test factories + execute())
 *  - the 3 managers (ComplianceManager / RecommendationEngine / AuditSummaryCalculator)
 *  - Date.now (spied to make auditId / timestamps deterministic)
 */

import type {
  PenetrationTest,
  PenetrationTestResult,
  SecurityVulnerability,
} from '../../types';

// ---- logger mock -----------------------------------------------------------
jest.mock('../../../logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---- manager mocks ---------------------------------------------------------
jest.mock('../../managers/ComplianceManager', () => ({
  ComplianceManager: {
    performComplianceChecks: jest.fn(),
    generateComplianceReport: jest.fn(),
  },
}));

jest.mock('../../managers/RecommendationEngine', () => ({
  RecommendationEngine: {
    generateRecommendations: jest.fn(),
  },
}));

jest.mock('../../managers/AuditSummaryCalculator', () => ({
  AuditSummaryCalculator: {
    calculateAuditSummary: jest.fn(),
  },
}));

// ---- test-suite mocks ------------------------------------------------------
// Each factory returns a PenetrationTest whose execute() we control per-test.
jest.mock('../../testSuites/SqlInjectionTests', () => ({
  SqlInjectionTestSuite: {
    createBasicSQLInjectionTest: jest.fn(),
    createUnionSQLInjectionTest: jest.fn(),
    createTimeBasedSQLInjectionTest: jest.fn(),
    createErrorBasedSQLInjectionTest: jest.fn(),
  },
}));

jest.mock('../../testSuites/XssTests', () => ({
  XssTestSuite: {
    createReflectedXSSTest: jest.fn(),
    createStoredXSSTest: jest.fn(),
    createDOMXSSTest: jest.fn(),
    createFilterBypassXSSTest: jest.fn(),
  },
}));

jest.mock('../../testSuites/AuthenticationTests', () => ({
  AuthenticationTestSuite: {
    createBruteForceTest: jest.fn(),
    createWeakPasswordTest: jest.fn(),
    createSessionManagementTest: jest.fn(),
    createJWTSecurityTest: jest.fn(),
    createBiometricFallbackTest: jest.fn(),
  },
}));

jest.mock('../../testSuites/AuthorizationTests', () => ({
  AuthorizationTestSuite: {
    createPrivilegeEscalationTest: jest.fn(),
    createIdorTest: jest.fn(),
    createRoleBasedAccessTest: jest.fn(),
    createResourceAccessTest: jest.fn(),
  },
}));

import { logger } from '../../../logger';
import { ComplianceManager } from '../../managers/ComplianceManager';
import { RecommendationEngine } from '../../managers/RecommendationEngine';
import { AuditSummaryCalculator } from '../../managers/AuditSummaryCalculator';
import { SqlInjectionTestSuite } from '../../testSuites/SqlInjectionTests';
import { XssTestSuite } from '../../testSuites/XssTests';
import { AuthenticationTestSuite } from '../../testSuites/AuthenticationTests';
import { AuthorizationTestSuite } from '../../testSuites/AuthorizationTests';
import { SecurityAuditService } from '../SecurityAuditService';

// ---- helpers ---------------------------------------------------------------

let testCounter = 0;

/**
 * Build a fake PenetrationTest. By default execute() resolves a passing,
 * no-vulnerability result. Override `result` or `throwError` per test.
 */
function makeTest(
  overrides: Partial<PenetrationTest> & {
    result?: PenetrationTestResult;
    throwError?: unknown;
  } = {}
): PenetrationTest {
  testCounter += 1;
  const id = overrides.id ?? `test_${testCounter}`;
  const name = overrides.name ?? `Test ${testCounter}`;
  const category = overrides.category ?? 'generic';

  const defaultResult: PenetrationTestResult = {
    testId: id,
    testName: name,
    category,
    success: true,
    vulnerabilityFound: false,
    executionTime: 5,
    details: 'ok',
  };

  const execute = jest.fn(async () => {
    if ('throwError' in overrides) {
      throw overrides.throwError;
    }
    return overrides.result ?? defaultResult;
  });

  return {
    id,
    name,
    description: 'desc',
    category,
    severity: overrides.severity ?? 'info',
    execute,
  };
}

function makeVuln(
  id: string,
  severity: SecurityVulnerability['severity'] = 'high'
): SecurityVulnerability {
  return {
    id,
    type: 'injection',
    severity,
    title: `vuln ${id}`,
    description: 'd',
    impact: 'i',
    remediation: 'r',
    affectedComponents: ['comp'],
    discoveredAt: 123,
    status: 'open',
  };
}

const SUMMARY = {
  totalTests: 17,
  passed: 17,
  failed: 0,
  vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  overallScore: 100,
  riskLevel: 'very_low' as const,
};

/** Point every factory mock at makeTest() so constructor builds 17 tests. */
function wireDefaultFactories(): void {
  const factories = [
    SqlInjectionTestSuite.createBasicSQLInjectionTest,
    SqlInjectionTestSuite.createUnionSQLInjectionTest,
    SqlInjectionTestSuite.createTimeBasedSQLInjectionTest,
    SqlInjectionTestSuite.createErrorBasedSQLInjectionTest,
    XssTestSuite.createReflectedXSSTest,
    XssTestSuite.createStoredXSSTest,
    XssTestSuite.createDOMXSSTest,
    XssTestSuite.createFilterBypassXSSTest,
    AuthenticationTestSuite.createBruteForceTest,
    AuthenticationTestSuite.createWeakPasswordTest,
    AuthenticationTestSuite.createSessionManagementTest,
    AuthenticationTestSuite.createJWTSecurityTest,
    AuthenticationTestSuite.createBiometricFallbackTest,
    AuthorizationTestSuite.createPrivilegeEscalationTest,
    AuthorizationTestSuite.createIdorTest,
    AuthorizationTestSuite.createRoleBasedAccessTest,
    AuthorizationTestSuite.createResourceAccessTest,
  ] as unknown as jest.Mock[];

  factories.forEach((f) => f.mockImplementation(() => makeTest()));
}

describe('SecurityAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testCounter = 0;
    wireDefaultFactories();

    (ComplianceManager.performComplianceChecks as jest.Mock).mockResolvedValue({
      owasp: true,
      gdpr: true,
      ccpa: true,
    });
    (AuditSummaryCalculator.calculateAuditSummary as jest.Mock).mockReturnValue(
      SUMMARY
    );
    (RecommendationEngine.generateRecommendations as jest.Mock).mockReturnValue(
      ['Patch it']
    );
    (ComplianceManager.generateComplianceReport as jest.Mock).mockReturnValue({
      standards: { owasp: { compliant: true, issues: [] } },
      summary: 'all good',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- constructor / initializeTestSuites ---------------------------------
  describe('constructor + initializeTestSuites', () => {
    it('initializes 4 suites with 17 total tests and logs the counts', () => {
      const service = new SecurityAuditService();

      expect(service.getTestSuites()).toHaveLength(4);
      expect(logger.info).toHaveBeenCalledWith(
        'SecurityAudit',
        'Penetration test suites initialized',
        { suiteCount: 4, totalTests: 17 }
      );
    });

    it('exposes each suite name/description/testCount', () => {
      const service = new SecurityAuditService();
      const suites = service.getTestSuites();

      expect(suites).toEqual(
        expect.arrayContaining([
          {
            name: 'SQL Injection Tests',
            description: 'Tests for SQL injection vulnerabilities',
            testCount: 4,
          },
          {
            name: 'Cross-Site Scripting Tests',
            description: 'Tests for XSS vulnerabilities',
            testCount: 4,
          },
          {
            name: 'Authentication Security Tests',
            description: 'Tests for authentication vulnerabilities',
            testCount: 5,
          },
          {
            name: 'Authorization Security Tests',
            description:
              'Tests for authorization and access control vulnerabilities',
            testCount: 4,
          },
        ])
      );
    });
  });

  // ---- runSecurityAudit ----------------------------------------------------
  describe('runSecurityAudit', () => {
    it('runs every test, collects results, builds + stores a report (happy path)', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const service = new SecurityAuditService();
      const report = await service.runSecurityAudit('production');

      // 17 tests executed -> 17 results
      expect(report.testResults).toHaveLength(17);
      expect(report.vulnerabilities).toHaveLength(0);
      expect(report.environment).toBe('production');
      expect(report.version).toBe('1.0.0');
      expect(report.timestamp).toBe(1000);
      expect(report.auditId).toMatch(/^audit_1000_/);
      expect(report.summary).toBe(SUMMARY);
      expect(report.recommendations).toEqual(['Patch it']);
      expect(report.complianceChecks).toEqual({
        owasp: true,
        gdpr: true,
        ccpa: true,
      });

      // managers called with the collected data
      expect(ComplianceManager.performComplianceChecks).toHaveBeenCalledWith(
        []
      );
      expect(AuditSummaryCalculator.calculateAuditSummary).toHaveBeenCalledWith(
        report.testResults,
        []
      );
      expect(RecommendationEngine.generateRecommendations).toHaveBeenCalledWith(
        []
      );

      // stored in history
      expect(service.getLatestAuditReport()).toBe(report);
      expect(logger.info).toHaveBeenCalledWith(
        'SecurityAudit',
        'Security audit completed',
        expect.objectContaining({ auditId: report.auditId, executionTime: 0 })
      );
    });

    it('defaults environment to development', async () => {
      const service = new SecurityAuditService();
      const report = await service.runSecurityAudit();
      expect(report.environment).toBe('development');
    });

    it('collects vulnerabilities from results that carry one', async () => {
      const vuln = makeVuln('v-1', 'critical');
      // First SQL test returns a vulnerability; rest default to clean.
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 'sql-1',
          name: 'SQL One',
          result: {
            testId: 'sql-1',
            testName: 'SQL One',
            category: 'injection',
            success: true,
            vulnerabilityFound: true,
            vulnerability: vuln,
            executionTime: 9,
            details: 'found',
          },
        })
      );

      const service = new SecurityAuditService();
      const report = await service.runSecurityAudit();

      expect(report.vulnerabilities).toEqual([vuln]);
      expect(ComplianceManager.performComplianceChecks).toHaveBeenCalledWith([
        vuln,
      ]);
      // debug logged with vulnerabilityFound true for that test
      expect(logger.debug).toHaveBeenCalledWith(
        'SecurityAudit',
        'Test completed: SQL One',
        { success: true, vulnerabilityFound: true }
      );
    });

    it('captures a failing test (Error thrown) as a failed result and logs error', async () => {
      (XssTestSuite.createReflectedXSSTest as jest.Mock).mockImplementation(
        () =>
          makeTest({
            id: 'xss-err',
            name: 'XSS Err',
            category: 'xss',
            throwError: new Error('boom'),
          })
      );

      const service = new SecurityAuditService();
      const report = await service.runSecurityAudit();

      const failed = report.testResults.find((r) => r.testId === 'xss-err');
      expect(failed).toEqual({
        testId: 'xss-err',
        testName: 'XSS Err',
        category: 'xss',
        success: false,
        vulnerabilityFound: false,
        executionTime: 0,
        details: 'Test execution failed: boom',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'SecurityAudit',
        'Test failed: XSS Err',
        {
          error: 'boom',
        }
      );
    });

    it('captures a non-Error throw with String() + "Unknown error" detail', async () => {
      (XssTestSuite.createStoredXSSTest as jest.Mock).mockImplementation(() =>
        makeTest({
          id: 'xss-str',
          name: 'XSS Str',
          category: 'xss',
          throwError: 'plain-string',
        })
      );

      const service = new SecurityAuditService();
      const report = await service.runSecurityAudit();

      const failed = report.testResults.find((r) => r.testId === 'xss-str');
      expect(failed?.details).toBe('Test execution failed: Unknown error');
      expect(logger.error).toHaveBeenCalledWith(
        'SecurityAudit',
        'Test failed: XSS Str',
        {
          error: 'plain-string',
        }
      );
    });

    it('throws if an audit is already running (re-entrancy guard)', async () => {
      const service = new SecurityAuditService();

      // Make the very first test hang so isRunning stays true while we re-enter.
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => {
        release = r;
      });
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() => {
        const t = makeTest({ id: 'hang' });
        (t.execute as jest.Mock).mockImplementation(async () => {
          await gate;
          return {
            testId: 'hang',
            testName: 'hang',
            category: 'generic',
            success: true,
            vulnerabilityFound: false,
            executionTime: 1,
            details: 'ok',
          };
        });
        return t;
      });

      // rebuild service so the hanging factory is used
      const svc = new SecurityAuditService();
      const first = svc.runSecurityAudit();
      await Promise.resolve();

      await expect(svc.runSecurityAudit()).rejects.toThrow(
        'Security audit is already running'
      );

      release();
      await first;
      // after completion the guard is cleared -> a fresh run succeeds
      await expect(svc.runSecurityAudit()).resolves.toBeDefined();

      // keep `service` referenced
      expect(service).toBeInstanceOf(SecurityAuditService);
    });

    it('clears isRunning in finally even when a manager throws', async () => {
      (
        ComplianceManager.performComplianceChecks as jest.Mock
      ).mockRejectedValueOnce(new Error('compliance down'));

      const service = new SecurityAuditService();
      await expect(service.runSecurityAudit()).rejects.toThrow(
        'compliance down'
      );

      // isRunning was reset -> a second run is allowed (factories still wired)
      await expect(service.runSecurityAudit()).resolves.toBeDefined();
    });

    it('caps audit history at the last 10 reports', async () => {
      const service = new SecurityAuditService();
      for (let i = 0; i < 12; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await service.runSecurityAudit();
      }
      expect(service.getAuditHistory()).toHaveLength(10);
    });

    it('resets testResults/vulnerabilities between audit runs', async () => {
      const vuln = makeVuln('v-reset');
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 's',
          name: 's',
          result: {
            testId: 's',
            testName: 's',
            category: 'injection',
            success: true,
            vulnerabilityFound: true,
            vulnerability: vuln,
            executionTime: 1,
            details: 'x',
          },
        })
      );

      const service = new SecurityAuditService();
      const r1 = await service.runSecurityAudit();
      expect(r1.vulnerabilities).toEqual([vuln]);

      // now make that test clean -> next run should start fresh (no carry-over)
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() => makeTest());
      // need a new service so the new factory rebuilds the suite
      const service2 = new SecurityAuditService();
      const r2 = await service2.runSecurityAudit();
      expect(r2.vulnerabilities).toEqual([]);
    });
  });

  // ---- runTestSuite --------------------------------------------------------
  describe('runTestSuite', () => {
    it('runs a known suite and returns its results', async () => {
      const service = new SecurityAuditService();
      const results = await service.runTestSuite('xss');

      expect(results).toHaveLength(4);
      results.forEach((r) => expect(r.success).toBe(true));
      expect(logger.info).toHaveBeenCalledWith(
        'SecurityAudit',
        'Running test suite: Cross-Site Scripting Tests'
      );
    });

    it('throws for an unknown suite name', async () => {
      const service = new SecurityAuditService();
      await expect(service.runTestSuite('does_not_exist')).rejects.toThrow(
        'Test suite not found: does_not_exist'
      );
    });

    it('captures a thrown Error within runTestSuite as a failed result', async () => {
      (
        AuthenticationTestSuite.createBruteForceTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 'auth-err',
          name: 'Auth Err',
          category: 'auth',
          throwError: new Error('nope'),
        })
      );

      const service = new SecurityAuditService();
      const results = await service.runTestSuite('authentication');

      const failed = results.find((r) => r.testId === 'auth-err');
      expect(failed).toEqual({
        testId: 'auth-err',
        testName: 'Auth Err',
        category: 'auth',
        success: false,
        vulnerabilityFound: false,
        executionTime: 0,
        details: 'Test execution failed: nope',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'SecurityAudit',
        'Test failed: Auth Err',
        expect.any(Error)
      );
    });

    it('captures a non-Error throw within runTestSuite as "Unknown error"', async () => {
      (
        AuthenticationTestSuite.createWeakPasswordTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 'auth-str',
          name: 'Auth Str',
          category: 'auth',
          throwError: 42,
        })
      );

      const service = new SecurityAuditService();
      const results = await service.runTestSuite('authentication');

      const failed = results.find((r) => r.testId === 'auth-str');
      expect(failed?.details).toBe('Test execution failed: Unknown error');
    });
  });

  // ---- getLatestAuditReport ------------------------------------------------
  describe('getLatestAuditReport', () => {
    it('returns null when no audit has run', () => {
      const service = new SecurityAuditService();
      expect(service.getLatestAuditReport()).toBeNull();
    });

    it('returns the most recent report', async () => {
      const service = new SecurityAuditService();
      const r1 = await service.runSecurityAudit();
      const r2 = await service.runSecurityAudit();
      expect(service.getLatestAuditReport()).toBe(r2);
      expect(service.getLatestAuditReport()).not.toBe(r1);
    });
  });

  // ---- getAuditHistory -----------------------------------------------------
  describe('getAuditHistory', () => {
    it('returns an empty array initially and a copy (not the internal array)', async () => {
      const service = new SecurityAuditService();
      const hist = service.getAuditHistory();
      expect(hist).toEqual([]);

      const report = await service.runSecurityAudit();
      const hist2 = service.getAuditHistory();
      expect(hist2).toEqual([report]);

      // mutate the returned copy -> internal state unaffected
      hist2.push(report);
      expect(service.getAuditHistory()).toHaveLength(1);
    });
  });

  // ---- getVulnerability ----------------------------------------------------
  describe('getVulnerability', () => {
    it('returns undefined when nothing matches', () => {
      const service = new SecurityAuditService();
      expect(service.getVulnerability('missing')).toBeUndefined();
    });

    it('finds a vulnerability by id after an audit', async () => {
      const vuln = makeVuln('find-me');
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 'q',
          name: 'q',
          result: {
            testId: 'q',
            testName: 'q',
            category: 'injection',
            success: true,
            vulnerabilityFound: true,
            vulnerability: vuln,
            executionTime: 1,
            details: 'x',
          },
        })
      );

      const service = new SecurityAuditService();
      await service.runSecurityAudit();
      expect(service.getVulnerability('find-me')).toBe(vuln);
      expect(service.getVulnerability('nope')).toBeUndefined();
    });
  });

  // ---- updateVulnerabilityStatus ------------------------------------------
  describe('updateVulnerabilityStatus', () => {
    it('returns false when the vulnerability does not exist', () => {
      const service = new SecurityAuditService();
      expect(service.updateVulnerabilityStatus('nope', 'fixed')).toBe(false);
      expect(logger.info).not.toHaveBeenCalledWith(
        'SecurityAudit',
        'Vulnerability status updated',
        expect.anything()
      );
    });

    it('updates the status, logs, and returns true when found', async () => {
      const vuln = makeVuln('upd-me');
      (
        SqlInjectionTestSuite.createBasicSQLInjectionTest as jest.Mock
      ).mockImplementation(() =>
        makeTest({
          id: 'u',
          name: 'u',
          result: {
            testId: 'u',
            testName: 'u',
            category: 'injection',
            success: true,
            vulnerabilityFound: true,
            vulnerability: vuln,
            executionTime: 1,
            details: 'x',
          },
        })
      );

      const service = new SecurityAuditService();
      await service.runSecurityAudit();

      const ok = service.updateVulnerabilityStatus('upd-me', 'fixed');
      expect(ok).toBe(true);
      expect(service.getVulnerability('upd-me')?.status).toBe('fixed');
      expect(logger.info).toHaveBeenCalledWith(
        'SecurityAudit',
        'Vulnerability status updated',
        {
          id: 'upd-me',
          status: 'fixed',
        }
      );
    });
  });

  // ---- generateComplianceReport -------------------------------------------
  describe('generateComplianceReport', () => {
    it('delegates to ComplianceManager with the current vulnerabilities', () => {
      const service = new SecurityAuditService();
      const report = service.generateComplianceReport();

      expect(ComplianceManager.generateComplianceReport).toHaveBeenCalledWith(
        []
      );
      expect(report).toEqual({
        standards: { owasp: { compliant: true, issues: [] } },
        summary: 'all good',
      });
    });
  });
});
