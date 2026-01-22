import { AuditSummaryCalculator } from '../AuditSummaryCalculator';

describe('AuditSummaryCalculator', () => {
  it('exports the calculator class', () => {
    expect(AuditSummaryCalculator).toBeDefined();
    expect(typeof AuditSummaryCalculator).toBe('function');
  });
});
