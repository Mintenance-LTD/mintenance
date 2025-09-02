/**
 * E2E Test Configuration
 * Centralized configuration for mobile testing
 */

const TestConfig = {
  // Test Environment Settings
  environment: {
    apiBaseUrl: process.env.TEST_API_URL || 'https://test-api.mintenance.app',
    supabaseUrl: process.env.TEST_SUPABASE_URL || 'https://test-supabase.co',
    stripePublishableKey: process.env.TEST_STRIPE_KEY || 'pk_test_123...',
  },

  // Test User Accounts
  testUsers: {
    homeowner: {
      email: 'test.homeowner@mintenance.app',
      password: 'TestPassword123!',
      firstName: 'John',
      lastName: 'Homeowner',
      role: 'homeowner'
    },
    contractor: {
      email: 'test.contractor@mintenance.app', 
      password: 'TestPassword123!',
      firstName: 'Jane',
      lastName: 'Contractor',
      role: 'contractor'
    },
    admin: {
      email: 'test.admin@mintenance.app',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }
  },

  // Test Data Templates
  testData: {
    jobs: {
      plumbing: {
        title: 'Kitchen Faucet Repair',
        description: 'Leaky kitchen faucet needs professional repair',
        location: '123 Main Street, Anytown, USA',
        budget: '150',
        category: 'Plumbing',
        priority: 'high'
      },
      electrical: {
        title: 'Outlet Installation',
        description: 'Install new electrical outlet in living room',
        location: '456 Oak Avenue, Somewhere, USA',
        budget: '200',
        category: 'Electrical',
        priority: 'medium'
      },
      hvac: {
        title: 'AC Unit Maintenance',
        description: 'Annual maintenance for central air conditioning',
        location: '789 Pine Road, Elsewhere, USA',
        budget: '120',
        category: 'HVAC',
        priority: 'low'
      }
    },
    bids: {
      competitive: {
        amount: '140',
        description: 'I can complete this job today with 5+ years experience',
        timeline: 'Same day'
      },
      premium: {
        amount: '180',
        description: 'Premium service with warranty and same-day completion',
        timeline: 'Same day'
      },
      budget: {
        amount: '100',
        description: 'Budget-friendly option with quality work',
        timeline: '2-3 days'
      }
    }
  },

  // Timing Configuration
  timeouts: {
    short: 5000,      // 5 seconds
    medium: 10000,    // 10 seconds
    long: 30000,      // 30 seconds
    api: 15000,       // API calls
    navigation: 3000, // Screen transitions
    animation: 1000   // UI animations
  },

  // Device Testing Configuration
  devices: {
    ios: {
      simulator: 'iPhone 15 Pro',
      version: '17.0'
    },
    android: {
      emulator: 'Pixel_7_API_34',
      version: '13.0'
    }
  },

  // Test Scenarios
  scenarios: {
    smoke: [
      'app-launch',
      'user-authentication', 
      'basic-navigation'
    ],
    regression: [
      'job-posting-flow',
      'bidding-process',
      'payment-integration',
      'messaging-system',
      'user-management'
    ],
    performance: [
      'app-startup-time',
      'job-list-loading',
      'image-upload-speed',
      'message-delivery-time'
    ],
    accessibility: [
      'screen-reader-support',
      'keyboard-navigation',
      'color-contrast',
      'touch-target-size'
    ]
  },

  // Performance Benchmarks
  performance: {
    appStartup: 5000,      // Max app startup time (ms)
    screenTransition: 1000, // Max screen transition time (ms)
    apiResponse: 3000,      // Max API response time (ms)
    imageUpload: 10000,     // Max image upload time (ms)
    listLoading: 2000       // Max list loading time (ms)
  },

  // Mock Data Configuration
  mocks: {
    payments: {
      successCard: '4242424242424242',
      declineCard: '4000000000000002',
      expiry: '12/28',
      cvc: '123'
    },
    notifications: {
      jobUpdate: {
        title: 'Job Update',
        body: 'Your job status has been updated',
        data: { jobId: 'test-job-123', type: 'status_update' }
      },
      newMessage: {
        title: 'New Message',
        body: 'You have received a new message',
        data: { conversationId: 'test-conv-456', type: 'new_message' }
      },
      paymentComplete: {
        title: 'Payment Complete', 
        body: 'Your payment has been processed successfully',
        data: { paymentId: 'test-pay-789', type: 'payment_success' }
      }
    },
    photos: {
      plumbingIssue: './test-assets/plumbing-issue.jpg',
      electricalProblem: './test-assets/electrical-problem.jpg',
      hvacUnit: './test-assets/hvac-unit.jpg'
    }
  },

  // Feature Flags for Testing
  features: {
    aiAnalysis: true,
    realTimeMessaging: true,
    pushNotifications: true,
    paymentProcessing: true,
    locationServices: true,
    photoUpload: true,
    videoChat: false, // Not yet implemented
    backgroundTasks: true
  },

  // Error Scenarios for Testing
  errorScenarios: {
    network: {
      offline: 'No internet connection',
      timeout: 'Request timeout',
      serverError: '500 Internal Server Error'
    },
    payment: {
      cardDeclined: 'Your card was declined',
      insufficientFunds: 'Insufficient funds',
      networkError: 'Payment network error'
    },
    validation: {
      invalidEmail: 'Please enter a valid email address',
      weakPassword: 'Password must be at least 8 characters',
      requiredField: 'This field is required'
    }
  },

  // Test Reporting
  reporting: {
    screenshots: {
      onFailure: true,
      onSuccess: false,
      path: './test-results/screenshots/'
    },
    video: {
      enabled: false, // Enable for CI/CD
      path: './test-results/videos/'
    },
    logs: {
      level: 'info', // debug, info, warn, error
      path: './test-results/logs/'
    }
  },

  // CI/CD Configuration
  ci: {
    parallel: false,        // Run tests in parallel
    retries: 2,            // Number of retries on failure
    bail: false,           // Stop on first failure
    timeout: 600000,       // 10 minutes max per test suite
    reporters: ['default', 'jest-html-reporter']
  }
};

module.exports = TestConfig;