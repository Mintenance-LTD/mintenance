# Mintenance Logging Guide

## Overview

The Mintenance platform uses a comprehensive, production-ready logging system that provides:
- Structured logging with different log levels
- Automatic sensitive data sanitization
- Integration with monitoring services (Datadog, Sentry)
- Environment-specific configurations
- Platform-specific implementations (Web, Mobile, API)

## Quick Start

### Basic Usage

```typescript
import { logger } from '@/lib/logger'; // Web
import { logger } from '@/utils/logger'; // Mobile
import { logger } from '@mintenance/shared/logger'; // Shared/Packages

// Simple logging
logger.info('User logged in', { userId: user.id });
logger.warn('API rate limit approaching', { remaining: 10 });
logger.error('Payment failed', error, { orderId: order.id });
logger.debug('Cache hit', { key: cacheKey }); // Dev only
```

### Log Levels

- **debug**: Development-only debugging information
- **info**: General informational messages
- **warn**: Warning messages that need attention
- **error**: Error messages with stack traces

## Migration from console.log

### Automated Migration

We provide a script to automatically replace console.log statements:

```bash
# Analyze current console usage
node scripts/replace-console-logs.js --analyze

# Dry run (see what would change)
node scripts/replace-console-logs.js --dry-run

# Apply replacements
node scripts/replace-console-logs.js

# Process specific directory
node scripts/replace-console-logs.js --path=apps/web --verbose
```

### Manual Migration Guide

| Before | After |
|--------|-------|
| `console.log(msg)` | `logger.info(msg)` |
| `console.error(msg, err)` | `logger.error(msg, err)` |
| `console.warn(msg)` | `logger.warn(msg)` |
| `console.debug(msg)` | `logger.debug(msg)` |
| `console.log(msg, data)` | `logger.info(msg, { data })` |
| `console.table(data)` | `logger.debug('Table data', { data })` |

## Platform-Specific Implementations

### Web (Next.js)

```typescript
import {
  logger,
  logApiRequest,
  logApiResponse,
  logUserAction,
  logPerformance,
  createPageLogger,
  withLogging
} from '@/lib/logger-enhanced';

// Page-specific logger
const pageLogger = createPageLogger('dashboard');
pageLogger.info('Dashboard loaded');

// API route with logging
export default withLogging(async (req, res) => {
  req.logger.info('Processing request');
  // Your API logic here
});

// Track user actions
logUserAction('button_click', 'dashboard', { buttonId: 'save' });

// Track performance
logPerformance('api_call', 230, 'ms', { endpoint: '/api/users' });
```

### Mobile (React Native)

```typescript
import {
  logger,
  logNavigation,
  logScreenView,
  logInteraction,
  logApiCall,
  logAuth,
  logMedia,
  createScreenLogger
} from '@/utils/logger-enhanced';

// Screen-specific logger
const screenLogger = createScreenLogger('ProfileScreen');

// Track navigation
logNavigation('Home', 'Profile', { userId: 123 });

// Track screen views
logScreenView('ProfileScreen', { userId: 123 });

// Track interactions
logInteraction('Button', 'press', { buttonId: 'save' });

// Track API calls
logApiCall('POST', '/api/profile', 200, 450);

// Track authentication
logAuth('login', true, 'email');

// Track media operations
logMedia('capture', 'photo', true, { size: 1024000 });
```

### API/Backend

```typescript
import { logger } from '@mintenance/shared/logger';
import { requestLoggingMiddleware, errorLoggingMiddleware } from '@mintenance/shared/lib/logger-config';

// Express middleware
app.use(requestLoggingMiddleware());
app.use(errorLoggingMiddleware());

// Supabase Edge Functions
export async function handler(req: Request) {
  logger.info('Edge function invoked', {
    method: req.method,
    url: req.url
  });

  try {
    // Your logic here
  } catch (error) {
    logger.error('Edge function failed', error);
    throw error;
  }
}
```

## Structured Logging

Always use structured logging with context objects:

```typescript
// Good ✅
logger.info('Order processed', {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  items: order.items.length
});

// Bad ❌
logger.info(`Order ${order.id} processed for user ${user.id}`);
```

## Security & Privacy

### Automatic Sanitization

The logger automatically sanitizes sensitive fields:

```typescript
// Input
logger.info('User data', {
  email: 'user@example.com',
  password: 'secret123', // Will be redacted
  apiKey: 'sk_live_xxx', // Will be redacted
  creditCard: '4111111111111111' // Will be redacted
});

// Output (in production)
{
  "email": "user@example.com",
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]",
  "creditCard": "[REDACTED]"
}
```

### Sensitive Fields

The following field names are automatically redacted:
- password, token, secret, apiKey, api_key
- accessToken, access_token, refreshToken, refresh_token
- creditCard, credit_card, cardNumber, card_number, cvv
- ssn, social_security, authorization, bearer
- private_key, stripe, supabase_key

## Environment Configuration

### Environment Variables

```bash
# .env.local
LOG_LEVEL=debug # debug, info, warn, error
DATADOG_API_KEY=your_api_key
NEXT_PUBLIC_DATADOG_ENABLED=true
NEXT_PUBLIC_SENTRY_ENABLED=true
```

### Custom Configuration

```typescript
import { createLogger } from '@mintenance/shared/lib/logger-config';

const customLogger = createLogger({
  service: 'payment-processor',
  environment: 'production',
  minLogLevel: 'info',
  enableDatadog: true,
  datadogApiKey: process.env.DATADOG_API_KEY,
  enableFileLogging: true,
  fileLogPath: '/var/log/payments.log'
});
```

## Monitoring Integration

### Datadog

The logger automatically sends logs to Datadog when configured:

```typescript
// Logs are automatically sent to Datadog with:
// - Service name (mintenance-web, mintenance-mobile, etc.)
// - Environment (development, staging, production)
// - Log level
// - Structured metadata
// - Error stack traces
```

### Sentry

Error tracking is automatic when Sentry is configured:

```typescript
// Errors are automatically captured with:
// - Full stack traces
// - Breadcrumbs from previous logs
// - User context
// - Request/session information
```

## Performance Considerations

### Batching

In production, logs are batched to reduce network overhead:

```typescript
// Logs are batched and sent every 5 seconds or when buffer reaches 100 entries
// This happens automatically in production
```

### Log Levels

Different levels for different environments:

- **Development**: All levels (debug, info, warn, error)
- **Staging**: info, warn, error
- **Production**: warn, error (or info if needed)

## Best Practices

### 1. Use Descriptive Messages

```typescript
// Good ✅
logger.info('Payment processing completed', { /* context */ });

// Bad ❌
logger.info('Done', { /* context */ });
```

### 2. Include Context

```typescript
// Good ✅
logger.error('Database query failed', error, {
  query: 'SELECT * FROM users',
  userId: req.user.id,
  attempt: retryCount
});

// Bad ❌
logger.error('Query failed');
```

### 3. Use Appropriate Log Levels

```typescript
// Debug - Development only
logger.debug('Cache lookup', { key, found: true });

// Info - Normal operations
logger.info('User logged in', { userId });

// Warn - Potential issues
logger.warn('Rate limit approaching', { remaining: 10 });

// Error - Actual failures
logger.error('Payment failed', error, { orderId });
```

### 4. Create Component/Page Loggers

```typescript
// Create scoped loggers for better organization
const authLogger = logger.child({ component: 'auth' });
const paymentLogger = logger.child({ component: 'payment' });

authLogger.info('Login attempt', { username });
paymentLogger.error('Charge failed', error);
```

### 5. Track Important Metrics

```typescript
// Track performance
const start = Date.now();
await processPayment();
logger.info('Payment processed', {
  duration: Date.now() - start,
  metric: 'payment_processing_time'
});

// Track business metrics
logger.info('Subscription created', {
  plan: 'premium',
  price: 99.99,
  metric: 'subscription_created'
});
```

## Testing

### Mock Logger in Tests

```typescript
// __tests__/setup.ts
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  }
}));
```

### Test Logger Calls

```typescript
import { logger } from '@/lib/logger';

test('logs user action', () => {
  const action = { type: 'click', target: 'button' };

  logUserAction(action);

  expect(logger.info).toHaveBeenCalledWith(
    'User action',
    expect.objectContaining({
      action: action.type,
      target: action.target
    })
  );
});
```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify environment variables are set
3. Ensure logger is imported correctly
4. Check if in test environment (logs may be mocked)

### Sensitive Data in Logs

1. Review sanitization patterns
2. Add custom sanitization rules
3. Use separate loggers for sensitive operations

### Performance Issues

1. Enable batching in production
2. Reduce debug logging in production
3. Use appropriate log levels
4. Consider sampling for high-volume logs

## Migration Checklist

- [ ] Run analysis script to identify console.log usage
- [ ] Review sensitive data handling requirements
- [ ] Configure environment variables
- [ ] Run replacement script in dry-run mode
- [ ] Apply replacements incrementally
- [ ] Test in development environment
- [ ] Verify monitoring integration
- [ ] Deploy to staging for testing
- [ ] Monitor production logs post-deployment

## Support

For questions or issues with the logging system:
1. Check this documentation
2. Review the example implementations
3. Check the test files for usage patterns
4. Contact the DevOps team for monitoring setup