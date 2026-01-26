import { MetricsCollector } from '../MetricsCollector';

describe('MetricsCollector', () => {
  it('exports the collector class', () => {
    expect(MetricsCollector).toBeDefined();
    expect(typeof MetricsCollector).toBe('function');
  });
});
