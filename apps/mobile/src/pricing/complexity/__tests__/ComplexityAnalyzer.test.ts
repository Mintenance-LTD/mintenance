import { ComplexityAnalyzer } from '../ComplexityAnalyzer';

describe('ComplexityAnalyzer', () => {
  it('exports an analyzer class', () => {
    expect(ComplexityAnalyzer).toBeDefined();
    expect(typeof ComplexityAnalyzer).toBe('function');
  });
});
