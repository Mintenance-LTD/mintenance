/**
 * Security Monitoring Configuration
 * 
 * This configuration file defines security monitoring settings,
 * alert thresholds, and automated response actions.
 */

module.exports = {
  // Security monitoring settings
  monitoring: {
    // Real-time monitoring
    realtime: {
      enabled: true,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
    },

    // Event retention
    retention: {
      securityEvents: 90, // days
      auditLogs: 2555, // 7 years for compliance
      webhookEvents: 30, // days
    },

    // Alert thresholds
    thresholds: {
      criticalEventsPerHour: 5,
      highSeverityEventsPerHour: 20,
      failedAuthAttemptsPerIP: 10,
      suspiciousActivityPerIP: 50,
      rateLimitViolationsPerIP: 100,
    },
  },

  // Automated response actions
  responses: {
    // IP blocking
    ipBlocking: {
      enabled: true,
      autoBlockThreshold: 20, // critical events per hour
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      whitelist: [
        '127.0.0.1',
        '::1',
        // Add trusted IPs here
      ],
    },

    // Rate limiting
    rateLimiting: {
      enabled: true,
      loginAttempts: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5,
        blockDuration: 30 * 60 * 1000, // 30 minutes
      },
      apiRequests: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        blockDuration: 5 * 60 * 1000, // 5 minutes
      },
    },

    // Notification settings
    notifications: {
      enabled: true,
      channels: {
        email: {
          enabled: true,
          recipients: [
            'security@mintenance.com',
            'admin@mintenance.com',
          ],
          criticalOnly: false,
        },
        slack: {
          enabled: true,
          webhookUrl: process.env.SLACK_SECURITY_WEBHOOK,
          channel: '#security-alerts',
          criticalOnly: true,
        },
        sms: {
          enabled: false,
          recipients: [
            '+44123456789', // UK number format
          ],
          criticalOnly: true,
        },
      },
    },
  },

  // Security scanning schedule
  scanning: {
    // Automated security scans
    schedule: {
      daily: {
        enabled: true,
        time: '02:00', // 2 AM UTC
        timezone: 'UTC',
      },
      weekly: {
        enabled: true,
        day: 'sunday',
        time: '03:00',
        timezone: 'UTC',
      },
      monthly: {
        enabled: true,
        day: 1, // First day of month
        time: '04:00',
        timezone: 'UTC',
      },
    },

    // Scan types
    types: {
      dependencyVulnerabilities: {
        enabled: true,
        severity: 'moderate', // low, moderate, high, critical
      },
      codeSecurity: {
        enabled: true,
        patterns: [
          'hardcoded_secrets',
          'unsafe_eval',
          'sql_injection',
          'xss_vulnerabilities',
        ],
      },
      configurationSecurity: {
        enabled: true,
        checks: [
          'security_headers',
          'cors_configuration',
          'authentication_setup',
          'authorization_policies',
        ],
      },
      databaseSecurity: {
        enabled: true,
        checks: [
          'rls_policies',
          'admin_functions',
          'sensitive_data',
          'access_patterns',
        ],
      },
    },
  },

  // Compliance monitoring
  compliance: {
    gdpr: {
      enabled: true,
      dataRetention: {
        userData: 2555, // 7 years
        auditLogs: 2555, // 7 years
        securityEvents: 90, // 90 days
      },
      monitoring: {
        dataExports: true,
        dataDeletions: true,
        accessRequests: true,
        consentChanges: true,
      },
    },

    pci: {
      enabled: true,
      requirements: [
        'encryption_in_transit',
        'encryption_at_rest',
        'access_controls',
        'audit_logging',
        'vulnerability_management',
      ],
    },

    iso27001: {
      enabled: false, // Enable if ISO 27001 compliance is required
      controls: [
        'information_security_policies',
        'access_control',
        'cryptography',
        'operations_security',
        'communications_security',
      ],
    },
  },

  // Incident response
  incidentResponse: {
    // Severity levels
    severity: {
      critical: {
        responseTime: 15, // minutes
        escalation: ['security@mintenance.com', 'admin@mintenance.com'],
        autoActions: ['block_ip', 'notify_team', 'create_ticket'],
      },
      high: {
        responseTime: 60, // minutes
        escalation: ['security@mintenance.com'],
        autoActions: ['notify_team', 'log_event'],
      },
      medium: {
        responseTime: 240, // minutes
        escalation: [],
        autoActions: ['log_event'],
      },
      low: {
        responseTime: 1440, // minutes (24 hours)
        escalation: [],
        autoActions: ['log_event'],
      },
    },

    // Response procedures
    procedures: {
      dataBreach: {
        steps: [
          'contain_breach',
          'assess_impact',
          'notify_authorities',
          'notify_affected_users',
          'implement_remediation',
          'conduct_post_incident_review',
        ],
        timeline: {
          containment: 1, // hours
          assessment: 24, // hours
          notification: 72, // hours
        },
      },
      securityIncident: {
        steps: [
          'identify_threat',
          'contain_threat',
          'eradicate_threat',
          'recover_systems',
          'lessons_learned',
        ],
        timeline: {
          identification: 1, // hours
          containment: 4, // hours
          eradication: 24, // hours
        },
      },
    },
  },

  // Integration settings
  integrations: {
    // External security services
    external: {
      snyk: {
        enabled: true,
        apiKey: process.env.SNYK_API_KEY,
        orgId: process.env.SNYK_ORG_ID,
      },
      sentry: {
        enabled: true,
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
      },
      datadog: {
        enabled: false, // Enable if using Datadog
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
      },
    },

    // Internal systems
    internal: {
      supabase: {
        enabled: true,
        realtime: true,
        webhooks: true,
      },
      vercel: {
        enabled: true,
        analytics: true,
        functions: true,
      },
    },
  },

  // Development and testing
  development: {
    // Test mode settings
    testMode: {
      enabled: process.env.NODE_ENV === 'development',
      mockEvents: true,
      reducedRetention: true,
      disableBlocking: true,
    },

    // Debug settings
    debug: {
      enabled: process.env.NODE_ENV === 'development',
      logLevel: 'debug',
      verboseLogging: true,
      eventReplay: true,
    },
  },
};
