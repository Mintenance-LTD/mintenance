# AI Cache Load Testing - Quick Start Guide

## Overview

This guide will help you run comprehensive load tests for the Mintenance AI Response Caching Layer.

**What you'll test**:
- Cache hit/miss performance
- Concurrent load handling
- LRU eviction behavior
- Cost savings validation
- Integration with all AI services

**Expected duration**: ~60 seconds (all 7 tests)

---

## Prerequisites

### 1. Environment Setup

Ensure you have the following environment variables configured (optional for testing):

```bash
# .env or .env.local
OPENAI_API_KEY=sk-...               # Optional (tests use mocks)
UPSTASH_REDIS_REST_URL=https://...  # Optional (tests work without Redis)
UPSTASH_REDIS_REST_TOKEN=...        # Optional
```

**Note**: The load tests work **without** actual API keys because they use **mock functions** to simulate AI responses. Redis is optional; tests will run in memory-only mode if unavailable.

### 2. Install Dependencies

```bash
# From project root
npm install
```

---

## Running the Tests

### Option 1: Quick Run (Recommended)

```bash
npm run test:load:ai-cache
```

This will:
1. Execute all 7 test scenarios
2. Generate performance metrics
3. Calculate cost savings
4. Display detailed report
5. Exit with code 0 (pass) or 1 (fail)

### Option 2: Direct Execution

```bash
# Using tsx (recommended)
tsx scripts/load-test-ai-cache.ts

# Using ts-node
ts-node scripts/load-test-ai-cache.ts

# Using Node (compile first)
tsc scripts/load-test-ai-cache.ts
node scripts/load-test-ai-cache.js
```

---

## Understanding the Output

### Test Progress
```
AI Response Cache Load Test Suite
================================================================================

Configuration:
  Target Cache Hit Time: <10ms
  Target Hit Rate: 60-80%
  Target Monthly Savings: $500-$1000

=== Test 1: Cache Miss Performance (Cold Cache) ===
  Progress: 10/100
  Progress: 20/100
  ...
  Progress: 100/100
  Results:
    Min: 52.34ms
    Max: 98.76ms
    Avg: 72.15ms
    P50: 71.23ms
    P95: 95.67ms
    P99: 97.89ms
    Status: ✓ PASS
```

### Final Report
```
================================================================================
AI CACHE LOAD TEST REPORT
================================================================================

SUMMARY:
  Total Tests: 7
  Passed: 7 ✓
  Failed: 0 ✗
  Success Rate: 100.0%
  Total Duration: 45.67s

TEST DETAILS:
  1. Cache Miss Performance: ✓ PASS
     Duration: 7.82s

  2. Cache Hit Performance: ✓ PASS
     Duration: 1.23s

  3. Mixed Load Performance: ✓ PASS
     Duration: 12.45s

  4. Concurrent Load: ✓ PASS
     Duration: 8.91s

  5. LRU Eviction: ✓ PASS
     Duration: 10.34s

  6. Cost Savings: ✓ PASS
     Duration: 3.67s

  7. Integration Testing: ✓ PASS
     Duration: 1.25s

CACHE STATISTICS:
  Total Hits: 2,345
  Total Misses: 1,655
  Hit Rate: 58.6%
  Total Saved Cost: $0.0234
  Projected Monthly Savings: $623.45

RECOMMENDATIONS:
  ✓ All tests passed! Cache is performing optimally.
```

---

## Test Scenarios Explained

### Test 1: Cache Miss Performance
**Purpose**: Measure baseline API call time without caching
**What it does**:
- Sends 100 unique requests (all cache misses)
- Simulates API latency (50-100ms)
- Validates that cache doesn't slow down first requests

**Pass criteria**: Average time = 50-200ms (API simulation range)

---

### Test 2: Cache Hit Performance
**Purpose**: Verify <10ms cache retrieval
**What it does**:
- Pre-populates cache with 10 entries
- Sends 100 duplicate requests (all cache hits)
- Measures in-memory lookup speed

**Pass criteria**: Average < 10ms, P95 < 15ms

**What to look for**:
```
Good:   Avg: 2-5ms, P95: 8ms   → Fast memory lookups
Okay:   Avg: 8-10ms, P95: 15ms → Within target
Bad:    Avg: >15ms, P95: >20ms → Performance issue
```

---

### Test 3: Mixed Load
**Purpose**: Simulate realistic production traffic
**What it does**:
- 1,000 total requests
- 70% duplicates (cache hits)
- 30% unique (cache misses)
- Measures overall performance

**Pass criteria**:
- Hit rate: 60-80%
- Cache hit time: <10ms
- Overall average: ~40ms (weighted average)

**Interpretation**:
```
Hit rate 70%, Avg 42ms:
  = (700 × 3ms) + (300 × 75ms) / 1000
  = 2,100ms + 22,500ms / 1000
  = 24.6ms actual (below 42ms target ✓)
```

---

### Test 4: Concurrent Load
**Purpose**: Stress test with 1,000 parallel requests
**What it does**:
- Executes 1,000 requests simultaneously
- 50% unique, 50% duplicates
- Tests for race conditions and performance degradation

**Pass criteria**:
- P95 latency < 1000ms
- Hit rate ≥ 50%
- Zero errors

**What to monitor**:
- **Memory usage**: Should not spike significantly
- **Error rate**: Should be 0%
- **Throughput**: Should be >100 req/s

---

### Test 5: LRU Eviction
**Purpose**: Verify least-recently-used entries are evicted
**What it does**:
- Fills cache to max capacity (1,000 entries)
- Adds 200 new entries (triggers eviction)
- Checks if oldest 100 entries were evicted

**Pass criteria**: ≥50% of oldest entries evicted

**Understanding LRU**:
```
Cache Max: 1,000 entries

Step 1: Add entries 0-999 (cache full)
Step 2: Add entries 1000-1199 (200 new entries)
Step 3: Cache evicts 200 oldest entries (0-199)

Verification: Check if entries 0-99 are missing
Expected: 50-100 entries evicted (≥50% eviction rate)
```

---

### Test 6: Cost Savings
**Purpose**: Validate $500-1000/month savings target
**What it does**:
- Simulates realistic daily usage:
  - 5,000 embeddings/day
  - 500 GPT-4 Vision/day
  - 300 Google Vision/day
- Calculates monthly savings at 70% hit rate

**Pass criteria**: Monthly savings = $500-2000

**Cost calculation**:
```
GPT-4 Vision (highest impact):
  Without cache: 15,000/month × $0.01275 = $191.25
  With cache (70% hit): 4,500/month × $0.01275 = $57.38
  SAVINGS: $133.88/month

Total across all services: $500-1000/month
```

---

### Test 7: Integration Testing
**Purpose**: Verify all AI services work with caching
**What it does**:
- Tests 4 service types:
  - embeddings
  - gpt4-vision
  - google-vision
  - maintenance-assessment
- For each: First call (miss), Second call (hit)

**Pass criteria**: Second call <10ms for all services

**Why this matters**:
- Ensures cache keys are generated correctly for each service
- Validates service-specific TTLs and configurations
- Confirms no service-specific bugs

---

## Interpreting Results

### Green Flags (Good Performance)
```
✓ All tests passed
✓ Cache hit rate: 60-80%
✓ Avg hit time: 2-5ms
✓ P95 hit time: <10ms
✓ Monthly savings: $500-1000
✓ Zero errors
```

### Yellow Flags (Needs Attention)
```
⚠ Cache hit rate: 50-60% (lower than target)
  → Review cache key generation
  → Check TTL configuration

⚠ Avg hit time: 10-15ms (slower than target)
  → Monitor memory usage
  → Check for GC pauses

⚠ Monthly savings: $400-500 (below target)
  → Increase cache TTL
  → Prioritize expensive operations
```

### Red Flags (Action Required)
```
✗ Test failures
  → Check error logs
  → Verify dependencies installed

✗ Cache hit rate: <50%
  → Cache not working correctly
  → Review implementation

✗ Avg hit time: >20ms
  → Performance degradation
  → Investigate memory/CPU issues
```

---

## Troubleshooting

### Issue: Tests fail immediately
```
Error: Cannot find module '@mintenance/shared'

Solution:
  cd apps/web
  npm install
  cd ../..
  npm run test:load:ai-cache
```

### Issue: Redis connection warnings
```
Warning: Redis not configured, using in-memory cache only

This is normal! Tests work without Redis.
To enable Redis (optional):
  1. Set UPSTASH_REDIS_REST_URL in .env
  2. Set UPSTASH_REDIS_REST_TOKEN in .env
  3. Re-run tests
```

### Issue: Slow test execution
```
Expected: 45-60 seconds
Actual: >120 seconds

Possible causes:
  1. CPU throttling (check system resources)
  2. Node.js version (use v18+ for best performance)
  3. Many background processes (close unnecessary apps)

Solution:
  - Close resource-heavy applications
  - Use Node 18+ (check: node --version)
  - Run tests during low-CPU periods
```

### Issue: High memory usage
```
Expected: ~100MB peak
Actual: >500MB

Possible causes:
  1. Memory leak in test code
  2. Cache not evicting properly
  3. Too many concurrent tests

Solution:
  - Run tests individually (modify script)
  - Check for circular references
  - Monitor memory with: node --trace-gc scripts/load-test-ai-cache.ts
```

---

## Advanced Usage

### Running Individual Tests

Edit `scripts/load-test-ai-cache.ts`:

```typescript
// Comment out tests you don't want to run
async function main() {
  // allResults.push(await testCacheMissPerformance());
  allResults.push(await testCacheHitPerformance()); // Only this one
  // allResults.push(await testMixedLoad());
  // ...
}
```

### Custom Configuration

Modify test parameters:

```typescript
const TEST_CONFIG = {
  COLD_CACHE_REQUESTS: 50,  // Reduce from 100 for faster tests
  WARM_CACHE_REQUESTS: 50,
  MIXED_LOAD_TOTAL: 500,    // Reduce from 1000
  CONCURRENT_REQUESTS: 500, // Reduce from 1000
  // ...
};
```

### Exporting Metrics

Tests automatically export metrics to console. To save to file:

```bash
npm run test:load:ai-cache > test-results.txt 2>&1

# Or with timestamp
npm run test:load:ai-cache > "test-results-$(date +%Y%m%d-%H%M%S).txt" 2>&1
```

### Continuous Monitoring

Run tests hourly in production:

```bash
# Add to crontab
0 * * * * cd /path/to/mintenance && npm run test:load:ai-cache >> /var/log/cache-tests.log 2>&1
```

---

## Performance Benchmarks

### Expected Results (Reference)

**Test 1 - Cache Miss**:
```
Min: 50ms, Max: 100ms, Avg: 75ms
P95: 95ms, P99: 98ms
```

**Test 2 - Cache Hit**:
```
Min: 0.5ms, Max: 8ms, Avg: 2-5ms
P95: 8ms, P99: 10ms
```

**Test 3 - Mixed Load**:
```
Hit Rate: 70%, Avg: 25-40ms
Cache Hits Avg: 3ms, Cache Misses Avg: 75ms
```

**Test 4 - Concurrent**:
```
Throughput: 100-200 req/s
P50: 50ms, P95: 500ms, P99: 900ms
```

**Test 5 - LRU Eviction**:
```
Evicted: 50-100 entries out of 100 checked
Eviction Rate: 50-100%
```

**Test 6 - Cost Savings**:
```
Monthly Savings: $140-600 (depends on usage scenario)
At production scale (Scenario 4): $571/month
```

**Test 7 - Integration**:
```
All services: First call 50-100ms, Second call <10ms
```

---

## Next Steps

After successful load tests:

1. **Deploy to staging**:
   ```bash
   git add scripts/load-test-ai-cache.ts
   git commit -m "Add AI cache load tests"
   git push
   ```

2. **Enable production monitoring**:
   - Track cache hit rate (target: 70%)
   - Monitor cost savings (target: $500+/month)
   - Alert on performance degradation

3. **Schedule regular tests**:
   - Run weekly to catch regressions
   - Compare results over time
   - Adjust cache configuration as needed

4. **Optimize based on results**:
   - If hit rate <60%: Increase TTL or cache size
   - If hit time >10ms: Investigate memory/CPU
   - If savings <$500: Prioritize expensive operations

---

## Resources

- **Load Test Script**: `scripts/load-test-ai-cache.ts`
- **Cache Implementation**: `apps/web/lib/services/cache/AIResponseCache.ts`
- **Detailed Report**: `scripts/AI_CACHE_LOAD_TEST_REPORT.md`
- **Cost Analysis**: `scripts/AI_CACHE_COST_ANALYSIS.md`

---

## Support

If you encounter issues:

1. Check error logs in console output
2. Verify dependencies are installed (`npm install`)
3. Review cache implementation in `AIResponseCache.ts`
4. Check Redis connection (if enabled)
5. Run individual tests to isolate failures

**Common Issues**:
- Module not found → Run `npm install` in project root
- Redis warnings → Normal, tests work without Redis
- Slow tests → Close background apps, use Node 18+
- Memory issues → Reduce test parameters (see Advanced Usage)

---

**Last Updated**: 2025-12-21
**Test Suite Version**: 1.0.0
**Maintainer**: Mintenance Platform Team
