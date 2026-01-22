import { BudgetEnforcer } from '../BudgetEnforcer';

describe('BudgetEnforcer', () => {
  it('can be constructed', () => {
    const enforcer = new BudgetEnforcer();
    expect(enforcer).toBeDefined();
  });
});
