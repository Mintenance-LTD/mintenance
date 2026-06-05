// PerformanceMonitor exposes named exports only: the `PerformanceMonitor`
// class and the `performanceMonitor` singleton instance (no default export).
import { PerformanceMonitor, performanceMonitor } from '../PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('exports a singleton along with the class', () => {
    expect(performanceMonitor).toBeDefined();
    expect(typeof PerformanceMonitor).toBe('function');
  });

  it('singleton is an instance of the exported class', () => {
    expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
  });

  it('getInstance returns the same singleton', () => {
    expect(PerformanceMonitor.getInstance()).toBe(performanceMonitor);
  });
});
