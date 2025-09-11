module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/register',
        'http://localhost:3000/jobs',
        'http://localhost:3000/contractors',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],

        // Performance budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 1000000 }], // 1MB
        'resource-summary:image:size': ['error', { maxNumericValue: 2000000 }], // 2MB
        'resource-summary:font:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:total:size': ['error', { maxNumericValue: 5000000 }], // 5MB

        // Timing budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }], // 3s
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms

        // Accessibility requirements
        'color-contrast': 'error',
        'image-alt': 'error',
        label: 'error',
        'link-name': 'error',
        'button-name': 'error',

        // Best practices
        'uses-https': 'error',
        'is-on-https': 'error',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'error',

        // Mobile optimization
        viewport: 'error',
        'content-width': 'error',
        'tap-targets': 'error',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
    server: {
      command: 'npm run start:ci',
      port: 3000,
      wait: 10000,
    },
  },
};
