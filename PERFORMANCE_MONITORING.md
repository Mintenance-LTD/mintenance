# 📊 Performance Monitoring & Budgets

## Overview

The Mintenance app includes comprehensive performance monitoring and budget enforcement to ensure optimal user experience and prevent performance regressions.

## Performance Budgets

### Current Budgets

| Metric | Warning | Error | Unit |
|--------|---------|-------|------|
| **Total Bundle Size** | 2MB | 5MB | bytes |
| **Main Bundle** | 1.5MB | 2MB | bytes |
| **Vendor Bundle** | 800KB | 1MB | bytes |
| **Individual Asset** | 300KB | 500KB | bytes |
| **Memory Usage** | 150MB | 300MB | bytes |
| **Startup Time** | 3s | 5s | ms |
| **Navigation Time** | 500ms | 1s | ms |
| **API Response** | 2s | 5s | ms |
| **FPS** | 55fps | 50fps | fps |

### Budget Configuration

Budgets are defined in `performance-budget.json` and can be adjusted based on:
- Target device specifications
- Network conditions
- User experience requirements
- Business priorities

## Automated Monitoring

### 🚀 Startup Monitoring
```typescript
import { useStartupTime } from './src/hooks/usePerformance';

function App() {
  useStartupTime(); // Automatically tracks app initialization time
  return <AppContent />;
}
```

### 🔄 Real-time Performance Tracking
```typescript
import { useFPSMonitoring, useMemoryMonitoring } from './src/hooks/usePerformance';

function MyComponent() {
  useFPSMonitoring(__DEV__); // FPS monitoring in development
  useMemoryMonitoring(60000); // Memory check every minute
  // Component content
}
```

### 🌐 Navigation Performance
```typescript
import { usePerformance } from './src/hooks/usePerformance';

function MyScreen() {
  const { trackNavigation } = usePerformance();
  
  useEffect(() => {
    trackNavigation('HomeScreen');
  }, []);
}
```

### 📡 API Performance Tracking
```typescript
import { usePerformance } from './src/hooks/usePerformance';

function useApiCall() {
  const { trackApiCall } = usePerformance();
  
  const fetchData = async () => {
    const stopTracking = trackApiCall('req-123', '/api/jobs');
    try {
      const response = await fetch('/api/jobs');
      return response.json();
    } finally {
      stopTracking();
    }
  };
}
```

## Bundle Analysis

### Quick Analysis
```bash
npm run performance:check
```

This command will:
1. Create an optimized bundle export
2. Analyze bundle size and composition
3. Check against performance budgets
4. Generate a detailed report

### Manual Bundle Export
```bash
npm run bundle:export
```

### Analyze Existing Bundle
```bash
npm run bundle:analyze
```

### View Latest Report
```bash
npm run performance:report
```

## Performance Reports

### Bundle Analysis Report
Generated as `bundle-analysis-report.json` with:
- Total bundle size and budget usage
- Largest assets breakdown
- Performance violations
- Optimization recommendations

### Example Report Structure
```json
{
  "timestamp": "2025-08-28T08:45:00.000Z",
  "totalSize": 1847392,
  "budgetUsage": "35.2%",
  "violations": [],
  "warnings": [],
  "topAssets": [
    {
      "path": "bundles/main.js",
      "size": 892345,
      "sizeFormatted": "871.43 KB"
    }
  ]
}
```

## Real-time Monitoring

### Development Logs
During development, performance metrics are logged:
```
[DEBUG] App startup time: 2847ms
[DEBUG] Navigation to HomeScreen: 342ms
[DEBUG] API /api/jobs response time: 1247ms
[DEBUG] Memory usage: 127.45MB
[WARN] Low FPS detected: 52
```

### Production Monitoring
In production, violations are reported to Sentry:
- Performance budget breaches
- Memory leaks
- Slow API responses
- Poor frame rates

## Performance Optimization Tips

### Bundle Size Optimization
1. **Code Splitting**: Import only what you need
2. **Tree Shaking**: Remove unused code
3. **Image Optimization**: Use WebP format, compress images
4. **Lazy Loading**: Load screens and components on demand

### Runtime Performance
1. **Memoization**: Use React.memo, useMemo, useCallback
2. **List Optimization**: Implement FlatList for large datasets
3. **Image Handling**: Use expo-image for better performance
4. **State Management**: Minimize unnecessary re-renders

### Memory Management
1. **Cleanup**: Remove event listeners and timers
2. **Image Caching**: Implement proper cache limits
3. **State Persistence**: Clear unused cached data
4. **Memory Profiling**: Use React Native Performance

## Alerts & Notifications

### Budget Violations
When performance budgets are exceeded:
- **Development**: Console warnings and logs
- **Production**: Automatic Sentry reports
- **CI/CD**: Build warnings or failures

### Monitoring Thresholds
- **Green**: Within budget limits
- **Yellow**: Approaching warning thresholds
- **Red**: Exceeding error thresholds

## Integration with CI/CD

### Pre-commit Hooks
```bash
# Add to .husky/pre-commit
npm run performance:check
```

### GitHub Actions
```yaml
- name: Performance Budget Check
  run: |
    npm run performance:check
    if [ -f "bundle-analysis-report.json" ]; then
      node -e "
        const report = JSON.parse(require('fs').readFileSync('bundle-analysis-report.json', 'utf8'));
        if (report.violations.length > 0) {
          console.error('Performance budget violations detected');
          process.exit(1);
        }
      "
    fi
```

## Customization

### Adding New Metrics
1. Update `performance-budget.json`
2. Modify `performanceMonitor.ts`
3. Create new tracking hooks
4. Update documentation

### Adjusting Budgets
Based on user testing and analytics:
```json
{
  "performance": {
    "startup": {
      "warning": "2000ms",  // Reduced for better UX
      "error": "4000ms"
    }
  }
}
```

## Troubleshooting

### High Bundle Size
- Run bundle analyzer to identify large dependencies
- Consider alternative lighter libraries
- Implement dynamic imports
- Remove unused assets

### Poor Performance
- Check memory leaks with performance profiler
- Optimize heavy computations
- Reduce component complexity
- Implement proper list virtualization

### Slow API Responses
- Implement request caching
- Add request timeout handling
- Use optimistic updates
- Consider offline-first approach

## Best Practices

1. **Regular Monitoring**: Check performance weekly
2. **Progressive Enhancement**: Start with core features
3. **Device Testing**: Test on low-end devices
4. **Network Awareness**: Consider slow connections
5. **User-Centric Metrics**: Focus on perceived performance

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `npm run performance:check` | Full performance analysis |
| `npm run bundle:analyze` | Analyze bundle composition |
| `npm run bundle:export` | Create optimized bundle |
| `npm run performance:report` | View latest analysis |

## Files

- `performance-budget.json` - Budget configuration
- `src/utils/performanceMonitor.ts` - Core monitoring logic
- `src/hooks/usePerformance.ts` - React hooks for tracking
- `scripts/analyze-bundle.js` - Bundle analysis script
- `bundle-analysis-report.json` - Generated performance report

---

*Performance monitoring helps ensure Mintenance delivers the best possible user experience across all devices and network conditions.*