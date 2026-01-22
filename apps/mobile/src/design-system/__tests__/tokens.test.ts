import { colors, typography, spacing } from '../tokens';

describe('tokens', () => {
  it('exports core token maps', () => {
    expect(colors).toBeDefined();
    expect(typography).toBeDefined();
    expect(spacing).toBeDefined();
  });
});
