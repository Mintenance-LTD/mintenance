import { PricingEngine } from '../PricingEngine';

describe('PricingEngine', () => {
  it('creates an instance', () => {
    const service = new PricingEngine();
    expect(service).toBeDefined();
  });
});
