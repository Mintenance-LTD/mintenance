import { MarketRateCalculator } from '../MarketRateCalculator';

describe('MarketRateCalculator', () => {
  it('exports the calculator class', () => {
    expect(MarketRateCalculator).toBeDefined();
    expect(typeof MarketRateCalculator).toBe('function');
  });
});
