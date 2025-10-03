# Performance Monitoring System - Modular Architecture

## Overview
The performance monitoring system has been refactored from a single 1,004-line file into a modular architecture with focused, maintainable components.

## File Structure

```
apps/mobile/src/utils/performance/
├── index.ts (68 lines)                    # Central exports and utilities
├── types.ts (75 lines)                    # Type definitions
├── MetricsCollector.ts (253 lines)        # Metrics collection and component tracking
├── BudgetEnforcer.ts (280 lines)          # Budget violation enforcement
├── BudgetRuleManager.ts (191 lines)       # Budget rule configuration
├── PerformanceMonitor.ts (273 lines)      # Main orchestrator
└── Reporter.ts (214 lines)                # Report generation and analytics
```

**Total Lines:** 1,354 (up from 1,004 due to better separation and documentation)
**All files under 300 lines ✅**

## Modules

### types.ts (75 lines)
Centralized type definitions for:
- PerformanceMetric
- PerformanceBudget
- BudgetEnforcementRule
- PerformanceReport
- PerformanceViolation
- ComponentPerformance

### MetricsCollector.ts (253 lines)
**Responsibility:** Metrics collection and tracking
- Record performance metrics
- Track component render times
- Monitor memory usage
- Track network requests
- Timer utilities (startTimer, measureAsync, measureSync)
- Event listeners for metrics

### BudgetRuleManager.ts (191 lines)
**Responsibility:** Budget rule configuration and management
- Initialize default and advanced budgets
- Add/remove/update budget rules
- Query budget rules by ID or metric
- Enable/disable budget rules
- Maintain backward-compatible budget map

### BudgetEnforcer.ts (280 lines)
**Responsibility:** Budget enforcement and violation tracking
- Enforce performance budgets against metrics
- Evaluate rule conditions (less_than, greater_than, equal_to)
- Track violations with cooldown periods
- Emit violation events
- Delegate rule management to BudgetRuleManager

### PerformanceMonitor.ts (273 lines)
**Responsibility:** Main system orchestrator
- Singleton pattern for global access
- Coordinate MetricsCollector, BudgetEnforcer, and Reporter
- Provide unified API for all performance monitoring features
- Manage periodic reporting
- Configuration management

### Reporter.ts (214 lines)
**Responsibility:** Report generation and storage
- Generate performance reports
- Calculate budget status
- Format metric values (bytes, ms, etc.)
- Store/retrieve reports from AsyncStorage
- Generate human-readable budget reports

### index.ts (68 lines)
**Responsibility:** Central exports and utilities
- Export all modules and types
- Provide React hook (usePerformanceMonitoring)
- Provide decorator (measurePerformance)
- Default export of performanceMonitor singleton

## Usage

### Import the system
```typescript
import { performanceMonitor, usePerformanceMonitoring } from '../../utils/performance';
```

### Record metrics
```typescript
performanceMonitor.recordMetric('api_call', 150, 'network', { endpoint: '/users' });
```

### Use React hook
```typescript
const { recordMetric, generateReport, getBudgetStatus } = usePerformanceMonitoring();
```

### Add custom budget rules
```typescript
performanceMonitor.addBudgetRule({
  id: 'custom_metric',
  name: 'Custom Metric',
  metric: 'my_metric',
  target: 100,
  warning: 150,
  critical: 200,
  unit: 'ms',
  category: 'performance',
  enabled: true,
  comparison: 'less_than',
  enforcement: 'warn'
});
```

## Benefits of Refactoring

1. **Single Responsibility Principle:** Each module has one clear purpose
2. **Maintainability:** Smaller files are easier to understand and modify
3. **Testability:** Focused modules are easier to unit test
4. **Reusability:** Modules can be used independently if needed
5. **Scalability:** Easy to add new features without bloating existing files

## Migration Notes

All existing imports from `utils/performance` continue to work without changes:
```typescript
// This still works ✅
import { performanceMonitor } from '../../utils/performance';
```

The modular structure is transparent to consumers thanks to the central index.ts export file.
