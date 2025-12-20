# OpenAI Rate Limit 429 Error - Solution

## Problem
When running batch processing scripts (e.g., `run-shadow-mode-batch.ts`), hundreds of images are processed sequentially, causing OpenAI API rate limit errors (429). The original implementation had:

- Only 100ms delay between requests (too fast)
- No retry logic for rate limit errors
- No parsing of OpenAI rate limit headers

## Root Cause
1. **Too-fast requests**: 100ms delay between images is insufficient for OpenAI's rate limits
2. **No retry logic**: Rate limit errors caused immediate failure instead of automatic retry
3. **No header parsing**: Rate limit information from OpenAI headers was ignored

## Solution Implemented

### 1. Created Rate Limit Utility (`apps/web/lib/utils/openai-rate-limit.ts`)
- **Header parsing**: Extracts rate limit info from OpenAI response headers with validation
- **Exponential backoff**: Retries with increasing delays (2s, 4s, 8s, 16s, 32s, max 60s for general use)
- **Batch processing config**: Optimized config for batch jobs (20s base, 10 retries, 5min max delay)
- **Retry metrics tracking**: Tracks retry rates, average retries, and success/failure rates
- **Retry logic**: Automatically retries on 429 errors with proper delays
- **Configurable**: Supports custom retry configurations
- **Rate limit header preference**: Uses `retry-after` header when available for optimal timing

### 2. Updated Batch Script (`scripts/run-shadow-mode-batch.ts`)
- **Optimized defaults**: Default 20 seconds between requests, 10 retries (optimized for batch processing)
- **Retry metrics tracking**: Tracks retry rates, average retries per request, and total retries
- **Adaptive delay suggestions**: Automatically suggests increasing delays when retry rate > 50%
- **Retry logic**: Exponential backoff retry on rate limit errors
- **Better error handling**: Distinguishes rate limit errors from other errors
- **Usage**: 
  ```bash
  # Default: 20 second delay, 10 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv
  
  # Custom: 30 second delay, 10 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 30000
  
  # Custom: 30 second delay, 20 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 30000 20
  ```

### 3. Updated Services
- **BuildingSurveyorService**: Uses `fetchWithOpenAIRetry` for automatic retry handling
- **AssessmentOrchestrator**: Uses `fetchWithOpenAIRetry` for automatic retry handling

## How It Works

### Retry Logic Flow
1. Attempt API request
2. If 429 error received:
   - Parse rate limit headers (if available)
   - Calculate delay (use `retry-after` header if available, otherwise exponential backoff)
   - Wait for calculated delay
   - Retry request
3. Repeat up to max retries (default: 5)
4. If all retries fail, throw error

### Exponential Backoff Formula
```
delay = min(baseDelayMs * (backoffMultiplier ^ attempt), maxDelayMs)
```

Example with defaults:
- Attempt 1: 2000ms (2 seconds)
- Attempt 2: 4000ms (4 seconds)
- Attempt 3: 8000ms (8 seconds)
- Attempt 4: 16000ms (16 seconds)
- Attempt 5: 32000ms (32 seconds)
- Max: 60000ms (60 seconds)

## Usage Examples

### Batch Script with Rate Limit Handling
```bash
# Process with default settings (20 second delay, 10 retries)
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth.csv

# Process with 30 second delay between images (10 retries default)
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth.csv 50 30000

# Process with 30 second delay and 20 retry attempts
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth.csv 50 30000 20
```

### Using the Utility in Code
```typescript
import { fetchWithOpenAIRetry } from '@/lib/utils/openai-rate-limit';

const response = await fetchWithOpenAIRetry(
  'https://api.openai.com/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  },
  {
    maxAttempts: 5,      // Max retry attempts
    baseDelayMs: 2000,   // Initial delay (2 seconds)
    maxDelayMs: 60000,   // Maximum delay (60 seconds)
    backoffMultiplier: 2 // Exponential multiplier
  }
);
```

## Testing

To verify the fix:
1. Run batch script with a large CSV file
2. Monitor logs for retry messages when rate limits are hit
3. Confirm successful completion despite rate limit errors

## What Worked
✅ Exponential backoff retry logic  
✅ Configurable delays between requests  
✅ Rate limit header parsing  
✅ Automatic retry on 429 errors  
✅ Better error messages and logging  

## What Didn't Work (Initial Attempts)
❌ Fixed delays - too rigid for varying rate limit windows  
❌ No retry logic - immediate failure on first rate limit  
❌ Too fast processing - 100ms delays overwhelmed API  

## Critical Issue: 100% Failure Rate

### Problem
When running batch processing with 0% success rate, all images fail even with retries configured. This happens because:

1. **Double Retry Layer Issue**: `fetchWithOpenAIRetry` already retries 5 times internally. When those retries exhaust, the error bubbles up to the script level. The script's retry logic should catch it, but:
   - Rate limit info wasn't being preserved through the error chain
   - Error detection wasn't catching all rate limit error patterns
   - Retry delays weren't using the configured `delayMs` parameter

2. **Rate Limit Info Loss**: When `withOpenAIRetry` re-throws errors, it was creating new Error objects, losing the `rateLimitInfo` property that contains `retry-after` header information.

3. **Insufficient Delays**: Even with 20-second delays between requests, if OpenAI has stricter limits (e.g., 3 requests/minute for free tier), you'll still hit rate limits.

### Solution Applied

1. **Preserve Rate Limit Info**: Modified `withOpenAIRetry` to preserve the original error object and its `rateLimitInfo` property when re-throwing.

2. **Better Error Detection**: Enhanced the script's rate limit detection to catch more error patterns:
   - Checks for "429", "rate limit", "too many requests"
   - Checks for `rateLimitInfo` property
   - Checks for `status === 429`
   - More permissive pattern matching

3. **Use Configurable Delays**: The script now uses the `delayMs` parameter (e.g., 20000ms) as the base delay for retry exponential backoff, not a hardcoded 2 seconds.

4. **Longer Max Delays**: Increased max retry delay from 60 seconds to 5 minutes (300000ms) to handle longer rate limit windows.

5. **Better Logging**: Added detailed error logging on first attempt to help diagnose issues.

### If Still Failing

If you're still getting 100% failure rate after these fixes, check:

1. **OpenAI Account Limits**: Check your OpenAI account tier:
   - Free tier: 3 requests/minute, 200 requests/day
   - Tier 1: 500 requests/minute
   - Tier 2: 5000 requests/minute
   
   If you've hit your daily limit, wait 24 hours or upgrade your account.

2. **Check Actual Error Messages**: Look at the error logs to see if errors are actually rate limits or something else (invalid URLs, network errors, etc.).

3. **Increase Delays Further**: Try even longer delays:
   ```bash
   # 30 second delays, 30 retries
   npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth-labels.csv 5 30000 30
   ```

4. **Process in Smaller Batches**: Process fewer images at a time and wait between batches.

## New Features (Latest Update)

### Retry Metrics Tracking
The rate limit utility now tracks comprehensive retry metrics:
- **Total requests**: Number of API requests made
- **Total retries**: Number of retry attempts across all requests
- **Requests with retries**: Number of requests that required at least one retry
- **Retry rate**: Percentage of requests that required retries
- **Average retries per request**: Mean number of retries per request
- **Average retry delay**: Mean delay time for retries
- **Success/failure after retry**: Tracks outcomes after retries

Access metrics:
```typescript
import { getRetryMetrics, resetRetryMetrics } from '@/lib/utils/openai-rate-limit';

// Get current metrics
const metrics = getRetryMetrics();
console.log(`Retry rate: ${metrics.retryRate}%`);
console.log(`Average retries: ${metrics.averageRetriesPerRequest}`);

// Reset metrics (useful for batch processing)
resetRetryMetrics();
```

### Batch Processing Optimizations
- **Default delays**: Changed from 2s to 20s for batch processing
- **Default retries**: Changed from 5 to 10 retries for batch processing
- **Batch config**: `BATCH_PROCESSING_RETRY_CONFIG` with optimized settings:
  - `maxAttempts: 10`
  - `baseDelayMs: 20000` (20 seconds)
  - `maxDelayMs: 300000` (5 minutes)
  - `backoffMultiplier: 2`

### Adaptive Delay Suggestions
The batch script now automatically suggests increasing delays when retry rate exceeds 50%:
```
⚠️  WARNING: Retry rate is 65.50% (above 50%)
💡 Suggestion: Increase delay to 30000ms to reduce rate limits
   Example: npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 50 30000 10
```

### Enhanced Header Parsing
- **Validation**: All parsed header values are validated (positive numbers, reasonable timestamps)
- **Debug logging**: Parsed headers are logged at debug level for troubleshooting
- **Edge case handling**: Handles negative values, invalid timestamps, and missing headers gracefully
- **Minimum delay**: Ensures delays never go below 1 second

### Progress Reports
Batch progress reports now include retry metrics:
```
📊 BATCH 2/199 COMPLETE
================================================================================
   Batch Range:      11 - 20 (10 images)
   Overall Progress: 20/1981 (1.0%)
   Successful:       18
   Failed:           2
   Success Rate:     90.00%
   Retry Rate:       35.00%
   Avg Retries/Req:  0.45
   Total Retries:    9
   Elapsed Time:     3m 20s
   Avg Time/Image:   10.01s
   Est. Remaining:   5h 27m 0s
================================================================================
```

## Monitoring Retry Rates

### Checking Retry Metrics in Code
```typescript
import { getRetryMetrics, shouldIncreaseBaseDelay } from '@/lib/utils/openai-rate-limit';

const metrics = getRetryMetrics();

// Check if delays should be increased
if (shouldIncreaseBaseDelay(metrics)) {
  console.log(`Retry rate is ${metrics.retryRate}% - consider increasing delays`);
}

// Access detailed metrics
console.log({
  totalRequests: metrics.totalRequests,
  totalRetries: metrics.totalRetries,
  retryRate: metrics.retryRate,
  averageRetriesPerRequest: metrics.averageRetriesPerRequest,
  averageRetryDelayMs: metrics.averageRetryDelayMs,
});
```

### Interpreting Retry Metrics
- **Retry rate < 10%**: Excellent - delays are appropriate
- **Retry rate 10-50%**: Good - occasional rate limits, but manageable
- **Retry rate > 50%**: Warning - delays should be increased
- **Retry rate > 80%**: Critical - delays are too short, many requests are hitting limits

## Related Files
- `apps/web/lib/utils/openai-rate-limit.ts` - Rate limit utility with metrics tracking
- `scripts/run-shadow-mode-batch.ts` - Batch processing script with retry tracking
- `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts` - Main service
- `apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts` - Orchestrator

