import { SEOManager } from '../SEOManager';

describe('SEOManager', () => {
  it('creates an instance', () => {
    const service = new SEOManager({
      enableStructuredData: false,
      siteName: 'Test Site',
      defaultTitle: 'Test',
      defaultDescription: 'Test',
      defaultKeywords: ['test'],
    });
    expect(service).toBeDefined();
  });
});
