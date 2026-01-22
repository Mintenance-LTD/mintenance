import { config } from '../environment';

describe('environment', () => {
  it('exports config object', () => {
    expect(config).toBeDefined();
  });
});
