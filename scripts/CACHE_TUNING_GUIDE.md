# AI Cache Tuning Guide

## Overview

This guide provides actionable recommendations for optimizing the AI Response Cache based on load test results and production metrics.

---

## Performance Tuning Matrix

### Problem: Low Cache Hit Rate (<60%)

#### Symptoms
```
Cache Statistics:
  Hit Rate: 45%
  Target: 60-80%
  Impact: High API costs
```

#### Root Causes & Solutions

**1. Inconsistent Cache Keys**

**Diagnosis**:
```typescript
// Same logical request, different cache keys
request1: { text: "roof repair", model: "text-embedding-3-small" }
request2: { model: "text-embedding-3-small", text: "roof repair" }
// Different key hashes due to different property order
```

**Solution**: Already implemented (sorted keys)
```typescript
// In AIResponseCache.ts
const normalized = JSON.stringify(input, Object.keys(input).sort());
// Ensures consistent hashing regardless of property order
```

**Verification**:
```bash
# Test cache key generation
npm run test:load:ai-cache

# Check logs for:
# "Cache key: ai-cache:embeddings:abc123" (should be same for same input)
```

---

**2. TTL Too Short**

**Diagnosis**:
```
Cache Statistics:
  Service: embeddings
  TTL: 1 hour
  Hit Rate: 30% (too low)
  Issue: Entries expiring before reuse
```

**Solution**: Increase TTL for stable data
```typescript
// In AIResponseCache.ts - SERVICE_CONFIGS

// BEFORE (too short for embeddings)
'embeddings': {
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 2000,
  useRedis: true,
}

// AFTER (optimal for embeddings - they never change)
'embeddings': {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 2000,
  useRedis: true,
}
```

**Recommended TTLs by Service**:
| Service | Recommended TTL | Reason |
|---------|----------------|--------|
| embeddings | 7 days | Embeddings never change for same input |
| gpt4-vision | 24 hours | Damage types stable, but may need refresh |
| google-vision | 48 hours | Image analysis stable |
| building-surveyor | 7 days | Comprehensive assessments rarely change |
| maintenance-assessment | 24 hours | May need updates based on new data |

---

**3. Cache Size Too Small**

**Diagnosis**:
```
Cache Statistics:
  Service: embeddings
  Max Size: 100
  Current Size: 100 (always full)
  Evictions/hour: 50
  Issue: Entries evicted before reuse
```

**Solution**: Increase max size
```typescript
// In AIResponseCache.ts - SERVICE_CONFIGS

// BEFORE (too small)
'embeddings': {
  ttl: 7 * 24 * 60 * 60 * 1000,
  maxSize: 100, // Too small!
  useRedis: true,
}

// AFTER (optimal)
'embeddings': {
  ttl: 7 * 24 * 60 * 60 * 1000,
  maxSize: 2000, // Much better
  useRedis: true,
}
```

**Memory Impact Calculation**:
```
Service: embeddings
Entry size: ~7KB (1536 floats × 4 bytes + metadata)

100 entries:   700KB   (too small, frequent evictions)
1000 entries:  7MB     (good balance)
2000 entries:  14MB    (optimal, rarely evicts)
5000 entries:  35MB    (large, but acceptable if needed)
```

---

**4. Input Not Normalized**

**Diagnosis**:
```
# Different requests for same semantic content
request1: { text: "roof repair" }
request2: { text: "Roof Repair" }
request3: { text: "  roof repair  " }
# All generate different cache keys (cache misses)
```

**Solution**: Normalize input before caching
```typescript
// Add to AIResponseCache.ts

private static normalizeInput(input: any): any {
  if (typeof input === 'string') {
    // Normalize string: lowercase, trim, remove extra spaces
    return input.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  if (typeof input === 'object' && input !== null) {
    const normalized: any = {};
    for (const [key, value] of Object.entries(input)) {
      normalized[key] = this.normalizeInput(value);
    }
    return normalized;
  }

  return input;
}

// Use in generateCacheKey
private static generateCacheKey(service: AICacheServiceType, input: any): string {
  const normalized = this.normalizeInput(input);
  const jsonString = typeof normalized === 'string'
    ? normalized
    : JSON.stringify(normalized, Object.keys(normalized).sort());

  const hash = crypto.createHash('sha256').update(jsonString).digest('hex').substring(0, 32);
  return `ai-cache:${service}:${hash}`;
}
```

**Testing**:
```typescript
// Verify these generate same cache key
const key1 = generateCacheKey('embeddings', { text: 'roof repair' });
const key2 = generateCacheKey('embeddings', { text: 'Roof Repair' });
const key3 = generateCacheKey('embeddings', { text: '  roof repair  ' });

console.log(key1 === key2); // true
console.log(key2 === key3); // true
```

---

### Problem: Slow Cache Hits (>10ms)

#### Symptoms
```
Cache Statistics:
  Avg Hit Time: 25ms
  P95 Hit Time: 45ms
  Target: <10ms
  Impact: Poor UX, defeats caching purpose
```

#### Root Causes & Solutions

**1. Large Entry Serialization**

**Diagnosis**:
```
Cache Entry Size:
  Data: 500KB (huge GPT-4 response)
  Serialization: 15ms
  Deserialization: 12ms
  Total: 27ms (too slow)
```

**Solution**: Store only essential data
```typescript
// BEFORE (storing too much)
const entry: CacheEntry = {
  data: {
    fullResponse: response,      // 500KB
    metadata: response.metadata, // 50KB
    rawJson: JSON.stringify(response), // 500KB duplicate!
    timestamp: Date.now(),
  },
  // ...
};

// AFTER (lean cache entries)
const entry: CacheEntry = {
  data: {
    // Only store what's needed
    result: response.result,     // 10KB
    confidence: response.confidence,
    issueType: response.issueType,
    // Skip: fullResponse, rawJson, metadata
  },
  timestamp: Date.now(),
  hitCount: 0,
  savedCost: 0,
  ttl: config.ttl,
};
```

**Impact**:
```
Before: 500KB entry, 27ms retrieval
After:  10KB entry, 2ms retrieval
Improvement: 13x faster
```

---

**2. Redis Network Latency**

**Diagnosis**:
```
Cache Tier Breakdown:
  In-memory hit: 2ms ✓
  Redis hit: 45ms ✗ (network latency)
  Issue: Redis too slow for real-time requests
```

**Solution**: Optimize Redis usage
```typescript
// OPTION 1: Only use Redis for warm-up, not primary cache
// Already implemented - in-memory checked first

// OPTION 2: Use Redis only for expensive operations
const SERVICE_CONFIGS = {
  'embeddings': {
    ttl: 7 * 24 * 60 * 60 * 1000,
    maxSize: 2000,
    useRedis: false, // Disable for cheap operations
  },
  'gpt4-vision': {
    ttl: 24 * 60 * 60 * 1000,
    maxSize: 500,
    useRedis: true, // Keep for expensive operations
  },
};

// OPTION 3: Use Upstash Redis (global edge network)
// Already recommended in docs - much faster than regional Redis
```

**Expected Improvement**:
```
Regional Redis:  45ms latency
Upstash Edge:    8ms latency
In-memory only:  2ms latency

Strategy: In-memory first (2ms), Redis fallback for misses
```

---

**3. Memory Pressure (Garbage Collection)**

**Diagnosis**:
```
Node.js GC Pauses:
  Frequency: Every 30 seconds
  Duration: 50ms
  Impact: Random 50ms pauses during cache hits
```

**Solution**: Reduce memory pressure
```typescript
// 1. Decrease cache size
'embeddings': {
  maxSize: 1000, // Reduced from 2000
  // Reduces memory by 7MB
}

// 2. More aggressive eviction
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: config.maxSize,
  ttl: config.ttl,
  updateAgeOnGet: true,
  allowStale: false,
  // Add size-based eviction
  maxSize: 50 * 1024 * 1024, // 50MB max memory
  sizeCalculation: (value) => {
    return JSON.stringify(value).length;
  },
});
```

**Monitoring GC**:
```bash
# Run with GC logging
node --trace-gc scripts/load-test-ai-cache.ts

# Look for:
# [12345] Scavenge 150.3 (200.5) -> 145.2 (200.5) MB, 2.3 / 0.0 ms
# If "ms" > 10ms frequently, reduce cache size
```

---

### Problem: Low Cost Savings (<$500/month)

#### Symptoms
```
Cost Analysis:
  Monthly Savings: $250
  Target: $500-1000
  Hit Rate: 65% (good)
  Issue: Caching wrong operations or low volume
```

#### Root Causes & Solutions

**1. Caching Cheap Operations**

**Diagnosis**:
```
Cached Operations Breakdown:
  Embeddings: 90% of cache hits ($0.00001 per call)
  GPT-4 Vision: 10% of cache hits ($0.01275 per call)

Savings:
  Embeddings: 5000 × 0.9 × $0.00001 = $0.045/month
  GPT-4 Vision: 500 × 0.1 × $0.01275 = $0.64/month
  Total: $0.69/month (very low!)
```

**Solution**: Prioritize expensive operations
```typescript
// Strategy: Aggressive caching for expensive operations

const SERVICE_CONFIGS = {
  // De-prioritize cheap operations
  'embeddings': {
    ttl: 24 * 60 * 60 * 1000, // Reduce to 1 day
    maxSize: 500, // Reduce size
    useRedis: false, // No distributed cache
  },

  // Maximize caching for expensive operations
  'gpt4-vision': {
    ttl: 7 * 24 * 60 * 60 * 1000, // Increase to 7 days
    maxSize: 2000, // Increase size
    useRedis: true, // Enable distributed cache
  },

  'google-vision': {
    ttl: 7 * 24 * 60 * 60 * 1000,
    maxSize: 2000,
    useRedis: true,
  },
};
```

**Expected Impact**:
```
Before:
  Embeddings: $0.045/month (90% of cache)
  GPT-4 Vision: $0.64/month (10% of cache)

After:
  Embeddings: $0.02/month (20% of cache)
  GPT-4 Vision: $134/month (80% of cache)

Total Savings Increase: $133/month
```

---

**2. Low Usage Volume**

**Diagnosis**:
```
Usage Stats:
  Daily GPT-4 Vision calls: 50
  Monthly: 1,500
  At 70% hit rate: 450 saved calls
  Savings: 450 × $0.01275 = $5.74/month

Issue: Not enough volume yet
```

**Solution**: Implement cache warming
```typescript
// Cache common damage types on startup
async function warmCache() {
  const commonDamages = [
    'roof_leak',
    'water_damage',
    'foundation_crack',
    'electrical_outlet_damage',
    'plumbing_leak',
    // ... top 20 damage types
  ];

  for (const damageType of commonDamages) {
    // Pre-populate cache with synthetic assessments
    await AIResponseCache.get(
      'gpt4-vision',
      { damageType },
      async () => {
        // Generate or load pre-computed assessment
        return await loadPrecomputedAssessment(damageType);
      }
    );
  }

  console.log(`Cache warmed with ${commonDamages.length} common damages`);
}

// Call on app startup
warmCache();
```

**Expected Impact**:
```
Without warming:
  Hit rate: 65%
  Common damage requests: 30% of traffic

With warming:
  Hit rate: 85% (+20%)
  Common damage requests: 100% cache hit
  Additional savings: +$50-100/month
```

---

**3. TTL Too Short (Premature Expiration)**

**Diagnosis**:
```
GPT-4 Vision Stats:
  TTL: 6 hours
  Average reuse time: 18 hours
  Issue: 75% of entries expire before reuse
```

**Solution**: Increase TTL
```typescript
// BEFORE
'gpt4-vision': {
  ttl: 6 * 60 * 60 * 1000, // 6 hours
  // Many entries expire before reuse
}

// AFTER
'gpt4-vision': {
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Almost all entries reused before expiration
}
```

**Impact Analysis**:
```
6-hour TTL:
  Reuse window: 6 hours
  Requests in window: 12
  Cache hits: 8 (67% hit rate)

7-day TTL:
  Reuse window: 7 days
  Requests in window: 2016
  Cache hits: 1411 (70% hit rate)

Additional savings: +3% hit rate = +$15/month
```

---

## Optimization Checklist

Use this checklist after running load tests:

### Performance Optimization
- [ ] Cache hit time <10ms (Test 2)
  - If >10ms: Check entry size, Redis latency, GC pauses
- [ ] P95 latency <15ms
  - If >15ms: Reduce entry size or disable Redis
- [ ] P99 latency <20ms
  - If >20ms: Investigate memory pressure

### Hit Rate Optimization
- [ ] Overall hit rate 60-80% (Test 3)
  - If <60%: Check TTL, cache size, input normalization
  - If >90%: May indicate stale cache, review TTL
- [ ] Eviction rate <30% (Test 5)
  - If >30%: Increase cache size or TTL

### Cost Optimization
- [ ] Monthly savings >$500 (Test 6)
  - If <$500: Prioritize expensive operations
  - Implement cache warming
  - Increase TTL for stable data
- [ ] GPT-4 Vision cache hits >60%
  - This is the highest-impact optimization

### Reliability
- [ ] Zero errors during stress test (Test 4)
- [ ] Graceful Redis failover (Test 7)
- [ ] Memory usage stable (<100MB growth over 1 hour)

---

## Performance Monitoring

### Metrics to Track

**Real-time Dashboard**:
```typescript
// Add to monitoring system
interface CacheMetrics {
  hitRate: number;           // Target: 60-80%
  avgHitTimeMs: number;      // Target: <10ms
  avgMissTimeMs: number;     // Informational
  cacheSize: number;         // Monitor growth
  evictionsPerHour: number;  // Target: <100
  errorsPerHour: number;     // Target: 0
}
```

**Daily Report**:
```typescript
interface DailyCacheReport {
  date: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  savedCalls: number;
  savedCost: number;
  projectedMonthlySavings: number;
}
```

**Alerts**:
```yaml
alerts:
  - name: low_hit_rate
    metric: cache_hit_rate
    threshold: <0.50
    severity: warning
    action: Review cache configuration

  - name: slow_cache_hits
    metric: avg_hit_time_ms
    threshold: >15
    severity: warning
    action: Investigate performance

  - name: high_error_rate
    metric: cache_errors_per_hour
    threshold: >10
    severity: critical
    action: Immediate investigation
```

---

## A/B Testing Cache Configurations

### Methodology

**Test Setup**:
```typescript
// Split traffic 50/50
const cacheConfig = userId % 2 === 0 ? configA : configB;

const configA = {
  // Current configuration
  ttl: 24 * 60 * 60 * 1000,
  maxSize: 1000,
};

const configB = {
  // Test configuration
  ttl: 7 * 24 * 60 * 60 * 1000,
  maxSize: 2000,
};
```

**Metrics to Compare**:
```typescript
interface ABTestResults {
  config: 'A' | 'B';
  hitRate: number;
  avgHitTime: number;
  savedCost: number;
  memoryUsage: number;
}
```

**Decision Criteria**:
```
If configB:
  - Hit rate +5% higher: Deploy
  - Cost savings +20% higher: Deploy
  - Memory usage <2x: Acceptable
  - Hit time <1.5x: Acceptable
```

---

## Production Deployment

### Pre-deployment Checklist
- [ ] All load tests passing
- [ ] Configuration reviewed and optimized
- [ ] Monitoring and alerts configured
- [ ] Redis connection verified (or disabled if not needed)
- [ ] Documentation updated

### Deployment Steps
1. Deploy cache to staging
2. Run load tests in staging
3. Monitor for 24 hours
4. Gradual rollout to production (10% → 50% → 100%)
5. Monitor metrics for 7 days
6. Fine-tune based on real data

### Rollback Plan
```typescript
// Feature flag for emergency rollback
const ENABLE_AI_CACHE = process.env.ENABLE_AI_CACHE !== 'false';

export async function getCachedResult<T>(
  service: AICacheServiceType,
  input: any,
  fetchFn: () => Promise<T>
): Promise<T> {
  if (!ENABLE_AI_CACHE) {
    // Bypass cache
    return fetchFn();
  }

  return AIResponseCache.get(service, input, fetchFn);
}
```

---

## Summary

### Quick Wins (High Impact, Low Effort)
1. **Increase GPT-4 Vision TTL to 7 days** → +$50/month
2. **Implement cache warming for top 20 damage types** → +$30/month
3. **Normalize text inputs (lowercase, trim)** → +5% hit rate

### Medium-term Optimizations
1. **Right-size cache by service** (prioritize expensive ops)
2. **Monitor and tune TTLs based on reuse patterns**
3. **Implement tiered caching (in-memory + Redis + CDN)**

### Long-term Strategy
1. **Machine learning for cache hit prediction**
2. **Proactive cache warming based on user patterns**
3. **Dynamic TTL adjustment based on usage**

---

**Last Updated**: 2025-12-21
**Cache Version**: 1.0.0
**Next Review**: After 1 month of production data
