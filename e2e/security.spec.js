// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Security Headers', () => {
  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check for Content Security Policy
    const csp = response.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    
    // Check for X-Frame-Options or frame-ancestors in CSP
    const frameOptions = response.headers()['x-frame-options'];
    const hasFrameProtection = frameOptions || (csp && csp.includes('frame-ancestors'));
    expect(hasFrameProtection).toBeTruthy();
    
    // Check for X-Content-Type-Options
    const contentTypeOptions = response.headers()['x-content-type-options'];
    expect(contentTypeOptions).toBe('nosniff');
    
    // Check for Referrer-Policy
    const referrerPolicy = response.headers()['referrer-policy'];
    expect(referrerPolicy).toBeTruthy();
  });

  test('should not expose sensitive information in response headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();
    
    // Check that sensitive headers are not exposed
    const sensitiveHeaders = [
      'x-powered-by',
      'server',
      'x-aspnet-version',
      'x-aspnetmvc-version'
    ];
    
    sensitiveHeaders.forEach(header => {
      expect(headers[header]).toBeFalsy();
    });
  });

  test('should have proper HTTPS redirect', async ({ page }) => {
    // Test HTTP to HTTPS redirect
    const response = await page.goto('http://mintenance.co.uk', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Should redirect to HTTPS
    expect(page.url()).toMatch(/^https:/);
  });

  test('should not have mixed content warnings', async ({ page }) => {
    const consoleWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('Mixed Content')) {
        consoleWarnings.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    expect(consoleWarnings).toHaveLength(0);
  });

  test('should have proper CORS headers for API endpoints', async ({ page }) => {
    // Test API endpoint if it exists
    const apiResponse = await page.request.get('/api/health', {
      ignoreHTTPSErrors: true
    });
    
    if (apiResponse.status() !== 404) {
      const headers = apiResponse.headers();
      
      // Check for CORS headers
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ];
      
      // At least one CORS header should be present
      const hasCorsHeaders = corsHeaders.some(header => headers[header]);
      expect(hasCorsHeaders).toBeTruthy();
    }
  });
});
