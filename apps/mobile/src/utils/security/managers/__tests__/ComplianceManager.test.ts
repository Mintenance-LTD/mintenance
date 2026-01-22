import { ComplianceManager } from '../ComplianceManager';

describe('ComplianceManager', () => {
  it('exposes compliance utilities', () => {
    expect(ComplianceManager).toBeDefined();
    expect(typeof ComplianceManager.performComplianceChecks).toBe('function');
    expect(typeof ComplianceManager.generateComplianceReport).toBe('function');
  });
});
