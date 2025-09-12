module.exports = {
  // Security audit configuration
  audit: {
    // Vulnerability scanning
    vulnerabilities: {
      level: 'moderate', // ignore low-level issues
      exclude: [
        // Known false positives (document carefully)
      ],
      autoFix: true,
      reportPath: './security-reports'
    },
    
    // Dependency analysis
    dependencies: {
      allowedLicenses: [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC'
      ],
      blockedPackages: [
        'lodash', // Use lodash-es instead
        'moment' // Use date-fns instead
      ],
      outdatedThreshold: 180 // days
    },
    
    // Code analysis
    staticAnalysis: {
      enableSonarQube: true,
      enableESLintSecurity: true,
      rules: [
        'no-eval',
        'no-implied-eval',
        'no-new-func',
        'no-script-url'
      ]
    },
    
    // Environment checks
    environment: {
      validateEnvVars: true,
      requiredVars: [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
      ],
      noHardcodedSecrets: true
    },
    
    // Runtime security
    runtime: {
      enableCSP: true,
      enableHSTS: true,
      secureCookies: true,
      validateJWT: true
    }
  },
  
  // Performance optimization
  performance: {
    bundleAnalysis: {
      enabled: true,
      threshold: {
        size: '2MB',
        loadTime: '3s'
      },
      optimizations: [
        'code-splitting',
        'tree-shaking',
        'compression',
        'lazy-loading'
      ]
    },
    
    monitoring: {
      enableMetrics: true,
      trackingEvents: [
        'app_start',
        'screen_load',
        'api_request',
        'error_boundary'
      ],
      performanceBudget: {
        fcp: 2000, // First Contentful Paint
        lcp: 4000, // Largest Contentful Paint
        fid: 100,  // First Input Delay
        cls: 0.1   // Cumulative Layout Shift
      }
    }
  },
  
  // Privacy compliance
  privacy: {
    dataMinimization: true,
    consentManagement: true,
    dataRetention: {
      userProfiles: '7 years',
      jobData: '3 years',
      analytics: '2 years',
      errorLogs: '1 year'
    },
    anonymization: {
      enablePII: true,
      fields: ['email', 'phone', 'address']
    }
  }
};
