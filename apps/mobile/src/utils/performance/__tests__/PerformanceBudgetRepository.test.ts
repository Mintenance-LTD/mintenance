import { PerformanceBudgetRepository } from '../PerformanceBudgetRepository';

describe('PerformanceBudgetRepository', () => {
  it('exports the repository class', () => {
    expect(PerformanceBudgetRepository).toBeDefined();
    expect(typeof PerformanceBudgetRepository).toBe('function');
  });
});
