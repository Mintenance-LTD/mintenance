import { RecommendationEngine } from '../RecommendationEngine';

describe('RecommendationEngine', () => {
  it('exports the engine class', () => {
    expect(RecommendationEngine).toBeDefined();
    expect(typeof RecommendationEngine).toBe('function');
  });
});
