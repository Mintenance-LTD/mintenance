import * as components from '../index';

describe('enhanced-home components index', () => {
  it('should export core components', () => {
    expect(components.LocationHeader).toBeDefined();
    expect(components.SearchFilterBar).toBeDefined();
    expect(components.ServiceCategoryGrid).toBeDefined();
    expect(components.SpecialOffersCarousel).toBeDefined();
    expect(components.TopContractorsList).toBeDefined();
  });
});
