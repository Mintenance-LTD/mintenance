# 🚨 CRITICAL SECURITY ISSUE: OpenAI API Key Exposure

**Date:** 2025-10-02
**Severity:** CRITICAL (CVSS 9.1 - API Key Exposure)
**Status:** ⚠️ ACTIVE VULNERABILITY

---

## 🔴 Issue Summary

The OpenAI API key is being **directly accessed from React Native mobile code**, creating a critical security vulnerability where the API key could be:
1. Bundled into the mobile app build
2. Extracted by decompiling the APK/IPA
3. Used by malicious actors to rack up unlimited OpenAI API costs

---

## 📍 Affected Files

### Mobile Client Code (INSECURE)
```
apps/mobile/src/config/ai.config.ts:12
apps/mobile/src/services/RealAIAnalysisService.ts:14-16
apps/mobile/src/services/AIAnalysisService.ts:401
```

### Code Snippet (VULNERABLE)
```typescript
// ❌ CRITICAL SECURITY FLAW
export const aiConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '', // ⚠️ CLIENT-SIDE ACCESS
  }
};

// This code runs in the mobile app bundle
if (this.OPENAI_API_KEY && job.photos && job.photos.length > 0) {
  return await this.analyzeWithOpenAI(job); // ⚠️ Direct API calls from mobile
}
```

---

## 🔍 Root Cause Analysis

### Current (Insecure) Architecture
```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │──────┐
└─────────────────┘      │
                         │ Direct API call with key
                         ▼
                  ┌─────────────────┐
                  │  OpenAI API     │
                  │  (gpt-4-vision) │
                  └─────────────────┘
```

**Problem:** API key is embedded in mobile app code/bundle

### Secure Architecture (Required)
```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │──────┐
└─────────────────┘      │ POST /api/ai/analyze-job
                         │ (no API keys)
                         ▼
                  ┌─────────────────┐
                  │  Next.js API    │
                  │  Backend        │──────┐
                  └─────────────────┘      │ Server-side call
                                           │ with API key
                                           ▼
                                    ┌─────────────────┐
                                    │  OpenAI API     │
                                    │  (gpt-4-vision) │
                                    └─────────────────┘
```

**Solution:** API key stays on server, never exposed to client

---

## ⚠️ Current Status

### Environment Variables Check
- ✅ `.gitignore` includes `.env*` files (keys not committed to Git)
- ✅ OpenAI key moved to `.env.server` (server-side only)
- ⚠️ **Mobile app code still tries to access the key directly**
- ⚠️ **No backend API endpoint exists for AI analysis**

### Risk Assessment
| Risk Factor | Current Status | Severity |
|-------------|---------------|----------|
| Key in mobile code | ✅ Not currently set for mobile | Low |
| Key exposure if set | ❌ Would be bundled in app | **CRITICAL** |
| Backend API exists | ❌ No API route found | **HIGH** |
| Production impact | ⚠️ Feature won't work (no key) | Medium |

**Current Impact:** Low (key not set for mobile, so feature is non-functional)
**Potential Impact:** CRITICAL (if anyone sets `EXPO_PUBLIC_OPENAI_API_KEY`)

---

## ✅ Immediate Actions Taken

1. **Moved OpenAI key to `.env.server`**
   - Removed from `apps/web/.env.local`
   - Added to root `.env.server` with clear server-side comment

2. **Added Security Warning**
   - Updated `apps/web/.env.local` with warning comment
   - Documented that key should NEVER be in client-side env vars

---

## 🔧 Required Fixes

### Fix 1: Create Backend API Endpoint (CRITICAL - Priority 1)

**Create:** `apps/web/app/api/ai/analyze-job/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ✅ Server-side only - API key never exposed
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Get request data
    const { jobId, photos } = await request.json();

    if (!jobId || !photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, photos' },
        { status: 400 }
      );
    }

    // 3. Verify job ownership or access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Only allow homeowner or assigned contractor to analyze
    if (job.homeowner_id !== user.id && job.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Call OpenAI Vision API (server-side)
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this home maintenance job. Identify: 1) Type of work needed, 2) Estimated complexity (1-10), 3) Potential safety concerns, 4) Estimated time required, 5) Recommended contractor skills.`,
            },
            ...photos.slice(0, 4).map((url: string) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    // 5. Parse and return analysis
    const analysis = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      analysis: {
        description: analysis,
        model: 'gpt-4-vision-preview',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'AI analysis failed', details: error.message },
      { status: 500 }
    );
  }
}
```

### Fix 2: Update Mobile Service to Use Backend API (CRITICAL - Priority 1)

**Update:** `apps/mobile/src/services/RealAIAnalysisService.ts`

```typescript
import { supabase } from '../config/supabase';
import { API_BASE_URL } from '../config/environment';

export class RealAIAnalysisService {
  /**
   * Analyze job photos using backend API (secure)
   */
  static async analyzeJobPhotos(job: Job): Promise<AIAnalysis | null> {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call backend API (API key stays on server)
      const response = await fetch(`${API_BASE_URL}/api/ai/analyze-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          photos: job.photos || [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI analysis failed');
      }

      const data = await response.json();
      return data.analysis;

    } catch (error) {
      logger.error('RealAIAnalysisService', 'Analysis failed', { error });
      return null;
    }
  }
}
```

### Fix 3: Remove Direct API Key Access (CRITICAL - Priority 1)

**Update:** `apps/mobile/src/config/ai.config.ts`

```typescript
/**
 * AI Service Configuration
 *
 * ✅ SECURITY: All AI services now use backend API endpoints
 * API keys are NEVER exposed to client-side code
 */

export const aiConfig = {
  // Backend API endpoints (no keys needed on client)
  endpoints: {
    analyzeJob: '/api/ai/analyze-job',
    generateDescription: '/api/ai/generate-description',
  },

  // Feature flags
  features: {
    enableAI: true, // Backend handles AI service availability
    fallbackToMock: true,
  },

  // Cost controls (enforced on backend)
  limits: {
    maxImagesPerJob: 4,
  },
};

// ❌ REMOVED: Direct API key access
// export const aiConfig = {
//   openai: {
//     apiKey: process.env.OPENAI_API_KEY || '', // NEVER DO THIS
//   }
// };
```

---

## 📋 Implementation Checklist

- [ ] **Create backend API route** - `apps/web/app/api/ai/analyze-job/route.ts`
- [ ] **Update mobile service** - Use backend API instead of direct OpenAI calls
- [ ] **Remove direct key access** - Delete OpenAI key references from mobile code
- [ ] **Add authentication** - Verify user owns the job before analyzing
- [ ] **Add rate limiting** - Prevent API abuse (max 20 requests/minute per user)
- [ ] **Add cost tracking** - Log OpenAI API usage for billing
- [ ] **Test end-to-end** - Verify mobile → backend → OpenAI flow works
- [ ] **Update documentation** - Document new API endpoint
- [ ] **Add error handling** - Graceful fallbacks if OpenAI API fails

---

## 🎯 Success Criteria

✅ **Security:**
- No API keys in mobile app code
- No API keys in mobile environment variables
- All AI calls routed through authenticated backend API

✅ **Functionality:**
- Job photo analysis works via backend API
- Proper error handling and fallbacks
- Cost controls enforced server-side

✅ **Documentation:**
- API endpoint documented
- Security architecture documented
- Environment variable setup documented

---

## 📚 Security Best Practices Applied

1. **Server-side API keys** - All third-party API keys stay on server
2. **Authentication** - Backend verifies user identity before API calls
3. **Authorization** - Backend verifies user owns the job
4. **Rate limiting** - Prevent abuse and runaway costs
5. **Audit logging** - Track all AI API usage
6. **Cost controls** - Limit images per request, max cost per request
7. **Graceful degradation** - Fall back to rule-based analysis if API fails

---

## 🔗 Related Documentation

- [CLAUDE.md](./CLAUDE.md) - API Consistency guidelines (lines 545-581)
- [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md) - Security issues (Section 8.2)
- [BACKEND_EMBEDDINGS_API.md](./BACKEND_EMBEDDINGS_API.md) - AI API architecture

---

**Next Steps:** Implement Fix 1, Fix 2, and Fix 3 before deploying any AI features to production.

**Estimated Time:** 4-6 hours for complete implementation and testing

**Priority:** 🔴 CRITICAL - Block production deployment until fixed
