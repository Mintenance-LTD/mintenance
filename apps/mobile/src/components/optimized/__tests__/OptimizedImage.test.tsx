import { OptimizedImage } from '../OptimizedImage';

describe('OptimizedImage', () => {
  it('exports the component', () => {
    expect(OptimizedImage).toBeDefined();
    // memo() wrapped components are objects, not functions
    expect(typeof OptimizedImage).toBe('object');
    // Check that it has the expected memo component structure
    expect(OptimizedImage.$$typeof).toBeDefined();
  });
});
