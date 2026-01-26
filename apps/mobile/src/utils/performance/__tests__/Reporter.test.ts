import { Reporter } from '../Reporter';

describe('Reporter', () => {
  it('can be constructed', () => {
    const reporter = new Reporter();
    expect(reporter).toBeDefined();
  });
});
