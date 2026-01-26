import { BudgetRuleManager } from '../BudgetRuleManager';

describe('BudgetRuleManager', () => {
  it('exports the manager class', () => {
    expect(BudgetRuleManager).toBeDefined();
    expect(typeof BudgetRuleManager).toBe('function');
  });
});
