# Week 4-8 Performance Optimization Implementation Plan

## Executive Summary

This comprehensive plan outlines a 5-week performance optimization initiative for the Mintenance marketplace platform, covering both mobile (React Native/Expo) and web (Next.js) applications. The plan leverages the existing performance monitoring infrastructure and systematically addresses performance budgets, caching, database optimization, bundle size reduction, and network efficiency.

**Current State:**
- Architecture Grade: A- (90/100)
- Performance monitoring infrastructure in place
- No enforced performance budgets
- Basic caching strategies
- Unoptimized database queries
- No bundle analysis configured
- Limited network optimization

**Target State:**
- Architecture Grade: A+ (95/100)
- Enforced performance budgets with CI/CD integration
- Multi-layer caching (memory, disk, CDN)
- Optimized database with strategic indexing
- 30% bundle size reduction
- 40% faster network operations

**Success Metrics:**
- Mobile app startup time: <2s (currently ~3s)
- Web initial load time: <1.5s (currently ~2.5s)
- API response time p95: <500ms (currently ~800ms)
- Database query p95: <200ms (currently ~400ms)
- Bundle size: <15MB mobile, <500KB web initial (currently 20MB/800KB)
- Test coverage maintained: >80%

---

## Week 4: Performance Budgets & Monitoring

### Objectives
- Define and enforce performance budgets for all critical metrics
- Implement automated budget enforcement in CI/CD
- Create real-time performance dashboard
- Establish baseline performance metrics

### Tasks

#### Task 4.1: Define Performance Budgets (2 days)

**File:** `apps/mobile/src/config/performanceBudgets.config.ts`

```typescript
// apps/mobile/src/config/performanceBudgets.config.ts
import { BudgetEnforcementRule } from '../utils/performance/types';

export const MOBILE_PERFORMANCE_BUDGETS: BudgetEnforcementRule[] = [
  // App Startup & Navigation
  {
    id: 'app-startup',
    name: 'App Startup Time',
    metric: 'app_startup',
    warning: 2000,
    critical: 3000,
    enabled: true,
    scope: 'global',
    description: 'Time from app launch to interactive',
  },
  {
    id: 'screen-transition',
    name: 'Screen Transition',
    metric: 'screen_transition',
    warning: 100,
    critical: 200,
    enabled: true,
    scope: 'navigation',
    description: 'Time between screen navigation actions',
  },

  // Network Operations
  {
    id: 'api-response-time',
    name: 'API Response Time',
    metric: 'api_response',
    warning: 500,
    critical: 1000,
    enabled: true,
    scope: 'network',
    description: 'Time from request to response',
  },
  {
    id: 'api-error-rate',
    name: 'API Error Rate',
    metric: 'api_error_rate',
    warning: 0.01, // 1%
    critical: 0.05, // 5%
    enabled: true,
    scope: 'network',
    description: 'Percentage of failed API requests',
  },

  // Database Operations
  {
    id: 'db-query-time',
    name: 'Database Query Time',
    metric: 'db_query',
    warning: 200,
    critical: 500,
    enabled: true,
    scope: 'database',
    description: 'Time to execute database queries',
  },

  // Memory & Resources
  {
    id: 'memory-usage',
    name: 'Memory Usage',
    metric: 'memory_usage',
    warning: 150, // MB
    critical: 200, // MB
    enabled: true,
    scope: 'system',
    description: 'App memory consumption',
  },
  {
    id: 'js-bundle-size',
    name: 'JS Bundle Size',
    metric: 'bundle_size',
    warning: 15 * 1024 * 1024, // 15MB
    critical: 20 * 1024 * 1024, // 20MB
    enabled: true,
    scope: 'bundle',
    description: 'JavaScript bundle size',
  },

  // Component Performance
  {
    id: 'component-render',
    name: 'Component Render Time',
    metric: 'component_render',
    warning: 16, // 60fps target
    critical: 32, // 30fps threshold
    enabled: true,
    scope: 'render',
    description: 'Time to render React components',
  },
  {
    id: 'list-scroll-fps',
    name: 'List Scroll FPS',
    metric: 'scroll_fps',
    warning: 50,
    critical: 40,
    enabled: true,
    scope: 'ui',
    description: 'Frames per second during list scrolling',
  },

  // Payment Operations
  {
    id: 'payment-processing',
    name: 'Payment Processing Time',
    metric: 'payment_processing',
    warning: 3000,
    critical: 5000,
    enabled: true,
    scope: 'payment',
    description: 'Time to complete payment transaction',
  },
];

export const WEB_PERFORMANCE_BUDGETS: BudgetEnforcementRule[] = [
  // Core Web Vitals
  {
    id: 'web-lcp',
    name: 'Largest Contentful Paint',
    metric: 'lcp',
    warning: 2500,
    critical: 4000,
    enabled: true,
    scope: 'web-vitals',
    description: 'Largest Contentful Paint (Core Web Vital)',
  },
  {
    id: 'web-fid',
    name: 'First Input Delay',
    metric: 'fid',
    warning: 100,
    critical: 300,
    enabled: true,
    scope: 'web-vitals',
    description: 'First Input Delay (Core Web Vital)',
  },
  {
    id: 'web-cls',
    name: 'Cumulative Layout Shift',
    metric: 'cls',
    warning: 0.1,
    critical: 0.25,
    enabled: true,
    scope: 'web-vitals',
    description: 'Cumulative Layout Shift (Core Web Vital)',
  },

  // Load Performance
  {
    id: 'web-ttfb',
    name: 'Time to First Byte',
    metric: 'ttfb',
    warning: 600,
    critical: 1000,
    enabled: true,
    scope: 'load',
    description: 'Server response time',
  },
  {
    id: 'web-tti',
    name: 'Time to Interactive',
    metric: 'tti',
    warning: 3500,
    critical: 5000,
    enabled: true,
    scope: 'load',
    description: 'Time until page is fully interactive',
  },

  // Bundle Size
  {
    id: 'web-initial-js',
    name: 'Initial JavaScript Bundle',
    metric: 'initial_js',
    warning: 500 * 1024, // 500KB
    critical: 800 * 1024, // 800KB
    enabled: true,
    scope: 'bundle',
    description: 'Initial JS bundle size',
  },
  {
    id: 'web-total-bundle',
    name: 'Total Bundle Size',
    metric: 'total_bundle',
    warning: 2 * 1024 * 1024, // 2MB
    critical: 3 * 1024 * 1024, // 3MB
    enabled: true,
    scope: 'bundle',
    description: 'Total bundle size including all chunks',
  },
];
```

**File:** `apps/web/lib/performanceBudgets.config.ts`

Create similar configuration for web with Next.js-specific budgets.

#### Task 4.2: CI/CD Budget Enforcement (2 days)

**File:** `.github/workflows/performance-budgets.yml`

```yaml
name: Performance Budget Enforcement

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  mobile-performance:
    name: Mobile Performance Budgets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build mobile bundle
        working-directory: apps/mobile
        run: |
          npm run build:android -- --no-wait
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Analyze bundle size
        id: bundle-analysis
        working-directory: apps/mobile
        run: |
          node scripts/analyzeBundleSize.js > bundle-report.json

      - name: Check performance budgets
        working-directory: apps/mobile
        run: |
          node scripts/checkPerformanceBudgets.js
        env:
          BUDGET_CONFIG: src/config/performanceBudgets.config.ts

      - name: Upload bundle analysis
        uses: actions/upload-artifact@v4
        with:
          name: mobile-bundle-analysis
          path: apps/mobile/bundle-report.json

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('apps/mobile/bundle-report.json', 'utf8'));

            const comment = `## 📊 Mobile Performance Budget Report

            | Metric | Current | Budget | Status |
            |--------|---------|--------|--------|
            | Bundle Size | ${report.bundleSize} | 15MB | ${report.bundleSize < 15 * 1024 * 1024 ? '✅' : '❌'} |
            | Startup Time | ${report.startupTime}ms | 2000ms | ${report.startupTime < 2000 ? '✅' : '❌'} |
            | Memory Usage | ${report.memoryUsage}MB | 150MB | ${report.memoryUsage < 150 ? '✅' : '❌'} |

            ${report.violations.length > 0 ? '### ⚠️ Budget Violations\n' + report.violations.join('\n') : '### ✅ All budgets passed!'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  web-performance:
    name: Web Performance Budgets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        working-directory: apps/web
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Analyze bundle with Next.js Bundle Analyzer
        working-directory: apps/web
        run: |
          npm install @next/bundle-analyzer
          ANALYZE=true npm run build

      - name: Check Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
          budgetPath: apps/web/lighthouse-budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Check performance budgets
        working-directory: apps/web
        run: |
          node scripts/checkWebBudgets.js
```

**File:** `apps/mobile/scripts/analyzeBundleSize.js`

```javascript
// apps/mobile/scripts/analyzeBundleSize.js
const fs = require('fs');
const path = require('path');

async function analyzeBundleSize() {
  const buildDir = path.join(__dirname, '../.expo-shared');

  // Find the generated bundle
  const bundlePath = findBundleFile(buildDir);

  if (!bundlePath) {
    console.error('Could not find bundle file');
    process.exit(1);
  }

  const stats = fs.statSync(bundlePath);
  const bundleSizeInMB = stats.size / (1024 * 1024);

  const report = {
    bundleSize: stats.size,
    bundleSizeMB: bundleSizeInMB.toFixed(2),
    bundlePath: bundlePath,
    timestamp: new Date().toISOString(),
    violations: [],
  };

  // Check against budgets
  const BUDGET_SIZE_MB = 15;
  if (bundleSizeInMB > BUDGET_SIZE_MB) {
    report.violations.push(
      `❌ Bundle size (${bundleSizeInMB.toFixed(2)}MB) exceeds budget (${BUDGET_SIZE_MB}MB)`
    );
  }

  console.log(JSON.stringify(report, null, 2));

  // Exit with error if violations found
  if (report.violations.length > 0) {
    process.exit(1);
  }
}

function findBundleFile(dir) {
  // Implementation to find the bundle file
  const files = fs.readdirSync(dir, { recursive: true });
  return files.find(f => f.endsWith('.bundle') || f.endsWith('.js'));
}

analyzeBundleSize().catch(console.error);
```

**File:** `apps/web/lighthouse-budget.json`

```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "interactive",
          "budget": 3500
        },
        {
          "metric": "first-contentful-paint",
          "budget": 1500
        },
        {
          "metric": "largest-contentful-paint",
          "budget": 2500
        },
        {
          "metric": "speed-index",
          "budget": 3000
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 500
        },
        {
          "resourceType": "stylesheet",
          "budget": 100
        },
        {
          "resourceType": "image",
          "budget": 300
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "script",
          "budget": 10
        },
        {
          "resourceType": "stylesheet",
          "budget": 5
        }
      ]
    }
  ]
}
```

#### Task 4.3: Real-time Performance Dashboard (2 days)

**File:** `apps/mobile/src/screens/PerformanceDashboardScreen.tsx`

```typescript
// apps/mobile/src/screens/PerformanceDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { performanceMonitor } from '../utils/performance';
import { PerformanceReport, PerformanceViolation } from '../utils/performance/types';

export const PerformanceDashboardScreen: React.FC = () => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    const latestReport = performanceMonitor.generateReport();
    setReport(latestReport);
  };

  useEffect(() => {
    loadReport();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadReport, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  if (!report) {
    return (
      <View style={styles.container}>
        <Text>Loading performance data...</Text>
      </View>
    );
  }

  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 70) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Overall Health Score */}
      <View style={styles.healthCard}>
        <Text style={styles.healthTitle}>Performance Health</Text>
        <Text style={[styles.healthScore, { color: getHealthColor(report.summary.healthScore) }]}>
          {report.summary.healthScore.toFixed(0)}%
        </Text>
        <Text style={styles.healthSubtitle}>
          {report.summary.totalViolations} violations found
        </Text>
      </View>

      {/* Budget Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Budget Status</Text>
        {report.budgets.map((budget) => (
          <View key={budget.metric} style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetName}>{budget.metric}</Text>
              <View style={[
                styles.budgetBadge,
                { backgroundColor: budget.status === 'pass' ? '#10B981' : '#EF4444' }
              ]}>
                <Text style={styles.budgetBadgeText}>
                  {budget.status === 'pass' ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>
            <View style={styles.budgetStats}>
              <Text style={styles.budgetStat}>
                Current: {budget.current.toFixed(2)} {budget.unit || 'ms'}
              </Text>
              <Text style={styles.budgetStat}>
                Budget: {budget.budget.toFixed(2)} {budget.unit || 'ms'}
              </Text>
              <Text style={styles.budgetStat}>
                Usage: {budget.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Critical Violations */}
      {report.violations.filter(v => v.severity === 'critical').length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critical Violations</Text>
          {report.violations
            .filter(v => v.severity === 'critical')
            .map((violation, index) => (
              <View key={index} style={styles.violationCard}>
                <Text style={styles.violationMetric}>{violation.metric}</Text>
                <Text style={styles.violationMessage}>{violation.message}</Text>
                <Text style={styles.violationDetails}>
                  Expected: {violation.threshold}ms | Actual: {violation.actual}ms
                </Text>
              </View>
            ))}
        </View>
      )}

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Avg Response Time"
            value={`${report.summary.averageResponseTime.toFixed(0)}ms`}
            target="<500ms"
            status={report.summary.averageResponseTime < 500 ? 'good' : 'bad'}
          />
          <MetricCard
            title="Memory Usage"
            value={`${report.summary.averageMemoryUsage.toFixed(0)}MB`}
            target="<150MB"
            status={report.summary.averageMemoryUsage < 150 ? 'good' : 'bad'}
          />
          <MetricCard
            title="Error Rate"
            value={`${(report.summary.errorRate * 100).toFixed(2)}%`}
            target="<1%"
            status={report.summary.errorRate < 0.01 ? 'good' : 'bad'}
          />
          <MetricCard
            title="API Calls/min"
            value={report.summary.apiCallsPerMinute.toString()}
            target="<1000"
            status={report.summary.apiCallsPerMinute < 1000 ? 'good' : 'bad'}
          />
        </View>
      </View>

      {/* Recommendations */}
      {report.summary.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {report.summary.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationCard}>
              <Text style={styles.recommendationText}>• {rec}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  target: string;
  status: 'good' | 'bad';
}> = ({ title, value, target, status }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[
      styles.metricValue,
      { color: status === 'good' ? '#10B981' : '#EF4444' }
    ]}>
      {value}
    </Text>
    <Text style={styles.metricTarget}>Target: {target}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  healthCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  healthScore: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  healthSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
  },
  budgetCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  budgetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  budgetBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  budgetStats: {
    gap: 4,
  },
  budgetStat: {
    fontSize: 14,
    color: '#6B7280',
  },
  violationCard: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  violationMetric: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  violationMessage: {
    fontSize: 14,
    color: '#B91C1C',
    marginBottom: 4,
  },
  violationDetails: {
    fontSize: 12,
    color: '#DC2626',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTarget: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  recommendationCard: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1E40AF',
  },
});
```

### Success Criteria

- ✅ Performance budgets defined for all critical metrics
- ✅ CI/CD pipeline fails builds that exceed budgets
- ✅ Real-time dashboard accessible in dev builds
- ✅ Baseline metrics documented for comparison
- ✅ All team members trained on budget system

### Validation Steps

1. Run CI/CD pipeline on test PR to verify budget checks
2. Intentionally exceed a budget and confirm pipeline fails
3. Test dashboard with real performance data
4. Document all budget thresholds and rationale
5. Review with team and adjust budgets if needed

---

## Week 5: Advanced Caching Strategies

### Objectives
- Implement multi-layer caching architecture
- Optimize React Query cache configuration
- Add service worker caching for web PWA
- Implement stale-while-revalidate patterns
- Reduce network requests by 40%

### Tasks

#### Task 5.1: React Query Optimization (2 days)

**File:** `apps/mobile/src/config/reactQuery.config.ts`

```typescript
// apps/mobile/src/config/reactQuery.config.ts
import { QueryClient, QueryClientConfig } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache configuration
      gcTime: CACHE_TIME, // Renamed from cacheTime
      staleTime: STALE_TIME,

      // Retry configuration
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: false,

      // Network mode
      networkMode: 'offlineFirst',

      // Performance optimizations
      structuralSharing: true, // Reduce re-renders
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
};

export const queryClient = new QueryClient(queryClientConfig);

// Async storage persister for offline support
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'MINTENANCE_QUERY_CACHE',
  throttleTime: 1000,
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});

// Cache key factories for consistency
export const cacheKeys = {
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...cacheKeys.jobs.all, 'list'] as const,
    list: (filters?: any) => [...cacheKeys.jobs.lists(), filters] as const,
    details: () => [...cacheKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.jobs.details(), id] as const,
  },
  contractors: {
    all: ['contractors'] as const,
    lists: () => [...cacheKeys.contractors.all, 'list'] as const,
    list: (filters?: any) => [...cacheKeys.contractors.lists(), filters] as const,
    details: () => [...cacheKeys.contractors.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.contractors.details(), id] as const,
    nearby: (location: { lat: number; lng: number }, radius: number) =>
      [...cacheKeys.contractors.all, 'nearby', location, radius] as const,
  },
  messages: {
    all: ['messages'] as const,
    threads: () => [...cacheKeys.messages.all, 'threads'] as const,
    thread: (jobId: string) => [...cacheKeys.messages.threads(), jobId] as const,
    unreadCount: () => [...cacheKeys.messages.all, 'unreadCount'] as const,
  },
  payments: {
    all: ['payments'] as const,
    history: () => [...cacheKeys.payments.all, 'history'] as const,
    methods: () => [...cacheKeys.payments.all, 'methods'] as const,
    method: (id: string) => [...cacheKeys.payments.methods(), id] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...cacheKeys.user.all, 'profile'] as const,
    settings: () => [...cacheKeys.user.all, 'settings'] as const,
  },
} as const;
```

**File:** `apps/mobile/src/hooks/useOptimizedQuery.ts`

```typescript
// apps/mobile/src/hooks/useOptimizedQuery.ts
import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';
import { performanceMonitor } from '../utils/performance';

/**
 * Enhanced useQuery hook with performance monitoring and smart caching
 */
export function useOptimizedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) {
  const netInfo = useNetInfo();

  return useQuery({
    queryKey,
    queryFn: async () => {
      const stopTimer = performanceMonitor.startTimer(`query_${queryKey.join('_')}`);

      try {
        const result = await queryFn();
        stopTimer();
        return result;
      } catch (error) {
        stopTimer();
        throw error;
      }
    },
    ...options,

    // Smart network-aware caching
    enabled: options?.enabled !== false && (netInfo.isConnected ?? true),

    // Use cached data while offline
    networkMode: netInfo.isConnected ? 'online' : 'offlineFirst',

    // Optimize stale time based on data type
    staleTime: options?.staleTime ?? getStaleTime(queryKey),
  });
}

function getStaleTime(queryKey: QueryKey): number {
  const key = queryKey[0] as string;

  // Different stale times based on data volatility
  const staleTimeMap: Record<string, number> = {
    user: 1000 * 60 * 60, // 1 hour - user data changes infrequently
    jobs: 1000 * 60 * 5, // 5 minutes - job data moderately volatile
    messages: 1000 * 30, // 30 seconds - messages need to be fresh
    contractors: 1000 * 60 * 15, // 15 minutes - contractor data stable
    payments: 1000 * 60 * 10, // 10 minutes - payment data important but not real-time
  };

  return staleTimeMap[key] ?? 1000 * 60 * 5; // Default 5 minutes
}
```

#### Task 5.2: Service Worker Caching for Web (2 days)

**File:** `apps/web/public/sw.js`

```javascript
// apps/web/public/sw.js
const CACHE_VERSION = 'v1.2.3';
const STATIC_CACHE = `mintenance-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mintenance-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `mintenance-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app.css',
];

const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mintenance-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - smart caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase real-time requests
  if (url.hostname.includes('supabase')) {
    return;
  }

  // Route to appropriate cache strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isAPIRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/offline');
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match('/offline');
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js');
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url.pathname);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}
```

**File:** `apps/web/app/layout.tsx` (Update to register service worker)

```typescript
// apps/web/app/layout.tsx - Add this to the existing file

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}

// Add to root layout component
```

#### Task 5.3: Image Caching & Lazy Loading (1 day)

**File:** `apps/mobile/src/components/OptimizedImage.tsx`

```typescript
// apps/mobile/src/components/OptimizedImage.tsx
import React, { useState } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  priority?: 'high' | 'normal' | 'low';
  cacheKey?: string;
  placeholder?: React.ReactNode;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  priority = 'normal',
  cacheKey,
  placeholder,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);

  // Generate cache key from URI if not provided
  const imageCacheKey = cacheKey ||
    (typeof source === 'object' && 'uri' in source ? `image_${source.uri}` : undefined);

  // Use React Query to manage image caching
  const { data: cachedImageUri } = useQuery({
    queryKey: ['image', imageCacheKey],
    queryFn: async () => {
      if (typeof source === 'number') {
        return source; // Local images don't need caching
      }

      // Check AsyncStorage cache first
      const cached = await AsyncStorage.getItem(imageCacheKey!);
      if (cached) {
        return cached;
      }

      // Cache the remote URI
      await AsyncStorage.setItem(imageCacheKey!, source.uri);
      return source.uri;
    },
    enabled: !!imageCacheKey,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days for images
  });

  const imageSource = typeof source === 'number' ? source : { uri: cachedImageUri };

  return (
    <View>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          {placeholder || <ActivityIndicator />}
        </View>
      )}
      <Image
        {...props}
        source={imageSource}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});
```

#### Task 5.4: API Response Caching Layer (1 day)

**File:** `apps/mobile/src/services/CacheService.ts`

```typescript
// apps/mobile/src/services/CacheService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor } from '../utils/performance';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get cached data with multi-layer fallback
   */
  async get<T>(key: string): Promise<T | null> {
    const stopTimer = performanceMonitor.startTimer('cache_get');

    try {
      // Layer 1: Memory cache (fastest)
      const memCached = this.memoryCache.get(key);
      if (memCached && memCached.expiresAt > Date.now()) {
        performanceMonitor.recordMetric('cache_hit', 1, 'cache', { layer: 'memory' });
        stopTimer();
        return memCached.data as T;
      }

      // Layer 2: AsyncStorage (persistent)
      const diskCached = await AsyncStorage.getItem(key);
      if (diskCached) {
        const parsed: CacheEntry<T> = JSON.parse(diskCached);

        if (parsed.expiresAt > Date.now()) {
          // Promote to memory cache
          this.memoryCache.set(key, parsed);
          performanceMonitor.recordMetric('cache_hit', 1, 'cache', { layer: 'disk' });
          stopTimer();
          return parsed.data;
        } else {
          // Expired, clean up
          await this.delete(key);
        }
      }

      performanceMonitor.recordMetric('cache_miss', 1, 'cache');
      stopTimer();
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      stopTimer();
      return null;
    }
  }

  /**
   * Set cached data in both layers
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Layer 1: Memory
    this.memoryCache.set(key, entry);

    // Layer 2: Disk (async, don't await)
    AsyncStorage.setItem(key, JSON.stringify(entry)).catch(console.error);
  }

  /**
   * Delete cached data from all layers
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await AsyncStorage.removeItem(key);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    // Clear only cache keys (preserve other AsyncStorage data)
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const cacheService = CacheService.getInstance();
```

### Success Criteria

- ✅ 40% reduction in network requests
- ✅ Offline functionality for core features
- ✅ <100ms cache retrieval time (p95)
- ✅ Service worker active on 100% of web users
- ✅ Image load time reduced by 50%

### Validation Steps

1. Monitor network request count before/after
2. Test offline mode with airplane mode enabled
3. Measure cache hit rates
4. Verify service worker in production
5. Performance test image-heavy screens

---

## Week 6: Database Optimization

### Objectives
- Analyze and optimize slow database queries
- Add strategic indexes for common queries
- Implement database connection pooling
- Optimize Row Level Security policies
- Create materialized views for complex queries
- Reduce database query time by 50%

### Tasks

#### Task 6.1: Query Analysis & Indexing (3 days)

**File:** `supabase/migrations/20250201000000_performance_indexes.sql`

```sql
-- supabase/migrations/20250201000000_performance_indexes.sql
-- Performance Optimization Indexes for Mintenance Platform

-- ============================================================================
-- JOBS TABLE INDEXES
-- ============================================================================

-- Index for job search by status and homeowner
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status
ON jobs(homeowner_id, status)
WHERE status IN ('posted', 'in_progress');

-- Index for contractor job assignments
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_status
ON jobs(contractor_id, status)
WHERE contractor_id IS NOT NULL;

-- Index for job search by location (for nearby jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_location
ON jobs USING GIST(location);

-- Index for job search by created date (recent jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_desc
ON jobs(created_at DESC);

-- Composite index for job filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status_budget_created
ON jobs(status, budget, created_at DESC)
WHERE status = 'posted';

-- ============================================================================
-- BIDS TABLE INDEXES
-- ============================================================================

-- Index for contractor's bids
CREATE INDEX IF NOT EXISTS idx_bids_contractor_status
ON bids(contractor_id, status, created_at DESC);

-- Index for job bids
CREATE INDEX IF NOT EXISTS idx_bids_job_status
ON bids(job_id, status)
WHERE status IN ('pending', 'accepted');

-- Index for bid amount sorting
CREATE INDEX IF NOT EXISTS idx_bids_job_amount
ON bids(job_id, amount ASC)
WHERE status = 'pending';

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Index for message threads by job
CREATE INDEX IF NOT EXISTS idx_messages_job_created
ON messages(job_id, created_at DESC);

-- Index for user's sent messages
CREATE INDEX IF NOT EXISTS idx_messages_sender
ON messages(sender_id, created_at DESC);

-- Index for user's received messages
CREATE INDEX IF NOT EXISTS idx_messages_receiver
ON messages(receiver_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages(receiver_id, read_at)
WHERE read_at IS NULL;

-- ============================================================================
-- CONTRACTOR PROFILES INDEXES
-- ============================================================================

-- Index for contractor search by skills
CREATE INDEX IF NOT EXISTS idx_contractor_skills_gin
ON contractor_profiles USING GIN(skills);

-- Index for contractor availability
CREATE INDEX IF NOT EXISTS idx_contractor_availability
ON contractor_profiles(availability)
WHERE availability = true;

-- Index for contractor hourly rate range search
CREATE INDEX IF NOT EXISTS idx_contractor_hourly_rate
ON contractor_profiles(hourly_rate);

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================

-- Index for contractor reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_rating
ON reviews(reviewed_id, rating, created_at DESC);

-- Index for reviewer's given reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer
ON reviews(reviewer_id, created_at DESC);

-- Index for job reviews
CREATE INDEX IF NOT EXISTS idx_reviews_job
ON reviews(job_id);

-- ============================================================================
-- PAYMENTS/ESCROW INDEXES
-- ============================================================================

-- Index for escrow transactions by job
CREATE INDEX IF NOT EXISTS idx_escrow_job_status
ON escrow_transactions(job_id, status);

-- Index for pending payments
CREATE INDEX IF NOT EXISTS idx_escrow_status_created
ON escrow_transactions(status, created_at)
WHERE status IN ('pending', 'held');

-- Index for Stripe payment intent lookups
CREATE INDEX IF NOT EXISTS idx_escrow_stripe_intent
ON escrow_transactions(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- SOCIAL FEATURES INDEXES
-- ============================================================================

-- Index for contractor posts feed
CREATE INDEX IF NOT EXISTS idx_contractor_posts_created
ON contractor_posts(contractor_id, created_at DESC);

-- Index for post likes
CREATE INDEX IF NOT EXISTS idx_contractor_posts_likes
ON contractor_posts(likes DESC)
WHERE likes > 0;

-- Index for contractor follows
CREATE INDEX IF NOT EXISTS idx_contractor_follows_follower
ON contractor_follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_follows_following
ON contractor_follows(following_id, created_at DESC);

-- Index for contractor endorsements
CREATE INDEX IF NOT EXISTS idx_contractor_endorsements
ON contractor_endorsements(contractor_id, skill_name);

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, read_at, created_at DESC)
WHERE read_at IS NULL;

-- Index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
ON notifications(user_id, type, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

ANALYZE jobs;
ANALYZE bids;
ANALYZE messages;
ANALYZE contractor_profiles;
ANALYZE reviews;
ANALYZE escrow_transactions;
ANALYZE contractor_posts;
ANALYZE contractor_follows;
ANALYZE notifications;
```

**File:** `supabase/migrations/20250201000001_materialized_views.sql`

```sql
-- supabase/migrations/20250201000001_materialized_views.sql
-- Materialized Views for Complex Aggregations

-- ============================================================================
-- CONTRACTOR STATISTICS VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS contractor_statistics AS
SELECT
  cp.user_id AS contractor_id,
  COUNT(DISTINCT j.id) AS total_jobs,
  COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) AS completed_jobs,
  AVG(CASE WHEN j.status = 'completed' THEN r.rating END) AS average_rating,
  COUNT(DISTINCT r.id) AS total_reviews,
  SUM(CASE WHEN j.status = 'completed' THEN et.amount ELSE 0 END) AS total_earnings,
  COUNT(DISTINCT cf.follower_id) AS follower_count,
  COUNT(DISTINCT ce.id) AS endorsement_count,
  MAX(j.updated_at) AS last_job_date
FROM contractor_profiles cp
LEFT JOIN jobs j ON j.contractor_id = cp.user_id
LEFT JOIN reviews r ON r.reviewed_id = cp.user_id
LEFT JOIN escrow_transactions et ON et.job_id = j.id AND et.status = 'released'
LEFT JOIN contractor_follows cf ON cf.following_id = cp.user_id
LEFT JOIN contractor_endorsements ce ON ce.contractor_id = cp.user_id
GROUP BY cp.user_id;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_stats_contractor
ON contractor_statistics(contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_stats_rating
ON contractor_statistics(average_rating DESC NULLS LAST);

-- ============================================================================
-- JOB STATISTICS VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS job_statistics AS
SELECT
  j.id AS job_id,
  j.homeowner_id,
  j.contractor_id,
  j.status,
  COUNT(DISTINCT b.id) AS bid_count,
  AVG(b.amount) AS average_bid,
  MIN(b.amount) AS lowest_bid,
  MAX(b.amount) AS highest_bid,
  COUNT(DISTINCT m.id) AS message_count,
  EXTRACT(EPOCH FROM (COALESCE(j.completed_at, NOW()) - j.created_at)) / 86400 AS duration_days
FROM jobs j
LEFT JOIN bids b ON b.job_id = j.id
LEFT JOIN messages m ON m.job_id = j.id
GROUP BY j.id, j.homeowner_id, j.contractor_id, j.status, j.created_at, j.completed_at;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_stats_job
ON job_statistics(job_id);

CREATE INDEX IF NOT EXISTS idx_job_stats_homeowner
ON job_statistics(homeowner_id);

-- ============================================================================
-- REFRESH POLICIES
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_statistics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY contractor_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY job_statistics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 15 minutes (requires pg_cron extension)
-- SELECT cron.schedule('refresh-stats', '*/15 * * * *', 'SELECT refresh_statistics_views()');

-- Manual refresh can be triggered via API
```

#### Task 6.2: RLS Policy Optimization (1 day)

**File:** `supabase/migrations/20250201000002_optimize_rls_policies.sql`

```sql
-- supabase/migrations/20250201000002_optimize_rls_policies.sql
-- Optimize Row Level Security Policies for Performance

-- ============================================================================
-- OPTIMIZE JOBS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own jobs as homeowner" ON jobs;
DROP POLICY IF EXISTS "Users can view own jobs as contractor" ON jobs;
DROP POLICY IF EXISTS "Users can view posted jobs" ON jobs;

-- Recreate optimized policies
-- Single policy for viewing jobs (reduces policy evaluation overhead)
CREATE POLICY "Users can view accessible jobs" ON jobs
  FOR SELECT
  USING (
    status = 'posted' OR
    homeowner_id = auth.uid() OR
    contractor_id = auth.uid()
  );

-- Optimize insert policy
CREATE POLICY "Homeowners can create jobs" ON jobs
  FOR INSERT
  WITH CHECK (
    homeowner_id = auth.uid() AND
    status = 'posted'
  );

-- Optimize update policy (only job owner or assigned contractor)
CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE
  USING (
    homeowner_id = auth.uid() OR
    contractor_id = auth.uid()
  )
  WITH CHECK (
    homeowner_id = auth.uid() OR
    contractor_id = auth.uid()
  );

-- ============================================================================
-- OPTIMIZE MESSAGES RLS POLICIES
-- ============================================================================

-- Drop existing
DROP POLICY IF EXISTS "Users can view own messages" ON messages;

-- Recreate optimized (single combined policy)
CREATE POLICY "Users can access own messages" ON messages
  FOR ALL
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- ============================================================================
-- OPTIMIZE BIDS RLS POLICIES
-- ============================================================================

-- Drop existing
DROP POLICY IF EXISTS "Contractors can create bids" ON bids;
DROP POLICY IF EXISTS "Users can view job bids" ON bids;

-- Single optimized policy for viewing bids
CREATE POLICY "Users can view relevant bids" ON bids
  FOR SELECT
  USING (
    contractor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = bids.job_id
      AND jobs.homeowner_id = auth.uid()
    )
  );

-- Optimized insert policy
CREATE POLICY "Contractors can create bids" ON bids
  FOR INSERT
  WITH CHECK (
    contractor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_id
      AND jobs.status = 'posted'
    )
  );
```

#### Task 6.3: Connection Pooling (1 day)

**File:** `apps/web/lib/db/connectionPool.ts`

```typescript
// apps/web/lib/db/connectionPool.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
}

export class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool;
  private clients: SupabaseClient[] = [];
  private availableClients: SupabaseClient[] = [];
  private config: PoolConfig;

  private constructor(config: PoolConfig) {
    this.config = config;
    this.initializePool();
  }

  static getInstance(config?: PoolConfig): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance = new SupabaseConnectionPool(
        config || {
          minConnections: 5,
          maxConnections: 20,
          idleTimeout: 30000,
        }
      );
    }
    return SupabaseConnectionPool.instance;
  }

  private initializePool(): void {
    // Create minimum number of connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = this.createClient();
      this.clients.push(client);
      this.availableClients.push(client);
    }
  }

  private createClient(): SupabaseClient {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for server-side
      {
        auth: {
          persistSession: false, // Server-side doesn't need session persistence
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-connection-pool': 'true',
          },
        },
      }
    );
  }

  async acquire(): Promise<SupabaseClient> {
    // If available client exists, use it
    if (this.availableClients.length > 0) {
      return this.availableClients.pop()!;
    }

    // If we haven't reached max connections, create new one
    if (this.clients.length < this.config.maxConnections) {
      const client = this.createClient();
      this.clients.push(client);
      return client;
    }

    // Wait for a client to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearInterval(checkInterval);
          resolve(this.availableClients.pop()!);
        }
      }, 100);
    });
  }

  release(client: SupabaseClient): void {
    if (!this.availableClients.includes(client)) {
      this.availableClients.push(client);
    }
  }

  async withConnection<T>(
    callback: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const client = await this.acquire();
    try {
      return await callback(client);
    } finally {
      this.release(client);
    }
  }

  getStats() {
    return {
      totalConnections: this.clients.length,
      availableConnections: this.availableClients.length,
      activeConnections: this.clients.length - this.availableClients.length,
    };
  }
}

export const dbPool = SupabaseConnectionPool.getInstance();
```

### Success Criteria

- ✅ Database query p95 latency <200ms
- ✅ 50% reduction in slow queries (>500ms)
- ✅ All frequently accessed tables have appropriate indexes
- ✅ RLS policy evaluation time <50ms
- ✅ Materialized views updated every 15 minutes

### Validation Steps

1. Run EXPLAIN ANALYZE on critical queries
2. Monitor query performance with pg_stat_statements
3. Load test with 1000 concurrent users
4. Verify index usage with pg_stat_user_indexes
5. Benchmark before/after performance

---

## Week 7: Bundle Size Optimization

### Objectives
- Reduce mobile bundle size by 30% (from 20MB to <15MB)
- Reduce web initial bundle by 40% (from 800KB to <500KB)
- Implement code splitting and lazy loading
- Optimize Hermes engine configuration
- Tree shake unused dependencies

### Tasks

#### Task 7.1: React Native Code Splitting (2 days)

**File:** `apps/mobile/metro.config.js`

```javascript
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable Hermes
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: process.env.NODE_ENV === 'production',
      reduce_funcs: true,
      reduce_vars: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
    mangle: {
      keep_fnames: false,
    },
    output: {
      comments: false,
    },
  },
};

// Bundle splitting configuration
config.serializer = {
  ...config.serializer,

  // Create separate bundles for different parts of the app
  createModuleIdFactory: () => {
    const projectRootPath = path.resolve(__dirname);
    return (modulePath) => {
      // Generate deterministic IDs based on path
      const relative = path.relative(projectRootPath, modulePath);
      return relative;
    };
  },

  // Optimize bundle output
  processModuleFilter: (module) => {
    // Exclude test files from production bundles
    if (module.path.includes('__tests__') || module.path.includes('__mocks__')) {
      return false;
    }
    return true;
  },
};

// Resolve configuration for monorepo
config.watchFolders = [
  path.resolve(__dirname, '../../packages'),
  path.resolve(__dirname, '../../node_modules'),
];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
  ],
};

module.exports = config;
```

**File:** `apps/mobile/src/navigation/LazyScreens.tsx`

```typescript
// apps/mobile/src/navigation/LazyScreens.tsx
import React, { lazy, Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Loading fallback component
const LoadingScreen = () => (
  <View style={styles.loading}>
    <ActivityIndicator size="large" color="#0EA5E9" />
  </View>
);

// Utility to create lazy-loaded screens with loading state
export function createLazyScreen<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.FC {
  const LazyComponent = lazy(importFn);

  return (props: any) => (
    <Suspense fallback={<LoadingScreen />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// ============================================================================
// LAZY-LOADED SCREENS
// ============================================================================

// Core screens (always loaded)
export { HomeScreen } from '../screens/HomeScreen';
export { JobListScreen } from '../screens/JobListScreen';

// Secondary screens (lazy loaded)
export const ContractorDiscoveryScreen = createLazyScreen(
  () => import('../screens/ContractorDiscoveryScreen')
);

export const PaymentScreen = createLazyScreen(
  () => import('../screens/PaymentScreen')
);

export const MessagingScreen = createLazyScreen(
  () => import('../screens/MessagingScreen')
);

export const VideoCallScreen = createLazyScreen(
  () => import('../screens/VideoCallScreen')
);

export const AISearchScreen = createLazyScreen(
  () => import('../screens/AISearchScreen')
);

// Settings screens (rarely used, always lazy)
export const SettingsScreen = createLazyScreen(
  () => import('../screens/SettingsScreen')
);

export const NotificationPreferencesScreen = createLazyScreen(
  () => import('../screens/NotificationPreferencesScreen')
);

// Profile screens
export const ContractorProfileScreen = createLazyScreen(
  () => import('../screens/contractor-profile/ContractorProfileScreen')
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
```

#### Task 7.2: Web Bundle Optimization (2 days)

**File:** `apps/web/next.config.js` (Enhanced)

```javascript
// apps/web/next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing config...

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Replace React with Preact in production (smaller bundle)
      Object.assign(config.resolve.alias, {
        'react/jsx-runtime.js': 'preact/compat/jsx-runtime',
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
      });

      // Tree shaking optimization
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
      };

      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,

          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },

          // Separate chunk for React/Next.js framework
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            reuseExistingChunk: true,
          },

          // Separate chunk for UI library
          ui: {
            name: 'ui',
            test: /[\\/]components[\\/]ui[\\/]/,
            priority: 30,
            reuseExistingChunk: true,
          },

          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // Experimental features for optimization
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'react-icons'],
  },

  // Compression
  compress: true,

  // Static optimization
  swcMinify: true,

  // Remove source maps in production
  productionBrowserSourceMaps: false,
};

module.exports = withBundleAnalyzer(nextConfig);
```

**File:** `apps/web/app/components/DynamicComponents.tsx`

```typescript
// apps/web/app/components/DynamicComponents.tsx
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// ============================================================================
// DYNAMICALLY IMPORTED COMPONENTS
// ============================================================================

// Heavy components that should be loaded on demand
export const PaymentForm = dynamic(
  () => import('./PaymentForm').then(mod => mod.PaymentForm),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Client-side only
  }
);

export const MapView = dynamic(
  () => import('./MapView').then(mod => mod.MapView),
  {
    loading: () => <div className="h-96 bg-gray-100 animate-pulse" />,
    ssr: false,
  }
);

export const VideoPlayer = dynamic(
  () => import('./VideoPlayer').then(mod => mod.VideoPlayer),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const ChartComponent = dynamic(
  () => import('./ChartComponent').then(mod => mod.ChartComponent),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Admin-only components (only load for admin users)
export const AdminDashboard = dynamic(
  () => import('./admin/AdminDashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);
```

#### Task 7.3: Dependency Audit & Tree Shaking (1 day)

**File:** `scripts/analyzeDependencies.js`

```javascript
// scripts/analyzeDependencies.js
const fs = require('fs');
const path = require('path');

// Analyze package.json for optimization opportunities
function analyzeDependencies() {
  const mobilePackagePath = path.join(__dirname, '../apps/mobile/package.json');
  const webPackagePath = path.join(__dirname, '../apps/web/package.json');

  const mobilePackage = JSON.parse(fs.readFileSync(mobilePackagePath, 'utf8'));
  const webPackage = JSON.parse(fs.readFileSync(webPackagePath, 'utf8'));

  const report = {
    mobile: analyzePackage(mobilePackage, 'mobile'),
    web: analyzePackage(webPackage, 'web'),
    recommendations: [],
  };

  // Generate recommendations
  report.recommendations.push(...generateRecommendations(report));

  console.log(JSON.stringify(report, null, 2));
}

function analyzePackage(pkg, platform) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const large Packages = [
    'moment', // Use date-fns instead
    'lodash', // Use lodash-es or individual imports
    '@supabase/supabase-js', // Check if we can reduce usage
  ];

  const analysis = {
    totalDependencies: Object.keys(deps).length,
    largePackages: [],
    duplicates: [],
  };

  // Check for large packages
  Object.keys(deps).forEach(dep => {
    if (largePackages.includes(dep)) {
      analysis.largePackages.push({
        name: dep,
        version: deps[dep],
      });
    }
  });

  return analysis;
}

function generateRecommendations(report) {
  const recommendations = [];

  // Check for moment.js
  if (report.mobile.largePackages.some(p => p.name === 'moment')) {
    recommendations.push({
      severity: 'high',
      package: 'moment',
      suggestion: 'Replace moment.js with date-fns (saves ~50KB)',
    });
  }

  // Check for full lodash
  if (report.mobile.largePackages.some(p => p.name === 'lodash')) {
    recommendations.push({
      severity: 'medium',
      package: 'lodash',
      suggestion: 'Use lodash-es or individual imports (saves ~20KB)',
    });
  }

  return recommendations;
}

analyzeDependencies();
```

### Success Criteria

- ✅ Mobile bundle size <15MB (30% reduction)
- ✅ Web initial bundle <500KB (40% reduction)
- ✅ Lazy loading for all non-critical screens
- ✅ Tree shaking eliminates >100KB of unused code
- ✅ Build time <5 minutes for production

### Validation Steps

1. Run bundle analyzer on mobile and web
2. Measure bundle size with production builds
3. Test lazy loading with slow network throttling
4. Verify code splitting with DevTools
5. Compare before/after load times

---

## Week 8: Network & Final Optimizations

### Objectives
- Implement request batching and debouncing
- Add GraphQL for efficient data fetching (optional)
- Configure CDN for static assets
- Implement prefetching strategies
- Final performance audit and optimization
- Achieve <500ms API response time p95

### Tasks

#### Task 8.1: Request Batching & Debouncing (2 days)

**File:** `apps/mobile/src/services/BatchingService.ts`

```typescript
// apps/mobile/src/services/BatchingService.ts
import { performanceMonitor } from '../utils/performance';

interface BatchRequest {
  id: string;
  endpoint: string;
  params: any;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

export class BatchingService {
  private static instance: BatchingService;
  private requestQueue: Map<string, BatchRequest[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly MAX_BATCH_SIZE = 10;

  static getInstance(): BatchingService {
    if (!BatchingService.instance) {
      BatchingService.instance = new BatchingService();
    }
    return BatchingService.instance;
  }

  /**
   * Add request to batch queue
   */
  async batchRequest<T>(endpoint: string, params: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: `${endpoint}_${Date.now()}_${Math.random()}`,
        endpoint,
        params,
        resolve,
        reject,
      };

      // Add to queue
      if (!this.requestQueue.has(endpoint)) {
        this.requestQueue.set(endpoint, []);
      }
      this.requestQueue.get(endpoint)!.push(request);

      // Schedule batch execution
      this.scheduleBatch(endpoint);
    });
  }

  private scheduleBatch(endpoint: string): void {
    const queue = this.requestQueue.get(endpoint)!;

    // Execute immediately if batch is full
    if (queue.length >= this.MAX_BATCH_SIZE) {
      this.executeBatch(endpoint);
      return;
    }

    // Otherwise schedule delayed execution
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.executeBatch(endpoint);
    }, this.BATCH_DELAY);
  }

  private async executeBatch(endpoint: string): Promise<void> {
    const queue = this.requestQueue.get(endpoint);
    if (!queue || queue.length === 0) return;

    // Clear queue
    this.requestQueue.set(endpoint, []);

    const stopTimer = performanceMonitor.startTimer('batch_request');

    try {
      // Execute batched request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: queue.map(req => req.params),
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }

      const results = await response.json();

      // Resolve individual promises
      queue.forEach((request, index) => {
        if (results[index].error) {
          request.reject(new Error(results[index].error));
        } else {
          request.resolve(results[index].data);
        }
      });

      performanceMonitor.recordMetric(
        'batch_size',
        queue.length,
        'network',
        { endpoint }
      );

      stopTimer();
    } catch (error) {
      // Reject all promises in batch
      queue.forEach(request => request.reject(error));
      stopTimer();
    }
  }
}

export const batchingService = BatchingService.getInstance();
```

**File:** `apps/mobile/src/utils/debounce.ts`

```typescript
// apps/mobile/src/utils/debounce.ts
import { useEffect, useRef, useCallback } from 'react';

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * React hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    debounce((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }, delay),
    [delay]
  );
}
```

#### Task 8.2: CDN Configuration (1 day)

**File:** `apps/web/next.config.js` (CDN Addition)

```javascript
// apps/web/next.config.js - Add CDN configuration
const nextConfig = {
  // ... existing config

  // CDN configuration for static assets
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.mintenance.app'
    : '',

  images: {
    // ... existing image config

    // Use CDN for image optimization
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
  },
};
```

**File:** `apps/web/lib/imageLoader.ts`

```typescript
// apps/web/lib/imageLoader.ts
export default function mintainanceImageLoader({ src, width, quality }: {
  src: string;
  width: number;
  quality?: number;
}) {
  const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || '';

  // If it's already a full URL, return as is
  if (src.startsWith('http')) {
    return src;
  }

  // Build CDN URL with optimization parameters
  const params = new URLSearchParams({
    w: width.toString(),
    q: (quality || 75).toString(),
  });

  return `${CDN_URL}/${src}?${params.toString()}`;
}
```

**File:** `vercel.json` (Vercel CDN Configuration)

```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=2592000, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.mintenance.app/:path*"
    }
  ]
}
```

#### Task 8.3: Prefetching Strategies (2 days)

**File:** `apps/mobile/src/hooks/usePrefetch.ts`

```typescript
// apps/mobile/src/hooks/usePrefetch.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '../config/reactQuery.config';
import { JobService } from '../services/JobService';
import { ContractorService } from '../services/ContractorService';

/**
 * Prefetch data for likely next screens
 */
export function usePrefetchData(userRole: 'homeowner' | 'contractor') {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch based on user role
    if (userRole === 'homeowner') {
      prefetchHomeownerData();
    } else {
      prefetchContractorData();
    }
  }, [userRole]);

  const prefetchHomeownerData = async () => {
    // Prefetch posted jobs (likely to view)
    queryClient.prefetchQuery({
      queryKey: cacheKeys.jobs.list({ status: 'posted' }),
      queryFn: () => JobService.getJobs({ status: 'posted' }),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Prefetch nearby contractors
    queryClient.prefetchQuery({
      queryKey: cacheKeys.contractors.lists(),
      queryFn: () => ContractorService.getNearbyContractors(),
      staleTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  const prefetchContractorData = async () => {
    // Prefetch available jobs
    queryClient.prefetchQuery({
      queryKey: cacheKeys.jobs.list({ status: 'posted' }),
      queryFn: () => JobService.getAvailableJobs(),
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch contractor stats
    queryClient.prefetchQuery({
      queryKey: ['contractor-stats'],
      queryFn: () => ContractorService.getMyStats(),
      staleTime: 1000 * 60 * 30, // 30 minutes
    });
  };
}

/**
 * Prefetch on hover (web only)
 */
export function usePrefetchOnHover() {
  const queryClient = useQueryClient();

  return {
    onJobHover: (jobId: string) => {
      queryClient.prefetchQuery({
        queryKey: cacheKeys.jobs.detail(jobId),
        queryFn: () => JobService.getJobById(jobId),
      });
    },

    onContractorHover: (contractorId: string) => {
      queryClient.prefetchQuery({
        queryKey: cacheKeys.contractors.detail(contractorId),
        queryFn: () => ContractorService.getContractorById(contractorId),
      });
    },
  };
}
```

#### Task 8.4: Final Performance Audit (1 day)

**File:** `scripts/performanceAudit.js`

```javascript
// scripts/performanceAudit.js
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runPerformanceAudit() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    port: chrome.port,
  };

  const urls = [
    'http://localhost:3000', // Home
    'http://localhost:3000/jobs', // Jobs listing
    'http://localhost:3000/search', // Search
    'http://localhost:3000/dashboard', // Dashboard
  ];

  const reports = [];

  for (const url of urls) {
    console.log(`Auditing ${url}...`);
    const runnerResult = await lighthouse(url, options);

    const report = {
      url,
      scores: {
        performance: runnerResult.lhr.categories.performance.score * 100,
        accessibility: runnerResult.lhr.categories.accessibility.score * 100,
        bestPractices: runnerResult.lhr.categories['best-practices'].score * 100,
      },
      metrics: {
        fcp: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
        lcp: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
        tti: runnerResult.lhr.audits['interactive'].numericValue,
        tbt: runnerResult.lhr.audits['total-blocking-time'].numericValue,
        cls: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
      },
    };

    reports.push(report);

    // Save full report
    const reportHtml = runnerResult.report;
    fs.writeFileSync(
      `performance-report-${url.split('/').pop() || 'home'}.html`,
      reportHtml
    );
  }

  await chrome.kill();

  // Generate summary
  console.log('\n=== Performance Audit Summary ===\n');
  reports.forEach(report => {
    console.log(`${report.url}:`);
    console.log(`  Performance: ${report.scores.performance.toFixed(0)}`);
    console.log(`  FCP: ${report.metrics.fcp.toFixed(0)}ms`);
    console.log(`  LCP: ${report.metrics.lcp.toFixed(0)}ms`);
    console.log(`  TTI: ${report.metrics.tti.toFixed(0)}ms`);
    console.log('');
  });

  // Save JSON summary
  fs.writeFileSync(
    'performance-audit-summary.json',
    JSON.stringify(reports, null, 2)
  );
}

runPerformanceAudit().catch(console.error);
```

### Success Criteria

- ✅ API response time p95 <500ms
- ✅ 40% reduction in network requests
- ✅ CDN serving >90% of static assets
- ✅ Lighthouse performance score >90
- ✅ All Core Web Vitals in "Good" range

### Validation Steps

1. Run Lighthouse audit on all critical pages
2. Monitor CDN hit rates
3. Measure network request reduction
4. Load test with production traffic simulation
5. Verify prefetching with Network tab

---

## Performance Metrics Dashboard

**File:** `PERFORMANCE_METRICS_TRACKING.md`

```markdown
# Performance Metrics Tracking

## Week 4: Baselines

| Metric | Baseline | Target | Week 4 | Week 5 | Week 6 | Week 7 | Week 8 |
|--------|----------|--------|--------|--------|--------|--------|--------|
| Mobile Startup Time | 3000ms | <2000ms | - | - | - | - | - |
| Web Initial Load | 2500ms | <1500ms | - | - | - | - | - |
| API Response p95 | 800ms | <500ms | - | - | - | - | - |
| DB Query p95 | 400ms | <200ms | - | - | - | - | - |
| Mobile Bundle Size | 20MB | <15MB | - | - | - | - | - |
| Web Initial Bundle | 800KB | <500KB | - | - | - | - | - |
| Cache Hit Rate | 0% | >60% | - | - | - | - | - |
| Network Requests | 50/page | <30/page | - | - | - | - | - |

## Weekly Update Process

1. Run performance audit script
2. Update metrics table
3. Identify regressions
4. Document improvements
5. Adjust targets if needed
```

---

## Rollback Strategy

### Immediate Rollback Triggers
- Performance degradation >20%
- Error rate increase >5%
- Critical functionality broken
- Test coverage drops below 70%

### Rollback Procedures

1. **Week 4 (Budgets)**: Disable budget enforcement in CI/CD
2. **Week 5 (Caching)**: Clear caches, disable service worker
3. **Week 6 (Database)**: Revert migration, restore old indexes
4. **Week 7 (Bundle)**: Revert to non-split bundles
5. **Week 8 (Network)**: Disable batching, remove prefetching

### Recovery Steps
```bash
# Revert database migration
supabase db reset

# Rebuild without optimizations
SKIP_OPTIMIZATIONS=true npm run build

# Clear all caches
npm run cache:clear

# Redeploy previous version
git revert HEAD
npm run deploy
```

---

## Success Criteria Summary

### Overall Goals
- ✅ Architecture grade: A+ (95/100)
- ✅ Mobile startup: <2s
- ✅ Web load time: <1.5s
- ✅ API response p95: <500ms
- ✅ DB query p95: <200ms
- ✅ Bundle reduction: 30%
- ✅ Network optimization: 40% fewer requests
- ✅ Test coverage: >80% maintained

### Weekly Milestones
- **Week 4**: Performance budgets enforced in CI/CD
- **Week 5**: 60% cache hit rate achieved
- **Week 6**: 50% database query time reduction
- **Week 7**: 30% bundle size reduction
- **Week 8**: All optimizations integrated and validated

---

## Conclusion

This comprehensive plan provides a structured approach to achieving significant performance improvements across the Mintenance platform. Each week builds upon the previous, creating a robust, production-ready optimization strategy that maintains code quality and test coverage while delivering measurable performance gains.

**Next Steps:**
1. Review plan with team
2. Allocate resources for each week
3. Set up monitoring infrastructure
4. Begin Week 4 implementation
5. Track metrics weekly
