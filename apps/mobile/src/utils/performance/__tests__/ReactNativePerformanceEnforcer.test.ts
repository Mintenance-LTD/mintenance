import { ReactNativePerformanceEnforcer } from '../ReactNativePerformanceEnforcer';

describe('ReactNativePerformanceEnforcer', () => {
  it('exports the enforcer class', () => {
    expect(ReactNativePerformanceEnforcer).toBeDefined();
    expect(typeof ReactNativePerformanceEnforcer).toBe('function');
  });
});
