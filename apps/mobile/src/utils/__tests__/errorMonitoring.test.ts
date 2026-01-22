import { errorMonitoring } from '../errorMonitoring';

describe('errorMonitoring', () => {
  it('exposes a singleton', () => {
    expect(errorMonitoring).toBeDefined();
    expect(typeof errorMonitoring.reportError).toBe('function');
  });
});
