import testHelpers from '../TestHelpers';

describe('testHelpers', () => {
  it('exports helper collection', () => {
    expect(testHelpers).toBeDefined();
    expect(typeof testHelpers).toBe('object');
  });
});
