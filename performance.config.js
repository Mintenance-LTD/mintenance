// ============================================================================
// PERFORMANCE BUDGETS CONFIGURATION
// Mintenance App - Performance Standards & Monitoring
// ============================================================================

/**
 * Performance budgets define the acceptable limits for various metrics
 * to ensure optimal user experience and app performance.
 */

module.exports = {
  // ============================================================================
  // CORE PERFORMANCE BUDGETS
  // ============================================================================

  budgets: {
    // App Launch & Navigation
    app_start_time: {
      value: 3000, // 3 seconds
      unit: 'ms',
      description: 'Time from app launch to first meaningful paint',
      critical: true,
    },

    screen_transition_time: {
      value: 300, // 300ms
      unit: 'ms',
      description: 'Time for screen transitions and navigation',
      critical: true,
    },

    // Rendering Performance
    component_render_time: {
      value: 16, // 60fps = 16ms per frame
      unit: 'ms',
      description: 'Maximum render time per component',
      critical: true,
    },

    list_scroll_performance: {
      value: 16, // 60fps
      unit: 'ms',
      description: 'Scroll performance for lists and flatLists',
      critical: true,
    },

    // Network Performance
    api_response_time: {
      value: 2000, // 2 seconds
      unit: 'ms',
      description: 'Maximum API response time',
      critical: true,
    },

    image_load_time: {
      value: 1500, // 1.5 seconds
      unit: 'ms',
      description: 'Time to load and display images',
      critical: false,
    },

    // Storage Operations
    storage_operation_time: {
      value: 100, // 100ms
      unit: 'ms',
      description: 'AsyncStorage read/write operations',
      critical: false,
    },

    database_query_time: {
      value: 500, // 500ms
      unit: 'ms',
      description: 'Database queries and operations',
      critical: true,
    },

    // Memory Usage
    memory_usage: {
      value: 150 * 1024 * 1024, // 150MB
      unit: 'bytes',
      description: 'Total app memory usage',
      critical: true,
    },

    js_heap_size: {
      value: 100 * 1024 * 1024, // 100MB
      unit: 'bytes',
      description: 'JavaScript heap memory usage',
      critical: true,
    },

    // Bundle Size
    bundle_size: {
      value: 20 * 1024 * 1024, // 20MB
      unit: 'bytes',
      description: 'Total app bundle size',
      critical: false,
    },

    // Animation Performance
    animation_frame_rate: {
      value: 60, // 60fps
      unit: 'fps',
      description: 'Animation frame rate',
      critical: true,
    },

    gesture_response_time: {
      value: 50, // 50ms
      unit: 'ms',
      description: 'Touch gesture response time',
      critical: true,
    },
  },

  // ============================================================================
  // FEATURE-SPECIFIC BUDGETS
  // ============================================================================

  features: {
    // Job Management
    job_creation_time: {
      value: 1000, // 1 second
      unit: 'ms',
      description: 'Time to create and save a new job',
      critical: true,
    },

    job_search_time: {
      value: 800, // 800ms
      unit: 'ms',
      description: 'Job search and filtering performance',
      critical: true,
    },

    // Contractor Discovery
    contractor_swipe_performance: {
      value: 16, // 60fps
      unit: 'ms',
      description: 'Swipe gesture performance in discovery',
      critical: true,
    },

    contractor_profile_load: {
      value: 1200, // 1.2 seconds
      unit: 'ms',
      description: 'Time to load contractor profiles',
      critical: true,
    },

    // Messaging
    message_send_time: {
      value: 500, // 500ms
      unit: 'ms',
      description: 'Time to send a message',
      critical: true,
    },

    message_load_time: {
      value: 800, // 800ms
      unit: 'ms',
      description: 'Time to load message history',
      critical: true,
    },

    // Authentication
    login_time: {
      value: 2000, // 2 seconds
      unit: 'ms',
      description: 'Authentication process time',
      critical: true,
    },

    biometric_auth_time: {
      value: 1000, // 1 second
      unit: 'ms',
      description: 'Biometric authentication time',
      critical: true,
    },

    // Payment Processing
    payment_processing_time: {
      value: 3000, // 3 seconds
      unit: 'ms',
      description: 'Payment processing and confirmation',
      critical: true,
    },

    // Social Features
    social_feed_load: {
      value: 1500, // 1.5 seconds
      unit: 'ms',
      description: 'Social feed loading time',
      critical: false,
    },

    post_creation_time: {
      value: 2000, // 2 seconds
      unit: 'ms',
      description: 'Time to create and upload posts',
      critical: false,
    },
  },

  // ============================================================================
  // PERFORMANCE THRESHOLDS
  // ============================================================================

  thresholds: {
    // Warning levels (percentage of budget)
    warning: 80, // 80% of budget triggers warning
    critical: 100, // 100% of budget triggers critical alert
    severe: 150, // 150% of budget triggers severe alert

    // Trend analysis
    degradation_threshold: 20, // 20% performance degradation over time
    improvement_threshold: 15, // 15% performance improvement recognition
  },

  // ============================================================================
  // MONITORING CONFIGURATION
  // ============================================================================

  monitoring: {
    // Sampling rates
    performance_sampling_rate: 0.1, // 10% of users in production
    dev_sampling_rate: 1.0, // 100% in development

    // Reporting intervals
    report_interval: 30000, // 30 seconds
    batch_size: 50, // Max metrics per batch

    // Data retention
    max_stored_reports: 10, // Keep last 10 performance reports
    metric_retention_days: 7, // Keep metrics for 7 days

    // Alert configuration
    enable_alerts: true,
    alert_threshold: 'critical', // Alert on critical violations
    max_alerts_per_hour: 5, // Rate limiting for alerts
  },

  // ============================================================================
  // TESTING CONFIGURATION
  // ============================================================================

  testing: {
    // Performance test scenarios
    load_test_duration: 60000, // 1 minute load tests
    stress_test_multiplier: 5, // 5x normal load for stress testing
    endurance_test_duration: 300000, // 5 minute endurance tests

    // Test data sizes
    large_list_size: 1000, // Items for large list performance tests
    concurrent_operations: 10, // Concurrent operations for stress testing
    memory_stress_iterations: 100, // Iterations for memory stress tests

    // Acceptance criteria
    acceptable_failure_rate: 0.01, // 1% failure rate acceptable
    performance_regression_threshold: 0.1, // 10% regression fails tests
  },

  // ============================================================================
  // OPTIMIZATION TARGETS
  // ============================================================================

  targets: {
    // Primary metrics (must meet these for production)
    primary: [
      'app_start_time',
      'screen_transition_time',
      'component_render_time',
      'api_response_time',
      'memory_usage',
    ],

    // Secondary metrics (nice to have)
    secondary: [
      'image_load_time',
      'storage_operation_time',
      'bundle_size',
      'social_feed_load',
    ],

    // Critical user journeys
    critical_paths: [
      'user_login_flow',
      'job_creation_flow',
      'contractor_discovery_flow',
      'messaging_flow',
      'payment_flow',
    ],
  },

  // ============================================================================
  // DEVICE-SPECIFIC BUDGETS
  // ============================================================================

  devices: {
    // Low-end device budgets (more restrictive)
    low_end: {
      memory_budget_multiplier: 0.7, // 70% of base budget
      performance_budget_multiplier: 1.5, // 50% more time allowed
      bundle_size_multiplier: 0.8, // 80% of base bundle size
    },

    // High-end device budgets (more permissive)
    high_end: {
      memory_budget_multiplier: 1.5, // 150% of base budget
      performance_budget_multiplier: 0.7, // 30% less time (faster)
      bundle_size_multiplier: 1.2, // 120% of base bundle size
    },

    // Default budgets (mid-range devices)
    default: {
      memory_budget_multiplier: 1.0,
      performance_budget_multiplier: 1.0,
      bundle_size_multiplier: 1.0,
    },
  },

  // ============================================================================
  // ENVIRONMENT CONFIGURATION
  // ============================================================================

  environments: {
    development: {
      enabled: true,
      strict_mode: false, // Allow budget violations in dev
      detailed_logging: true,
      real_time_alerts: true,
    },

    staging: {
      enabled: true,
      strict_mode: true, // Enforce budgets in staging
      detailed_logging: true,
      real_time_alerts: true,
    },

    production: {
      enabled: true,
      strict_mode: true, // Strict budget enforcement
      detailed_logging: false, // Minimal logging for performance
      real_time_alerts: false, // Batch alerts to avoid spam
    },
  },
};

// ============================================================================
// BUDGET VALIDATION
// ============================================================================

/**
 * Validates performance budget configuration
 */
function validateBudgets(config) {
  const errors = [];

  // Validate budget values
  Object.entries(config.budgets).forEach(([key, budget]) => {
    if (typeof budget.value !== 'number' || budget.value <= 0) {
      errors.push(`Invalid budget value for ${key}: ${budget.value}`);
    }
  });

  // Validate thresholds
  const { warning, critical, severe } = config.thresholds;
  if (warning >= critical || critical >= severe) {
    errors.push('Threshold levels must be in ascending order: warning < critical < severe');
  }

  if (errors.length > 0) {
    throw new Error(`Performance budget validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Validate configuration on module load
if (process.env.NODE_ENV !== 'test') {
  validateBudgets(module.exports);
}