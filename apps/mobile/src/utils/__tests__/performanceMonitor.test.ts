import performanceMonitor from '../performanceMonitor';

describe('performanceMonitor', () => {
  it('exports the monitoring singleton', () => {
    expect(performanceMonitor).toBeDefined();
    expect(typeof performanceMonitor.recordStartupTime).toBe('function');
    expect(typeof performanceMonitor.getMetrics).toBe('function');
  });
});
