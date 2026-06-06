import { ComplianceManager } from '../ComplianceManager';
import type { SecurityVulnerability } from '../../types';

/**
 * Builds a SecurityVulnerability with sane defaults, allowing per-test overrides.
 */
function makeVuln(
  overrides: Partial<SecurityVulnerability> = {}
): SecurityVulnerability {
  return {
    id: overrides.id ?? 'vuln-1',
    type: overrides.type ?? 'config',
    severity: overrides.severity ?? 'low',
    title: overrides.title ?? 'Generic Issue',
    description: overrides.description ?? 'desc',
    impact: overrides.impact ?? 'impact',
    remediation: overrides.remediation ?? 'remediation',
    cwe: overrides.cwe,
    owasp: overrides.owasp,
    affectedComponents: overrides.affectedComponents ?? ['component-a'],
    proofOfConcept: overrides.proofOfConcept,
    discoveredAt: overrides.discoveredAt ?? 1_700_000_000_000,
    status: overrides.status ?? 'open',
  };
}

describe('ComplianceManager', () => {
  it('exposes static compliance utilities', () => {
    expect(ComplianceManager).toBeDefined();
    expect(typeof ComplianceManager.performComplianceChecks).toBe('function');
    expect(typeof ComplianceManager.generateComplianceReport).toBe('function');
  });

  describe('performComplianceChecks', () => {
    it('reports full compliance when there are no vulnerabilities', async () => {
      const result = await ComplianceManager.performComplianceChecks([]);

      expect(result).toEqual({
        owasp: true,
        gdpr: true,
        ccpa: true,
      });
      // pci_dss is optional and intentionally not populated by the impl.
      expect(result.pci_dss).toBeUndefined();
    });

    it('fails OWASP compliance when a critical vulnerability exists', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ severity: 'critical' }),
      ]);

      expect(result.owasp).toBe(false);
      // A critical config vuln is not data_exposure, so GDPR/CCPA remain compliant.
      expect(result.gdpr).toBe(true);
      expect(result.ccpa).toBe(true);
    });

    it('fails OWASP compliance when a high severity vulnerability exists', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ severity: 'high' }),
      ]);

      expect(result.owasp).toBe(false);
      expect(result.gdpr).toBe(true);
      expect(result.ccpa).toBe(true);
    });

    it('keeps OWASP compliant for medium/low/info severities', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ severity: 'medium' }),
        makeVuln({ severity: 'low' }),
        makeVuln({ severity: 'info' }),
      ]);

      expect(result.owasp).toBe(true);
    });

    it('fails GDPR and CCPA together when a data_exposure vulnerability exists', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ type: 'data_exposure', severity: 'medium' }),
      ]);

      // medium severity keeps OWASP compliant...
      expect(result.owasp).toBe(true);
      // ...but data_exposure breaks GDPR, and CCPA mirrors GDPR.
      expect(result.gdpr).toBe(false);
      expect(result.ccpa).toBe(false);
      // CCPA is derived directly from GDPR.
      expect(result.ccpa).toBe(result.gdpr);
    });

    it('can fail OWASP and GDPR/CCPA simultaneously', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ id: 'v1', type: 'data_exposure', severity: 'critical' }),
        makeVuln({ id: 'v2', type: 'injection', severity: 'high' }),
      ]);

      expect(result.owasp).toBe(false);
      expect(result.gdpr).toBe(false);
      expect(result.ccpa).toBe(false);
    });

    it('treats non-data_exposure high/critical vulns as GDPR-compliant', async () => {
      const result = await ComplianceManager.performComplianceChecks([
        makeVuln({ type: 'injection', severity: 'critical' }),
        makeVuln({ type: 'xss', severity: 'high' }),
        makeVuln({ type: 'auth', severity: 'medium' }),
      ]);

      expect(result.owasp).toBe(false);
      expect(result.gdpr).toBe(true);
      expect(result.ccpa).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    it('reports all standards compliant with a 100% summary when clean', () => {
      const report = ComplianceManager.generateComplianceReport([]);

      expect(Object.keys(report.standards)).toEqual([
        'OWASP Top 10',
        'CWE',
        'Data Protection',
      ]);

      expect(report.standards['OWASP Top 10']).toEqual({
        compliant: true,
        issues: [],
      });
      expect(report.standards['CWE']).toEqual({ compliant: true, issues: [] });
      expect(report.standards['Data Protection']).toEqual({
        compliant: true,
        issues: [],
      });

      expect(report.summary).toBe('Compliance Status: 3/3 standards (100.0%)');
    });

    it('flags OWASP Top 10 non-compliance and lists the offending titles', () => {
      const report = ComplianceManager.generateComplianceReport([
        makeVuln({ title: 'A01 Broken Access Control', owasp: 'A01:2021' }),
        makeVuln({ title: 'A03 Injection', owasp: 'A03:2021' }),
      ]);

      expect(report.standards['OWASP Top 10'].compliant).toBe(false);
      expect(report.standards['OWASP Top 10'].issues).toEqual([
        'A01 Broken Access Control',
        'A03 Injection',
      ]);
      // No cwe / no data_exposure -> the other two standards stay compliant.
      expect(report.standards['CWE'].compliant).toBe(true);
      expect(report.standards['CWE'].issues).toEqual([]);
      expect(report.standards['Data Protection'].compliant).toBe(true);

      // 2/3 compliant.
      expect(report.summary).toBe('Compliance Status: 2/3 standards (66.7%)');
    });

    it('flags CWE non-compliance and lists offending titles', () => {
      const report = ComplianceManager.generateComplianceReport([
        makeVuln({ title: 'Use of Hardcoded Credentials', cwe: 'CWE-798' }),
      ]);

      expect(report.standards['CWE'].compliant).toBe(false);
      expect(report.standards['CWE'].issues).toEqual([
        'Use of Hardcoded Credentials',
      ]);
      expect(report.standards['OWASP Top 10'].compliant).toBe(true);
      expect(report.standards['Data Protection'].compliant).toBe(true);

      expect(report.summary).toBe('Compliance Status: 2/3 standards (66.7%)');
    });

    it('flags Data Protection non-compliance for data_exposure vulns', () => {
      const report = ComplianceManager.generateComplianceReport([
        makeVuln({ title: 'PII Leak in Logs', type: 'data_exposure' }),
      ]);

      expect(report.standards['Data Protection'].compliant).toBe(false);
      expect(report.standards['Data Protection'].issues).toEqual([
        'PII Leak in Logs',
      ]);
      expect(report.standards['OWASP Top 10'].compliant).toBe(true);
      expect(report.standards['CWE'].compliant).toBe(true);

      expect(report.summary).toBe('Compliance Status: 2/3 standards (66.7%)');
    });

    it('reports 0% when every standard is violated', () => {
      const report = ComplianceManager.generateComplianceReport([
        makeVuln({
          title: 'Everything Broken',
          type: 'data_exposure',
          owasp: 'A03:2021',
          cwe: 'CWE-89',
        }),
      ]);

      expect(report.standards['OWASP Top 10'].compliant).toBe(false);
      expect(report.standards['OWASP Top 10'].issues).toEqual([
        'Everything Broken',
      ]);
      expect(report.standards['CWE'].compliant).toBe(false);
      expect(report.standards['CWE'].issues).toEqual(['Everything Broken']);
      expect(report.standards['Data Protection'].compliant).toBe(false);
      expect(report.standards['Data Protection'].issues).toEqual([
        'Everything Broken',
      ]);

      expect(report.summary).toBe('Compliance Status: 0/3 standards (0.0%)');
    });

    it('collects multiple distinct issue titles per standard', () => {
      const report = ComplianceManager.generateComplianceReport([
        makeVuln({ id: 'a', title: 'Exposure One', type: 'data_exposure' }),
        makeVuln({ id: 'b', title: 'Exposure Two', type: 'data_exposure' }),
        makeVuln({ id: 'c', title: 'Clean Config', type: 'config' }),
      ]);

      expect(report.standards['Data Protection'].compliant).toBe(false);
      expect(report.standards['Data Protection'].issues).toEqual([
        'Exposure One',
        'Exposure Two',
      ]);
      // The plain config vuln does not appear in any standard's issue list.
      expect(report.standards['OWASP Top 10'].issues).not.toContain(
        'Clean Config'
      );
      expect(report.standards['CWE'].issues).not.toContain('Clean Config');
    });
  });
});
