# 🐛 AI Services Bug Report - Mintenance Platform

**Generated:** December 13, 2024
**Scope:** All AI-related services in web and mobile apps
**Severity Distribution:** 3 CRITICAL, 5 HIGH, 4 MEDIUM

---

## 🔴 CRITICAL BUGS (Requires Immediate Fix)

### 1. **Mock Embedding API in Production**
**File:** `apps/web/app/api/ai/generate-embedding/route.ts`
**Line:** 22-26
**Severity:** CRITICAL
**Impact:** AI search completely broken in production

**Bug:**
```typescript
// For now, return a mock embedding
// In production, this would call OpenAI's API
const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());
```

**Problem:**
- Returns random numbers instead of real embeddings
- Breaks semantic search functionality
- AI search returns random/incorrect results
- No actual OpenAI API integration despite having API key

**Fix Required:**
```typescript
// Implement real OpenAI embedding generation
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API key not configured');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.embeddings.create({
  model: model || 'text-embedding-3-small',
  input: text.trim(),
});

return NextResponse.json({
  embedding: response.data[0].embedding,
  model,
});
```

**Impact if not fixed:**
- Search results are completely random
- Users get irrelevant job/contractor matches
- Wasted API calls to search with meaningless embeddings

---

### 2. **Missing API Key Validation in RealAIAnalysisService**
**File:** `apps/mobile/src/services/RealAIAnalysisService.ts`
**Lines:** 14-24, 41-43
**Severity:** CRITICAL
**Impact:** Runtime crashes, undefined behavior

**Bug:**
```typescript
private static get OPENAI_API_KEY() {
  return aiConfig.openai.apiKey; // Can be undefined/null
}

// Later used without validation:
if (this.OPENAI_API_KEY && job.photos && job.photos.length > 0) {
  return await this.analyzeWithOpenAI(job); // Crashes if key is empty string
}
```

**Problems:**
1. No validation that API key is non-empty
2. Empty string `""` passes the truthy check but fails API calls
3. No error handling for invalid/expired keys
4. API call proceeds with invalid credentials

**Fix Required:**
```typescript
private static isValidApiKey(key: string | undefined | null): boolean {
  return typeof key === 'string' && key.trim().length > 0 && key !== 'undefined';
}

private static get OPENAI_API_KEY() {
  const key = aiConfig.openai.apiKey;
  return this.isValidApiKey(key) ? key : null;
}

// Usage:
if (this.OPENAI_API_KEY && job.photos && job.photos.length > 0) {
  try {
    return await this.analyzeWithOpenAI(job);
  } catch (error) {
    if (error.status === 401) {
      logger.error('Invalid OpenAI API key');
    }
    throw error;
  }
}
```

---

### 3. **Unhandled Promise Rejections in ImageAnalysisService**
**File:** `apps/web/lib/services/ImageAnalysisService.ts`
**Lines:** 182-187
**Severity:** CRITICAL
**Impact:** Server crashes, unhandled rejections

**Bug:**
```typescript
const [labelResult] = await client.labelDetection({ ... });
const objectLocalizationResult = client.objectLocalization
  ? await client.objectLocalization({ ... })
  : null;
const [textResult] = await client.textDetection({ ... });
```

**Problems:**
1. No try-catch around individual API calls
2. If one call fails, others aren't attempted
3. Promise rejections can crash the Node.js process
4. Partial results are lost

**Fix Required:**
```typescript
// Wrap each API call individually
const labelResult = await client.labelDetection({ ... })
  .catch(err => {
    logger.warn('Label detection failed', { imageUrl, error: err });
    return [{ labelAnnotations: [] }];
  });

const objectResult = client.objectLocalization
  ? await client.objectLocalization({ ... })
      .catch(err => {
        logger.warn('Object localization failed', { imageUrl, error: err });
        return [{ localizedObjectAnnotations: [] }];
      })
  : null;

const textResult = await client.textDetection({ ... })
  .catch(err => {
    logger.warn('Text detection failed', { imageUrl, error: err });
    return [{ textAnnotations: [] }];
  });
```

---

## 🟠 HIGH SEVERITY BUGS

### 4. **SQL Injection Risk in Search Analytics**
**File:** `apps/web/app/api/ai/search/route.ts`
**Lines:** 277-294
**Severity:** HIGH
**Impact:** Potential data breach, SQL injection

**Bug:**
```typescript
async function logSearchAnalytics(analytics: Record<string, unknown>) {
  await serverSupabase
    .from('search_analytics')
    .insert({
      query: analytics.query, // User input, not sanitized
      filters: analytics.filters, // Object, not sanitized
    });
}
```

**Problems:**
1. Raw user query inserted into database
2. Filters object can contain malicious payloads
3. No input sanitization before database insert
4. JSONB injection possible via filters

**Fix Required:**
```typescript
import { sanitizeText } from '@/lib/security/sanitization';

async function logSearchAnalytics(analytics: Record<string, unknown>) {
  const safeQuery = typeof analytics.query === 'string'
    ? sanitizeText(analytics.query, 500)
    : '';

  const safeFilters = typeof analytics.filters === 'object' && analytics.filters !== null
    ? Object.entries(analytics.filters).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = sanitizeText(value, 200);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>)
    : {};

  await serverSupabase
    .from('search_analytics')
    .insert({
      query: safeQuery,
      results_count: Number(analytics.resultsCount) || 0,
      click_through_rate: Number(analytics.clickThroughRate) || 0,
      average_relevance_score: Number(analytics.averageRelevanceScore) || 0,
      search_time: Number(analytics.searchTime) || 0,
      filters: safeFilters,
      created_at: new Date().toISOString(),
    });
}
```

---

### 5. **Memory Leak in ImageAnalysisService Cache**
**File:** `apps/web/lib/services/ImageAnalysisService.ts`
**Lines:** 39-40, 114-127
**Severity:** HIGH
**Impact:** Memory exhaustion, server crashes

**Bug:**
```typescript
private static cache: Map<string, CacheEntry> = new Map();
private static readonly MAX_CACHE_SIZE = 100;

private static setCachedResult(cacheKey: string, result: ImageAnalysisResult): void {
  if (this.cache.size >= this.MAX_CACHE_SIZE) {
    const oldestKey = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    this.cache.delete(oldestKey);
  }
  // ... cache set
}
```

**Problems:**
1. In-memory cache in static class persists forever
2. No automatic cleanup of expired entries
3. Cache grows to 100 entries and stays there
4. Each entry can be large (images analysis results)
5. Sorting entire cache on every insert is O(n log n)

**Fix Required:**
```typescript
// Use LRU cache with automatic eviction
import LRU from 'lru-cache';

private static cache = new LRU<string, ImageAnalysisResult>({
  max: 100,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  updateAgeOnGet: true, // LRU behavior
  dispose: (value, key) => {
    logger.debug('Evicting cache entry', { key });
  },
});

private static getCachedResult(cacheKey: string): ImageAnalysisResult | null {
  return this.cache.get(cacheKey) || null;
}

private static setCachedResult(cacheKey: string, result: ImageAnalysisResult): void {
  this.cache.set(cacheKey, result);
}
```

**Alternative (no dependency):**
```typescript
// Add periodic cleanup
private static lastCleanup = Date.now();
private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

private static cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - this.lastCleanup < this.CLEANUP_INTERVAL) {
    return;
  }

  for (const [key, entry] of this.cache.entries()) {
    if (now > entry.expiresAt) {
      this.cache.delete(key);
    }
  }
  this.lastCleanup = now;
}

private static getCachedResult(cacheKey: string): ImageAnalysisResult | null {
  this.cleanupExpiredEntries(); // Clean on every get
  // ... rest of method
}
```

---

### 6. **Missing Timeout Handling in OpenAI Calls**
**File:** `apps/mobile/src/services/RealAIAnalysisService.ts`
**Lines:** 76-150 (analyzeWithOpenAI method)
**Severity:** HIGH
**Impact:** Hanging requests, poor UX

**Problem:**
- No timeout on OpenAI API calls
- Slow/hanging requests block the UI
- No retry logic for transient failures
- Mobile users on slow connections suffer

**Fix Required:**
```typescript
private static async analyzeWithOpenAI(job: Job): Promise<AIAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [/* ... */],
        max_tokens: 1000,
      }),
      signal: controller.signal, // Add timeout
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status >= 500) {
        throw new Error('OpenAI service unavailable');
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // ... parse response
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      logger.error('OpenAI API timeout after 30s');
      throw new Error('AI analysis timed out');
    }
    throw error;
  }
}
```

---

### 7. **No Rate Limiting Protection**
**File:** `apps/web/app/api/ai/generate-embedding/route.ts`, `apps/web/app/api/ai/search/route.ts`
**Severity:** HIGH
**Impact:** API cost explosion, denial of service

**Problem:**
- No rate limiting on AI endpoints
- Users can spam expensive OpenAI API calls
- No cost tracking or budgets
- Potential for $1000s in API bills

**Fix Required:**
```typescript
import { rateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    await requireCSRF(request);

    // Rate limiting: 10 requests per minute per user
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success, remaining } = await rateLimit({
      identifier,
      limit: 10,
      window: 60, // 60 seconds
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(remaining),
            'Retry-After': '60',
          }
        }
      );
    }

    // ... rest of endpoint
  } catch (error) {
    // ... error handling
  }
}
```

---

### 8. **Console.log in Production Code**
**File:** Multiple files in building-surveyor services
**Severity:** HIGH
**Impact:** Performance, security (leak sensitive data)

**Bug:**
```typescript
// Found in multiple AI services
console.log('Processing image:', imageUrl);
console.log('API response:', response);
console.error('Error:', error);
```

**Problems:**
1. Performance overhead in production
2. Can log sensitive data (API keys, user info)
3. Not structured or searchable
4. No log levels or filtering

**Fix:**
```typescript
// Replace ALL console.log with logger
import { logger } from '@mintenance/shared';

// Instead of:
console.log('Processing image:', imageUrl);

// Use:
logger.debug('Processing image', { imageUrl });

// Instead of:
console.error('Error:', error);

// Use:
logger.error('Operation failed', error, {
  context: 'additional metadata',
});
```

---

## 🟡 MEDIUM SEVERITY BUGS

### 9. **Type Safety Issues in AIMatchingService**
**File:** `apps/web/lib/services/AIMatchingService.ts`
**Severity:** MEDIUM
**Impact:** Runtime type errors

**Problems:**
- Missing null checks on optional properties
- Type assertions without validation
- Unsafe array access

**Fix:** Add proper type guards and null checks

---

### 10. **Missing Input Validation in Search Filters**
**File:** `apps/web/app/api/ai/search/route.ts`
**Lines:** 237-269
**Severity:** MEDIUM
**Impact:** Invalid queries, poor UX

**Fix:**
```typescript
// Validate filters before using
const validateFilters = (filters: unknown): SearchFilters => {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  const validated: SearchFilters = {};

  if ('location' in filters && typeof filters.location === 'string') {
    validated.location = filters.location.substring(0, 100);
  }

  if ('category' in filters && typeof filters.category === 'string') {
    validated.category = filters.category.substring(0, 50);
  }

  // ... validate other fields

  return validated;
};
```

---

### 11. **Race Condition in BuildingSurveyorService**
**File:** Building surveyor services
**Severity:** MEDIUM
**Impact:** Incorrect results, data corruption

**Problem:**
- Multiple concurrent assessments can overwrite each other
- No locking mechanism
- Shared state without synchronization

**Fix:** Implement proper async locking or queue

---

### 12. **Division by Zero in DriftMonitorService**
**File:** Drift monitoring service
**Severity:** MEDIUM
**Impact:** NaN results, calculation errors

**Fix:**
```typescript
const avgScore = count > 0 ? sum / count : 0;
```

---

## 📊 Summary Statistics

| Severity | Count | Files Affected |
|----------|-------|----------------|
| CRITICAL | 3 | 3 |
| HIGH | 5 | 4 |
| MEDIUM | 4 | 3 |
| **TOTAL** | **12** | **10** |

---

## 🎯 Priority Fix Order

1. **CRITICAL - Mock Embedding API** (Blocks all AI search)
2. **CRITICAL - API Key Validation** (Causes crashes)
3. **CRITICAL - Unhandled Promise Rejections** (Server stability)
4. **HIGH - SQL Injection** (Security)
5. **HIGH - Memory Leak** (Server stability)
6. **HIGH - Missing Timeout** (UX)
7. **HIGH - Rate Limiting** (Cost control)
8. **HIGH - Console.log** (Performance/Security)
9. **MEDIUM - Type Safety** (Code quality)
10. **MEDIUM - Input Validation** (UX)
11. **MEDIUM - Race Condition** (Data integrity)
12. **MEDIUM - Division by Zero** (Calculation errors)

---

## 🔧 Quick Fixes Available

Some bugs can be fixed immediately:

```bash
# 1. Replace console.log with logger
find apps/ -name "*.ts" -exec sed -i 's/console\.log/logger.debug/g' {} +
find apps/ -name "*.ts" -exec sed -i 's/console\.error/logger.error/g' {} +
find apps/ -name "*.ts" -exec sed -i 's/console\.warn/logger.warn/g' {} +

# 2. Add division by zero protection
# (Manual review and fix required)
```

---

## 📞 Recommended Actions

1. **Immediate:**
   - Fix mock embedding API (1-2 hours)
   - Add API key validation (30 mins)
   - Add promise rejection handlers (1 hour)

2. **This Week:**
   - Implement rate limiting (2 hours)
   - Fix memory leak (1 hour)
   - Add timeouts (1 hour)
   - Sanitize SQL inputs (2 hours)

3. **This Sprint:**
   - Replace console.log (1 hour)
   - Fix type safety issues (3 hours)
   - Add input validation (2 hours)
   - Fix race conditions (4 hours)

**Total Estimated Fix Time:** 17.5 hours

---

## ✅ Testing Requirements

After fixes, test:

1. ✅ AI search returns relevant results
2. ✅ Invalid API keys handled gracefully
3. ✅ Image analysis doesn't crash on API errors
4. ✅ Rate limiting works (hit 429 after 10 requests)
5. ✅ Memory usage stable over time
6. ✅ Timeouts trigger after 30 seconds
7. ✅ No SQL injection via search filters
8. ✅ No console.log in production builds

---

**Report Status:** READY FOR REVIEW
**Action Required:** Prioritize and assign fixes to development team

