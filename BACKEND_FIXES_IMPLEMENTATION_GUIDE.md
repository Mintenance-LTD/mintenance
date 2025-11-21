# 🔧 Backend Fixes Implementation Guide

**Priority**: HIGH  
**Estimated Time**: 2-3 hours  
**Impact**: Production stability & security

---

## 🎯 Quick Wins (Do These First)

### 1. Centralize Environment Variable Validation

**File**: `apps/web/lib/env.ts`

**Current Issue**: AI keys (OPENAI_API_KEY, ROBOFLOW_*) are not validated at startup

**Fix**:

```typescript
// apps/web/lib/env.ts
// Add these to the envSchema (around line 76):

const envSchema = z.object({
  // ... existing fields ...

  // AI Service Configuration (REQUIRED for AI features)
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required for AI assessment features')
    .startsWith('sk-', 'OPENAI_API_KEY must start with sk-')
    .optional()
    .describe('OpenAI API key for GPT-4 Vision and embeddings (server-side only)'),

  // Roboflow Configuration (OPTIONAL but recommended)
  ROBOFLOW_API_KEY: z
    .string()
    .optional()
    .describe('Roboflow API key for building damage detection'),

  ROBOFLOW_MODEL_ID: z
    .string()
    .default('building-defect-detection-7-ks0im')
    .describe('Roboflow model ID'),

  ROBOFLOW_MODEL_VERSION: z
    .string()
    .default('1')
    .describe('Roboflow model version'),

  ROBOFLOW_TIMEOUT_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default('10000')
    .describe('Roboflow API timeout in milliseconds'),

  // Google Maps (REQUIRED for location features)
  GOOGLE_MAPS_API_KEY: z
    .string()
    .optional()
    .describe('Google Maps API key for geocoding and map display'),

  // AWS Configuration (OPTIONAL)
  AWS_ACCESS_KEY_ID: z.string().optional().describe('AWS access key for Rekognition'),
  AWS_SECRET_ACCESS_KEY: z.string().optional().describe('AWS secret key'),
  AWS_REGION: z.string().default('us-east-1').optional().describe('AWS region'),

  // Google Cloud (OPTIONAL)
  GOOGLE_CLOUD_API_KEY: z.string().optional().describe('Google Cloud API key for Vision API'),
});
```

**Then update the validation logic** (around line 90):

```typescript
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional runtime checks
    if (parsed.NODE_ENV === 'production') {
      // In production, ensure we're using live keys
      if (parsed.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        logger.warn('Using Stripe test key in production', {
          service: 'env-validation',
        });
      }

      // Ensure Redis is configured in production
      if (!parsed.UPSTASH_REDIS_REST_URL || !parsed.UPSTASH_REDIS_REST_TOKEN) {
        logger.error('Redis is REQUIRED in production for rate limiting', {
          service: 'env-validation',
        });
        throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production');
      }

      // Warn if AI features are disabled in production
      if (!parsed.OPENAI_API_KEY) {
        logger.warn('AI assessment features will be disabled - OPENAI_API_KEY not configured', {
          service: 'env-validation',
        });
      }

      if (!parsed.GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps features may be limited - GOOGLE_MAPS_API_KEY not configured', {
          service: 'env-validation',
        });
      }
    }

    return parsed;
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Update error message** (around line 125):

```typescript
'Required variables:',
'  - JWT_SECRET (min 64 characters)',
'  - NEXT_PUBLIC_SUPABASE_URL (valid URL)',
'  - SUPABASE_SERVICE_ROLE_KEY',
'  - STRIPE_SECRET_KEY (must start with sk_test_ or sk_live_)',
'  - STRIPE_WEBHOOK_SECRET (must start with whsec_)',
'  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (must start with pk_test_ or pk_live_)',
'',
'Production-only required variables:',
'  - UPSTASH_REDIS_REST_URL',
'  - UPSTASH_REDIS_REST_TOKEN',
'',
'Recommended variables:',
'  - OPENAI_API_KEY (for AI features)',
'  - ROBOFLOW_API_KEY (for damage detection)',
'  - GOOGLE_MAPS_API_KEY (for location services)',
''
```

---

### 2. Update .env.example

**File**: `.env.example`

**Add clear sections** for the new variables:

```bash
# =============================================================================
# AI SERVICE CONFIGURATION (SERVER-SIDE ONLY - NEVER EXPOSE TO CLIENT)
# =============================================================================

# OpenAI API Key (for GPT-4 Vision job analysis and embeddings)
# Get from: https://platform.openai.com/api-keys
# SECURITY: This MUST be server-side only, never expose to mobile/web clients
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Roboflow Configuration (for building damage detection)
# Get from: https://app.roboflow.com
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_ID=building-defect-detection-7-ks0im
ROBOFLOW_MODEL_VERSION=1
ROBOFLOW_TIMEOUT_MS=10000

# Google Maps API Key (for geocoding and location services)
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# AWS Credentials (optional - for Rekognition image analysis)
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_REGION=us-east-1

# Google Cloud API Key (optional - for Vision API)
# GOOGLE_CLOUD_API_KEY=your-google-cloud-key

# =============================================================================
# REDIS CONFIGURATION (REQUIRED IN PRODUCTION)
# =============================================================================

# Upstash Redis (for rate limiting and caching)
# Get from: https://console.upstash.com/redis
# PRODUCTION REQUIREMENT: Must be configured for rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

---

### 3. Increase Timeout for AI Endpoints

**File**: `vercel.json`

**Update the functions configuration**:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    },
    "app/api/building-surveyor/**/*.ts": {
      "memory": 2048,
      "maxDuration": 60
    },
    "app/api/ai/**/*.ts": {
      "memory": 2048,
      "maxDuration": 60
    }
  }
}
```

---

### 4. Update Building Surveyor Config

**File**: `apps/web/lib/services/building-surveyor/config/BuildingSurveyorConfig.ts`

**Replace process.env usage** with env import:

```typescript
import { env, isDevelopment } from '../../../env';

// Around line 52, replace:
// openaiApiKey: process.env.OPENAI_API_KEY,

// With:
openaiApiKey: env.OPENAI_API_KEY,

// And add validation:
if (!config.openaiApiKey && !isDevelopment()) {
  logger.warn('OpenAI API key not configured - AI features will be disabled', {
    service: 'BuildingSurveyorConfig',
  });
}
```

---

### 5. Add Health Check Endpoint

**New File**: `apps/web/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring
 * Returns service status and configuration check
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.2.4',
    environment: env.NODE_ENV,
    services: {
      database: checkDatabase(),
      redis: checkRedis(),
      ai: checkAI(),
      payments: checkPayments(),
    },
  };

  const allHealthy = Object.values(health.services).every((s) => s.status === 'ok');

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
  });
}

function checkDatabase() {
  return {
    status: env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'error',
    message: env.SUPABASE_SERVICE_ROLE_KEY ? 'Connected' : 'Not configured',
  };
}

function checkRedis() {
  const hasRedis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN;
  return {
    status: hasRedis ? 'ok' : 'warning',
    message: hasRedis ? 'Connected' : 'Not configured (rate limiting degraded)',
  };
}

function checkAI() {
  const hasOpenAI = !!env.OPENAI_API_KEY;
  return {
    status: hasOpenAI ? 'ok' : 'warning',
    message: hasOpenAI ? 'Configured' : 'Not configured (AI features disabled)',
  };
}

function checkPayments() {
  const hasStripe = env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET;
  return {
    status: hasStripe ? 'ok' : 'error',
    message: hasStripe ? 'Configured' : 'Not configured',
  };
}
```

---

### 6. Standardize Error Responses

**New File**: `apps/web/lib/utils/api-response.ts`

```typescript
import { NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';

export interface StandardErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

export interface StandardSuccessResponse<T> {
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  message: string,
  code: string,
  status: number = 500,
  details?: any,
  requestId?: string
): NextResponse<StandardErrorResponse> {
  const response: StandardErrorResponse = {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  logger.error('API Error', { message, code, status, details, requestId });

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<StandardSuccessResponse<T>> {
  const response: StandardSuccessResponse<T> = {
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return NextResponse.json(response, { status });
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Processing
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // AI Services
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;
```

**Example Usage** in an API route:

```typescript
import { errorResponse, successResponse, ErrorCodes } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const data = await processRequest();
    return successResponse(data, 200, request.headers.get('x-request-id') || undefined);
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(
        'Validation failed',
        ErrorCodes.VALIDATION_ERROR,
        400,
        error.details,
        request.headers.get('x-request-id') || undefined
      );
    }

    return errorResponse(
      'Internal server error',
      ErrorCodes.INTERNAL_ERROR,
      500,
      undefined,
      request.headers.get('x-request-id') || undefined
    );
  }
}
```

---

## 📋 Testing Checklist

After implementing the fixes:

### 1. Environment Validation
```bash
# Test with missing variables
npm run build

# Should fail gracefully with clear error messages
# Test with all variables
npm run build

# Should succeed
```

### 2. API Endpoints
```bash
# Test health check
curl http://localhost:3000/api/health

# Should return service status
```

### 3. AI Services
```bash
# Test building surveyor (if OPENAI_API_KEY configured)
# Upload an image to /api/building-surveyor/demo

# Should process successfully or return clear error
```

### 4. Redis Check
```bash
# If Redis not configured in dev, should log warning but continue
# In production, should fail fast
```

---

## 🚀 Deployment Steps

1. **Update Environment Variables** in Vercel:
   ```bash
   # Add new variables
   OPENAI_API_KEY=sk-...
   ROBOFLOW_API_KEY=...
   GOOGLE_MAPS_API_KEY=...
   
   # Verify existing
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

3. **Verify Health Check**:
   ```bash
   curl https://your-domain.com/api/health
   ```

4. **Monitor Logs** for any startup errors

---

## 📊 Expected Results

### Before:
- ❌ Runtime errors when AI keys missing
- ❌ No validation for critical keys
- ⚠️ Inconsistent error responses
- ⚠️ AI endpoints timeout on large images

### After:
- ✅ Startup validation catches missing keys
- ✅ Clear error messages guide configuration
- ✅ Standardized error responses
- ✅ Appropriate timeouts for AI processing
- ✅ Health check for monitoring

---

## ⏱️ Time Estimate

| Task | Time |
|------|------|
| 1. Env validation update | 30 min |
| 2. .env.example update | 10 min |
| 3. Vercel.json update | 5 min |
| 4. Config file updates | 20 min |
| 5. Health check endpoint | 20 min |
| 6. Error response standardization | 30 min |
| Testing | 30 min |
| **Total** | **~2.5 hours** |

---

## 🆘 Troubleshooting

### Issue: Build fails with "JWT_SECRET must be at least 64 characters"
**Solution**: Generate a new secret:
```bash
openssl rand -base64 64
```

### Issue: Redis errors in development
**Solution**: Redis is optional in development. Warnings are expected.

### Issue: AI endpoints still timeout
**Solution**: 
1. Verify vercel.json deployed correctly
2. Check image size (compress large images)
3. Monitor Vercel function logs

### Issue: Health check returns 503
**Solution**: Check which service is failing and verify corresponding env var

---

## ✅ Success Criteria

- [ ] All environment variables validated at startup
- [ ] Production requires Redis configuration
- [ ] AI endpoints have 60s timeout
- [ ] Health check endpoint accessible
- [ ] Error responses follow standard format
- [ ] No runtime errors for missing configuration
- [ ] Clear warnings in logs for optional services

---

**Implementation Guide Version**: 1.0  
**Last Updated**: 2025-11-20
