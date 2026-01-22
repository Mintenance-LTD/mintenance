import { PerformanceBudgetManager } from '../PerformanceBudgetManager';

describe('PerformanceBudgetManager', () => {
  it('exports the manager class', () => {
    expect(PerformanceBudgetManager).toBeDefined();
    expect(typeof PerformanceBudgetManager).toBe('function');
  });
});
