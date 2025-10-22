# Sentry Error Tracking Implementation Plan

**Status:** Ready for Implementation
**Priority:** P1 - High (Production Blocker)
**Estimated Effort:** 6-8 hours (4-6 mobile, 2-4 web)
**Target Completion:** Before production launch
**Related TODOs:**
- `apps/mobile/src/components/ErrorBoundary.tsx:56`
- `apps/web/components/ui/ErrorBoundary.tsx:44`

---

## Executive Summary

Implement Sentry error tracking across both mobile (React Native) and web (Next.js) applications to capture, monitor, and analyze runtime errors in production. This enables proactive bug detection, faster debugging, and improved application stability.

---

## Goals

### Primary Goals
1. ✅ Capture all unhandled errors and crashes in production
2. ✅ Provide detailed error context (user info, device, breadcrumbs)
3. ✅ Enable source map support for readable stack traces
4. ✅ Set up alerting for critical errors
5. ✅ Integrate with existing ErrorBoundary components

### Secondary Goals
1. Performance monitoring (optional, can be phased)
2. User feedback collection on errors
3. Release tracking and error regression detection
4. Custom error tagging and filtering

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Sentry Dashboard                        │
│  (Error tracking, monitoring, alerts, release tracking)     │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │                   │
         ┌──────────▼─────────┐  ┌─────▼──────────┐
         │  Mobile App        │  │   Web App      │
         │  (React Native)    │  │   (Next.js)    │
         │                    │  │                │
         │  @sentry/         │  │  @sentry/      │
         │  react-native      │  │  nextjs        │
         └────────────────────┘  └────────────────┘
```

---

## Implementation Plan

### Phase 1: Sentry Account Setup (30 minutes)

#### 1.1 Create Sentry Organization
- [ ] Sign up at https://sentry.io
- [ ] Create organization: "Mintenance" or use existing
- [ ] Choose appropriate plan (Free tier sufficient for development)

#### 1.2 Create Projects
- [ ] Create project: "mintenance-mobile" (React Native)
- [ ] Create project: "mintenance-web" (Next.js)
- [ ] Note DSN for each project

#### 1.3 Configure Teams & Access
- [ ] Create development team
- [ ] Add team members
- [ ] Configure access permissions

---

### Phase 2: Mobile App Integration (4-6 hours)

#### 2.1 Install Dependencies (15 minutes)

```bash
cd apps/mobile
npm install --save @sentry/react-native
```

Or with Yarn:
```bash
yarn add @sentry/react-native
```

**Version:** Use latest stable (currently ^5.x)

#### 2.2 Configure Sentry (30 minutes)

**File:** `apps/mobile/src/config/sentry.ts` (NEW)

```typescript
import * as Sentry from '@sentry/react-native';
import { config } from './environment';

// Initialize Sentry
export const initSentry = (): void => {
  if (!config.sentryDsn) {
    if (config.environment === 'development') {
      console.warn('[Sentry] DSN not configured - error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,

    // Environment
    environment: config.environment,

    // Enable automatic session tracking
    enableAutoSessionTracking: true,

    // Set sample rate for performance monitoring
    tracesSampleRate: config.environment === 'production' ? 0.2 : 1.0,

    // Enable native crash tracking
    enableNative: true,
    enableNativeCrashHandling: true,
    enableNativeNagger: config.environment === 'development',

    // Ignore specific errors
    ignoreErrors: [
      // Network errors that are expected
      'Network request failed',
      'Network Error',
      'fetch failed',
      // User cancellations
      'User cancelled',
      'Aborted',
    ],

    // Breadcrumbs configuration
    maxBreadcrumbs: 100,

    // Attach stack traces to messages
    attachStacktrace: true,

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Performance monitoring configuration
        tracingOrigins: ['localhost', config.apiBaseUrl],
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],

    // Release versioning
    release: `${config.version}`,
    dist: config.buildNumber,

    // Before send hook - scrub sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove tokens, passwords, etc.
            const sanitized = { ...breadcrumb.data };
            ['password', 'token', 'authorization', 'cookie'].forEach(key => {
              if (sanitized[key]) sanitized[key] = '[Filtered]';
            });
            return { ...breadcrumb, data: sanitized };
          }
          return breadcrumb;
        });
      }

      // Remove sensitive request data
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        ['authorization', 'cookie', 'x-api-key'].forEach(key => {
          if (headers[key]) headers[key] = '[Filtered]';
        });
        event.request.headers = headers;
      }

      return event;
    },
  });

  // Set default tags
  Sentry.setTag('app.type', 'mobile');
  Sentry.setTag('app.platform', Platform.OS);
  Sentry.setTag('app.version', config.version);
};

// Helper to set user context
export const setSentryUser = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

// Helper to clear user on logout
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Helper to add custom context
export const addSentryBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Manual error reporting
export const reportError = (
  error: Error,
  context?: Record<string, any>
) => {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
};

export default Sentry;
```

#### 2.3 Initialize in App Entry Point (15 minutes)

**File:** `apps/mobile/App.tsx` or `apps/mobile/index.js`

```typescript
import { initSentry } from './src/config/sentry';

// Initialize Sentry BEFORE anything else
initSentry();

// Rest of your app initialization
```

#### 2.4 Update ErrorBoundary Component (30 minutes)

**File:** `apps/mobile/src/components/ErrorBoundary.tsx:56`

Replace the TODO comment with actual Sentry integration:

```typescript
import * as Sentry from '@sentry/react-native';

class ErrorBoundary extends React.Component<Props, State> {
  // ... existing code ...

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    if (__DEV__) {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Send to Sentry
    Sentry.withScope(scope => {
      // Add component stack trace
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });

      // Add error boundary tag
      scope.setTag('error.boundary', 'true');

      // Capture the exception
      Sentry.captureException(error);
    });

    // Update state to show fallback UI
    this.setState({
      hasError: true,
      error,
    });
  }

  // ... rest of component ...
}
```

#### 2.5 Configure Source Maps Upload (1-2 hours)

**File:** `apps/mobile/eas.json` (update)

```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_ORG": "mintenance",
        "SENTRY_PROJECT": "mintenance-mobile"
      }
    }
  }
}
```

**File:** `apps/mobile/app.json` (update)

```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "mintenance",
            "project": "mintenance-mobile"
          }
        }
      ]
    }
  }
}
```

**Install Sentry CLI:**
```bash
npm install -g @sentry/cli
```

**Authenticate:**
```bash
sentry-cli login
```

#### 2.6 Update Environment Configuration (15 minutes)

**File:** `apps/mobile/.env.example` (already done)

Ensure EXPO_PUBLIC_SENTRY_DSN is documented.

**File:** `apps/mobile/.env` (developer creates)

Add actual DSN from Sentry project settings.

#### 2.7 Test Mobile Integration (1 hour)

**Create test screens/functions:**

```typescript
// Test error capture
const testSentryError = () => {
  throw new Error('Test Sentry Error - Please Ignore');
};

// Test custom event
const testSentryEvent = () => {
  Sentry.captureMessage('Test event from mobile app', 'info');
};

// Test breadcrumbs
const testBreadcrumbs = () => {
  Sentry.addBreadcrumb({
    message: 'User performed action',
    category: 'navigation',
    level: 'info',
  });
};
```

**Verification checklist:**
- [ ] Errors appear in Sentry dashboard
- [ ] Stack traces are readable (source maps working)
- [ ] User context is attached
- [ ] Breadcrumbs are captured
- [ ] Device info is included
- [ ] Releases are tracked properly

---

### Phase 3: Web App Integration (2-4 hours)

#### 3.1 Install Dependencies (10 minutes)

```bash
cd apps/web
npm install --save @sentry/nextjs
```

#### 3.2 Configure Sentry (20 minutes)

Run the Sentry wizard:
```bash
npx @sentry/wizard@latest -i nextjs
```

This creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Updates `next.config.js`

**File:** `apps/web/sentry.client.config.ts` (update)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Replays (session recording)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/.*\.mintenance\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignore errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection',
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Before send
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      ['authorization', 'cookie'].forEach(key => {
        if (headers[key]) headers[key] = '[Filtered]';
      });
      event.request.headers = headers;
    }
    return event;
  },
});
```

**File:** `apps/web/sentry.server.config.ts` (update)

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Server-specific config
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],

  beforeSend(event) {
    // Scrub server-side sensitive data
    return event;
  },
});
```

#### 3.3 Update Web ErrorBoundary (30 minutes)

**File:** `apps/web/components/ui/ErrorBoundary.tsx:44`

```typescript
import * as Sentry from '@sentry/nextjs';

class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Send to Sentry
    Sentry.withScope(scope => {
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      });
      scope.setTag('error.boundary', 'web');
      Sentry.captureException(error);
    });

    // Update state
    this.setState({ hasError: true, error });
  }
}
```

#### 3.4 Configure Source Maps Upload (30 minutes)

Sentry wizard should have configured this automatically in `next.config.js`.

**Verify:** `next.config.js` includes:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: 'mintenance',
    project: 'mintenance-web',
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

**Set auth token:**
```bash
# Option 1: Environment variable
export SENTRY_AUTH_TOKEN=your-token-here

# Option 2: .sentryclirc file (gitignored)
echo "[auth]
token=your-token-here" > .sentryclirc
```

#### 3.5 Update Environment Configuration (10 minutes)

**File:** `apps/web/.env.example` (already done)

**File:** `apps/web/.env.local` (developer creates)

Add SENTRY_DSN from Sentry web project.

#### 3.6 Test Web Integration (1 hour)

**Create test page:** `apps/web/app/test-sentry/page.tsx`

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentry() {
  return (
    <div>
      <button onClick={() => {
        throw new Error('Test Sentry Error - Web');
      }}>
        Throw Error
      </button>

      <button onClick={() => {
        Sentry.captureMessage('Test message from web', 'info');
      }}>
        Send Test Message
      </button>
    </div>
  );
}
```

**Verification checklist:**
- [ ] Errors appear in Sentry dashboard
- [ ] Source maps work (readable stack traces)
- [ ] Server-side errors tracked
- [ ] Client-side errors tracked
- [ ] API route errors tracked

---

### Phase 4: Advanced Configuration (1-2 hours)

#### 4.1 User Context Integration

**Mobile:**
```typescript
// In login handler
import { setSentryUser } from '@/config/sentry';

const handleLogin = async (user) => {
  // ... login logic ...
  setSentryUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

// In logout handler
import { clearSentryUser } from '@/config/sentry';

const handleLogout = () => {
  clearSentryUser();
  // ... logout logic ...
};
```

**Web:** Similar pattern in auth callbacks

#### 4.2 Performance Monitoring

**Mobile:**
```typescript
import * as Sentry from '@sentry/react-native';

// Track screen load performance
const HomeScreen = () => {
  useEffect(() => {
    const transaction = Sentry.startTransaction({
      name: 'HomeScreen',
      op: 'navigation',
    });

    return () => {
      transaction.finish();
    };
  }, []);
};
```

**Web:**
```typescript
// Automatic via @sentry/nextjs
// Configure tracesSampleRate in config
```

#### 4.3 Custom Tags & Context

```typescript
// Add custom tags
Sentry.setTag('feature', 'contractor-search');
Sentry.setTag('user.role', 'contractor');

// Add custom context
Sentry.setContext('search', {
  query: 'plumber',
  filters: { radius: 10, rating: 4 },
});
```

#### 4.4 Alerting Rules

**In Sentry Dashboard:**
1. Go to Alerts > Create Alert Rule
2. Configure conditions:
   - Error count > 10 in 5 minutes
   - Error rate increase > 50%
   - First seen error
3. Set notification channels (email, Slack, PagerDuty)

---

### Phase 5: CI/CD Integration (1 hour)

#### 5.1 GitHub Actions Integration

**File:** `.github/workflows/deploy.yml` (update)

```yaml
- name: Create Sentry Release
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: mintenance
  run: |
    # Install Sentry CLI
    curl -sL https://sentry.io/get-cli/ | bash

    # Create release
    sentry-cli releases new "${{ github.sha }}"

    # Associate commits
    sentry-cli releases set-commits "${{ github.sha }}" --auto

    # Finalize release
    sentry-cli releases finalize "${{ github.sha }}"

    # Deploy notification
    sentry-cli releases deploys "${{ github.sha }}" new -e production
```

#### 5.2 Secrets Configuration

Add to GitHub repository secrets:
- `SENTRY_AUTH_TOKEN`: From Sentry > Settings > Auth Tokens
- `SENTRY_DSN_MOBILE`: Mobile project DSN
- `SENTRY_DSN_WEB`: Web project DSN

---

## Testing Checklist

### Mobile App
- [ ] Unhandled error captured
- [ ] Handled error logged
- [ ] User context attached
- [ ] Breadcrumbs visible
- [ ] Source maps readable
- [ ] Release tracking works
- [ ] Crashes reported (native)
- [ ] Network errors logged
- [ ] Performance traces captured

### Web App
- [ ] Client-side errors captured
- [ ] Server-side errors captured
- [ ] API route errors captured
- [ ] Source maps readable
- [ ] User context attached
- [ ] Session replay working
- [ ] Performance monitoring active
- [ ] Build uploads source maps

---

## Monitoring & Maintenance

### Daily Tasks
- [ ] Review new errors in dashboard
- [ ] Triage critical issues
- [ ] Assign errors to developers

### Weekly Tasks
- [ ] Review error trends
- [ ] Update alert rules if needed
- [ ] Clean up resolved issues
- [ ] Review performance metrics

### Monthly Tasks
- [ ] Audit ignored errors
- [ ] Review Sentry quota usage
- [ ] Update SDK versions
- [ ] Review and optimize sampling rates

---

## Cost Estimation

**Sentry Pricing Tiers:**

| Tier | Events/Month | Cost | Suitable For |
|------|--------------|------|--------------|
| Developer | 5,000 | Free | Development/Testing |
| Team | 50,000 | $26/mo | Small production apps |
| Business | 100,000+ | $80+/mo | Growing apps |

**Recommendations:**
- Start with Developer tier during development
- Upgrade to Team tier at launch
- Monitor quota usage and adjust sampling rates
- Use beforeSend to filter noise

---

## Security Considerations

### Data Privacy
- ✅ Scrub sensitive data in beforeSend hooks
- ✅ Filter authorization headers
- ✅ Mask PII in session replays
- ✅ Don't log passwords or tokens
- ✅ Comply with GDPR/privacy regulations

### Access Control
- ✅ Limit dashboard access to dev team
- ✅ Use role-based permissions
- ✅ Rotate auth tokens regularly
- ✅ Audit access logs

---

## Rollback Plan

If issues occur:

1. **Disable Sentry Initialization**
   - Comment out `initSentry()` call
   - Deploy hotfix

2. **Revert to Console Logging**
   - Keep existing console.error calls
   - Remove Sentry.captureException

3. **Investigate Offline**
   - Sentry SDKs cache events
   - Won't affect app performance

---

## Success Metrics

After implementation, measure:

1. **Error Detection**
   - Time to first error detection: < 5 minutes
   - Error resolution time: Reduced by 50%
   - Undetected errors: < 5%

2. **Code Quality**
   - Crash-free rate: > 99.5%
   - Error rate: < 0.1% of sessions
   - Repeat errors: < 10%

3. **Developer Experience**
   - Debugging time: Reduced by 60%
   - Stack trace readability: 100%
   - False positives: < 5%

---

## Resources

### Documentation
- Sentry React Native: https://docs.sentry.io/platforms/react-native/
- Sentry Next.js: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Source Maps: https://docs.sentry.io/platforms/javascript/sourcemaps/

### Internal
- Mobile ErrorBoundary: `apps/mobile/src/components/ErrorBoundary.tsx`
- Web ErrorBoundary: `apps/web/components/ui/ErrorBoundary.tsx`
- TODO Audit: `TODO_AUDIT_AND_TRIAGE.md`

### Support
- Sentry Community: https://forum.sentry.io/
- GitHub Issues: https://github.com/getsentry/sentry-react-native/issues

---

## Next Steps

1. **Immediate (This Sprint)**
   - [ ] Create Sentry account and projects
   - [ ] Implement mobile integration (Phase 2)
   - [ ] Implement web integration (Phase 3)
   - [ ] Test in development environment

2. **Before Production Launch**
   - [ ] Complete CI/CD integration
   - [ ] Set up alerting rules
   - [ ] Document for team
   - [ ] Test in staging environment

3. **Post-Launch**
   - [ ] Monitor error rates
   - [ ] Adjust sampling rates based on volume
   - [ ] Train team on Sentry dashboard
   - [ ] Set up regular review process

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Owner:** Development Team
**Status:** Ready for Implementation
