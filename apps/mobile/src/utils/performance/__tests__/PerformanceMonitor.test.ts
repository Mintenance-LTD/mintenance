import performanceMonitor, { PerformanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('exports a singleton along with the class', () => {
    expect(performanceMonitor).toBeDefined();
    expect(typeof PerformanceMonitor).toBe('function');
  });
});
