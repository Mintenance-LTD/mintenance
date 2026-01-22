import { PerformanceMetricsCollector } from '../PerformanceMetricsCollector';

describe('PerformanceMetricsCollector', () => {
  it('exports the collector class', () => {
    expect(PerformanceMetricsCollector).toBeDefined();
    expect(typeof PerformanceMetricsCollector).toBe('function');
  });
});
