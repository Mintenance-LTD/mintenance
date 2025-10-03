# Week 2-3: Architecture Compliance - Execution Plan

**Start Date:** October 2, 2025
**Duration:** 2 weeks (60 hours estimated)
**Goal:** Eliminate all 500-line violations and console.log statements

---

## 🎯 OBJECTIVES

### Primary Goals

1. **Refactor 6 Large Files** (40 hours)
   - Split files >500 lines into modular components
   - Maintain functionality while improving architecture
   - Follow Single Responsibility Principle

2. **Replace Console.log Statements** (20 hours)
   - Replace 541 instances with structured logger
   - Improve production logging quality
   - Ensure ESLint compliance

### Success Criteria

- ✅ 0 files exceeding 500 lines (currently 6)
- ✅ 0 console.log statements (currently 541)
- ✅ 100% ESLint compliance
- ✅ All tests passing
- ✅ No functionality broken

---

## 📋 WEEK 2: REFACTORING PLAN

### File 1: AdvancedMLFramework.ts (1,085 lines)

**Current:** Single monolithic file
**Target:** 5 modular files (~220 lines each)

**Proposed Structure:**
```
apps/mobile/src/services/ml-engine/advanced/
├── index.ts (exports, ~50 lines)
├── MLTrainingManager.ts (~300 lines)
├── MLInferenceEngine.ts (~250 lines)
├── MLEvaluationService.ts (~200 lines)
├── MLModelRegistry.ts (~200 lines)
└── MLDeploymentService.ts (~135 lines)
```

**Breakdown:**
- `MLTrainingManager.ts` - Training logic, hyperparameter tuning
- `MLInferenceEngine.ts` - Model inference, prediction serving
- `MLEvaluationService.ts` - Metrics, validation, performance evaluation
- `MLModelRegistry.ts` - Model versioning, storage, retrieval
- `MLDeploymentService.ts` - Model deployment, serving configuration

**Estimated Time:** 8 hours

---

### File 2: enhancedErrorTracking.ts (1,078 lines)

**Current:** Single monolithic file
**Target:** 5 modular files (~220 lines each)

**Proposed Structure:**
```
apps/mobile/src/utils/errorTracking/
├── index.ts (exports, ~50 lines)
├── ErrorTypes.ts (~150 lines)
├── ErrorCapture.ts (~250 lines)
├── ErrorReporting.ts (~250 lines)
├── ErrorAnalytics.ts (~200 lines)
└── ErrorRecovery.ts (~228 lines)
```

**Breakdown:**
- `ErrorTypes.ts` - Error type definitions, interfaces
- `ErrorCapture.ts` - Error capturing logic, stack traces
- `ErrorReporting.ts` - Sentry integration, remote reporting
- `ErrorAnalytics.ts` - Error analytics, aggregation, insights
- `ErrorRecovery.ts` - Recovery strategies, fallback logic

**Estimated Time:** 8 hours

---

### File 3: InfrastructureScalingService.ts (1,047 lines)

**Current:** Single monolithic file
**Target:** 4 modular files (~260 lines each)

**Proposed Structure:**
```
apps/mobile/src/services/infrastructure/
├── index.ts (exports, ~50 lines)
├── ScalingPolicies.ts (~250 lines)
├── MetricsCollector.ts (~250 lines)
├── AutoScaler.ts (~250 lines)
└── ResourceOrchestrator.ts (~297 lines)
```

**Breakdown:**
- `ScalingPolicies.ts` - Scaling policy definitions, rules
- `MetricsCollector.ts` - System metrics collection, monitoring
- `AutoScaler.ts` - Auto-scaling logic, triggers
- `ResourceOrchestrator.ts` - Resource management, orchestration

**Estimated Time:** 8 hours

---

## 📋 WEEK 3: REFACTORING PLAN

### File 4: MLTrainingPipeline.ts (1,044 lines)

**Current:** Single monolithic file
**Target:** 4 modular files (~260 lines each)

**Proposed Structure:**
```
apps/mobile/src/services/ml-training/
├── index.ts (exports, ~50 lines)
├── DataPreparation.ts (~250 lines)
├── TrainingOrchestrator.ts (~250 lines)
├── ValidationService.ts (~250 lines)
└── ModelDeployment.ts (~294 lines)
```

**Breakdown:**
- `DataPreparation.ts` - Data loading, preprocessing, augmentation
- `TrainingOrchestrator.ts` - Training loop, checkpointing
- `ValidationService.ts` - Validation logic, metrics
- `ModelDeployment.ts` - Model export, deployment

**Estimated Time:** 8 hours

---

### File 5: testing.ts (1,035 lines)

**Current:** Single monolithic file
**Target:** 4 modular files (~260 lines each)

**Proposed Structure:**
```
apps/mobile/src/utils/testing/
├── index.ts (exports, ~50 lines)
├── TestUtilities.ts (~250 lines)
├── MockFactories.ts (~250 lines)
├── TestFixtures.ts (~250 lines)
└── TestHelpers.ts (~285 lines)
```

**Breakdown:**
- `TestUtilities.ts` - Common test utilities, setup/teardown
- `MockFactories.ts` - Mock creation functions
- `TestFixtures.ts` - Test data fixtures
- `TestHelpers.ts` - Helper functions for tests

**Estimated Time:** 6 hours

---

### File 6: performance.ts (1,004 lines)

**Current:** Single monolithic file
**Target:** 4 modular files (~250 lines each)

**Proposed Structure:**
```
apps/mobile/src/utils/performance/
├── index.ts (exports, ~50 lines)
├── MetricsCollector.ts (~250 lines)
├── PerformanceMonitor.ts (~250 lines)
├── BudgetEnforcer.ts (~250 lines)
└── OptimizationService.ts (~254 lines)
```

**Breakdown:**
- `MetricsCollector.ts` - Performance metrics collection
- `PerformanceMonitor.ts` - Real-time performance monitoring
- `BudgetEnforcer.ts` - Performance budget enforcement
- `OptimizationService.ts` - Performance optimization strategies

**Estimated Time:** 6 hours

---

## 🔧 REFACTORING PROCESS (Per File)

### Step 1: Analysis (30 minutes)
1. Read entire file
2. Identify logical sections
3. Map dependencies between sections
4. Plan module boundaries

### Step 2: Create Directory Structure (5 minutes)
```bash
mkdir -p apps/mobile/src/services/[module-name]/
```

### Step 3: Extract Modules (4-6 hours)
1. Create individual module files
2. Move code sections to appropriate files
3. Update imports/exports
4. Ensure type consistency

### Step 4: Create Index File (15 minutes)
```typescript
// index.ts - Central exports
export * from './ModuleA';
export * from './ModuleB';
export * from './ModuleC';
```

### Step 5: Update Imports (30 minutes)
1. Find all files importing the old file
2. Update to use new modular structure
3. Test imports resolve correctly

### Step 6: Testing (1 hour)
1. Run type check: `npm run type-check`
2. Run tests: `npm run test`
3. Fix any broken tests
4. Verify functionality unchanged

### Step 7: Delete Old File (5 minutes)
```bash
rm apps/mobile/src/services/[old-file].ts
```

---

## 🪵 CONSOLE.LOG REPLACEMENT STRATEGY

### Phase 1: Services (Week 2)

**Target:** 250 console.log instances in service files

**Pattern:**
```typescript
// ❌ BEFORE
console.log('Processing payment for job:', jobId);
console.log('Payment intent created:', paymentIntent);

// ✅ AFTER
import { logger } from '@/utils/logger';

logger.info('PaymentService', 'Processing payment', { jobId });
logger.info('PaymentService', 'Payment intent created', {
  paymentIntentId: paymentIntent.id,
  amount: paymentIntent.amount
});
```

**Files to Update:**
- `apps/mobile/src/services/MLTrainingPipeline.ts` (28 instances)
- `apps/web/lib/services/VideoCallService.ts` (23 instances)
- `apps/web/lib/services/PaymentService.ts` (18 instances)
- Other service files (~181 instances)

**Estimated Time:** 10 hours

---

### Phase 2: Screens & Components (Week 3)

**Target:** 200 console.log instances in UI files

**Pattern:**
```typescript
// ❌ BEFORE
console.log('User navigated to:', screenName);
console.log('Form submitted:', formData);

// ✅ AFTER
import { logger } from '@/utils/logger';

logger.debug('Navigation', 'User navigated', { screenName });
logger.info('Form', 'Form submitted', {
  formType: formData.type,
  userId: user.id
});
```

**Estimated Time:** 8 hours

---

### Phase 3: Tests & Utilities (Week 3)

**Target:** 91 console.log instances in tests

**Pattern:**
```typescript
// ❌ BEFORE (in tests)
console.log('Test data:', mockData);

// ✅ AFTER (remove entirely or use debug logger)
// Remove: Tests should use expect() not console.log
// OR for debugging:
logger.debug('Test', 'Mock data created', { mockData });
```

**Estimated Time:** 2 hours

---

## 📊 WEEK 2 DAILY SCHEDULE

### Day 1 (8 hours)
- **Morning:** Refactor AdvancedMLFramework.ts (4 hours)
- **Afternoon:** Refactor enhancedErrorTracking.ts (4 hours)

### Day 2 (8 hours)
- **Morning:** Refactor InfrastructureScalingService.ts (4 hours)
- **Afternoon:** Replace console.log in services (4 hours)

### Day 3 (8 hours)
- **All Day:** Replace console.log in services (8 hours)
- **Evening:** Testing and verification

### Day 4 (8 hours)
- **Morning:** Refactor MLTrainingPipeline.ts (4 hours)
- **Afternoon:** Refactor testing.ts (4 hours)

### Day 5 (8 hours)
- **Morning:** Refactor performance.ts (3 hours)
- **Afternoon:** Replace console.log in UI (5 hours)

---

## 📊 WEEK 3 DAILY SCHEDULE

### Day 1-2 (16 hours)
- Replace console.log in screens/components (16 hours)

### Day 3 (8 hours)
- Replace console.log in tests/utilities (8 hours)
- Final cleanup and verification

### Day 4-5 (16 hours)
- Fix any remaining TypeScript errors
- Ensure all tests passing
- Documentation updates
- Code review and polish

---

## ✅ VERIFICATION CHECKLIST

### After Each Refactoring

- [ ] File size <500 lines for all modules
- [ ] TypeScript compilation passes
- [ ] All imports resolved correctly
- [ ] Tests passing
- [ ] No functionality broken
- [ ] Old file deleted

### After Console.log Replacement

- [ ] No console.log statements (except tests if needed)
- [ ] ESLint passes without warnings
- [ ] Logger imports added correctly
- [ ] Log levels appropriate (debug/info/warn/error)
- [ ] Sensitive data not logged

### Final Week 2-3 Verification

- [ ] 0 files >500 lines
- [ ] 0 console.log in production code
- [ ] All tests passing
- [ ] Type check passing
- [ ] ESLint passing
- [ ] Build successful

---

## 🎯 SUCCESS METRICS

### Week 2-3 Goals

| Metric | Start | Target | Success |
|--------|-------|--------|---------|
| **Files >500 lines** | 6 | 0 | 0 violations |
| **Console.log count** | 541 | 0 | 0 instances |
| **ESLint errors** | ~541 | 0 | Clean build |
| **Test coverage** | 80% | 80%+ | Maintained |

### Architecture Score

**Before Week 2:**
- Files >500 lines: 6 ❌
- Architecture grade: C+ (75/100)

**After Week 2:**
- Files >500 lines: 0 ✅
- Architecture grade: A- (85/100)

---

## 📚 RESOURCES

### Logger Utility Location
```
apps/mobile/src/utils/logger.ts
```

### Logger API
```typescript
logger.info(context: string, message: string, metadata?: object);
logger.error(context: string, message: string, error: Error | object);
logger.debug(context: string, message: string, metadata?: object);
logger.warn(context: string, message: string, metadata?: object);
```

### ESLint Rule Reference
```javascript
// apps/mobile/.eslintrc.js
{
  'no-console': ['error', { allow: ['warn', 'error'] }]
}
```

---

## 🚀 LET'S BEGIN!

**Starting with:** File 1 - AdvancedMLFramework.ts (1,085 lines)

**Next steps:**
1. Analyze file structure
2. Create modular directory
3. Extract 5 modules
4. Update imports
5. Test and verify
6. Delete old file

**Ready to start refactoring!** 🛠️
