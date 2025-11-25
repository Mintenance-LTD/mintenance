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
- **Header parsing**: Extracts rate limit info from OpenAI response headers
- **Exponential backoff**: Retries with increasing delays (2s, 4s, 8s, 16s, 32s, max 60s)
- **Retry logic**: Automatically retries on 429 errors with proper delays
- **Configurable**: Supports custom retry configurations

### 2. Updated Batch Script (`scripts/run-shadow-mode-batch.ts`)
- **Configurable delays**: Default 2 seconds between requests (configurable via CLI arg)
- **Retry logic**: Exponential backoff retry on rate limit errors (up to 5 retries by default)
- **Better error handling**: Distinguishes rate limit errors from other errors
- **Usage**: 
  ```bash
  # Default: 2 second delay, 5 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv
  
  # Custom: 3 second delay, 5 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 3000
  
  # Custom: 3 second delay, 10 retries
  npx tsx scripts/run-shadow-mode-batch.ts training-data/labels.csv 3000 10
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
# Process with 3 second delay between images
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth.csv 3000

# Process with 5 second delay and 10 retry attempts
npx tsx scripts/run-shadow-mode-batch.ts training-data/ground-truth.csv 5000 10
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

## Related Files
- `apps/web/lib/utils/openai-rate-limit.ts` - Rate limit utility
- `scripts/run-shadow-mode-batch.ts` - Batch processing script
- `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts` - Main service
- `apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts` - Orchestrator

