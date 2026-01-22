import { ErrorTrendAnalysis } from '../ErrorTrendAnalysis';

describe('ErrorTrendAnalysis', () => {
  it('exports the analysis class', () => {
    expect(ErrorTrendAnalysis).toBeDefined();
    expect(typeof ErrorTrendAnalysis).toBe('function');
  });
});
