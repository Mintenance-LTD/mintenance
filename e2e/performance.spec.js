// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              metrics.fid = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              if (!metrics.cls) metrics.cls = 0;
              if (!entry.hadRecentInput) {
                metrics.cls += entry.value;
              }
            }
          });
          
          resolve(metrics);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        // Resolve after 5 seconds if no metrics collected
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    // Check LCP (should be under 2.5s)
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
    
    // Check FID (should be under 100ms)
    if (metrics.fid) {
      expect(metrics.fid).toBeLessThan(100);
    }
    
    // Check CLS (should be under 0.1)
    if (metrics.cls) {
      expect(metrics.cls).toBeLessThan(0.1);
    }
  });

  test('should not have too many network requests', async ({ page }) => {
    const requests = [];
    
    page.on('request', request => {
      requests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not have excessive number of requests
    expect(requests.length).toBeLessThan(50);
  });

  test('should have optimized images', async ({ page }) => {
    await page.goto('/');
    
    // Check for images with proper attributes
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first few images for optimization
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        
        // Check for lazy loading
        const loading = await img.getAttribute('loading');
        if (loading) {
          expect(loading).toBe('lazy');
        }
        
        // Check for alt text
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should have proper caching headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();
    
    // Check for caching headers
    const cacheHeaders = [
      'cache-control',
      'etag',
      'last-modified'
    ];
    
    // At least one caching header should be present
    const hasCacheHeaders = cacheHeaders.some(header => headers[header]);
    expect(hasCacheHeaders).toBeTruthy();
  });
});
