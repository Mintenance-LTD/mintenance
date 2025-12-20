# Mintenance Platform Core Skill

## Skill Overview
Expert knowledge for developing features on the Mintenance contractor marketplace platform. This skill provides comprehensive understanding of the platform architecture, patterns, and best practices.

## Platform Context

### What is Mintenance?
A production-ready, multi-tenant SaaS platform connecting homeowners with verified contractors for home maintenance and improvement jobs.

- **Version:** 1.2.4 (Production Ready)
- **Target Market:** UK-based property maintenance services
- **Architecture:** Monorepo with Next.js 16 (Web) and React Native/Expo 52 (Mobile)
- **Backend:** Supabase (PostgreSQL with Row Level Security)
- **AI/ML:** Advanced Building Surveyor AI with YOLO + SAM3 + Google Cloud Vision

### Technology Stack

**Frontend (Web):**
- Next.js 16.0.4 with React 19.0.0
- Tailwind CSS + Radix UI + Framer Motion
- @tanstack/react-query v5.32.0
- React Hook Form + Zod validation
- Stripe integration

**Frontend (Mobile):**
- Expo SDK 52 with React Native 0.76.1
- React Navigation v7
- @tanstack/react-query v5.50.0
- Stripe React Native

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Custom JWT auth (Web) + Supabase Auth (Mobile)
- Next.js API Routes (REST)
- @upstash/redis for rate limiting

**AI/ML:**
- Google Cloud Vision API
- Local YOLO inference (onnxruntime)
- SAM3 integration for segmentation
- Smart agents (Pricing, Notification, Escrow, Scheduling)

### Monorepo Structure

```
mintenance-clean/
├── apps/
│   ├── web/              # Next.js 16 web application
│   ├── mobile/           # React Native Expo application
│   └── sam3-service/     # Python SAM3 inference service
├── packages/
│   ├── types/            # Shared TypeScript types (SINGLE SOURCE OF TRUTH)
│   ├── auth/             # JWT/token management utilities
│   ├── shared/           # Common utilities, logger
│   ├── shared-ui/        # Cross-platform UI components
│   ├── design-tokens/    # Design system tokens
│   └── api-client/       # Mobile API client wrapper
└── supabase/
    └── migrations/       # 100+ database migrations
```

## Core Development Patterns

### Pattern 1: Type-First Development

**Rule:** ALL new features start with type definitions in `packages/types/src/index.ts`

```typescript
// packages/types/src/index.ts
export interface NewFeature {
  id: string;
  user_id: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}
```

**Why:** Ensures type safety across web, mobile, and backend. Types are shared across the entire platform.

### Pattern 2: Database-First for Data Features

**Rule:** Create migration BEFORE writing application code

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_feature_name.sql
BEGIN;

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.feature_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes
CREATE INDEX idx_feature_user ON public.feature_table(user_id);
CREATE INDEX idx_feature_created ON public.feature_table(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.feature_table ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Users can view own records" ON public.feature_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" ON public.feature_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" ON public.feature_table
  FOR UPDATE USING (auth.uid() = user_id);

COMMIT;
```

**Generate migration:**
```bash
npx supabase db diff --local
```

### Pattern 3: Secure API Routes

**Rule:** EVERY API route follows this security pattern

```typescript
// apps/web/app/api/feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/supabase-server';
import { z } from 'zod';

// Input validation schema
const schema = z.object({
  field: z.string().min(1),
  // ... more fields
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF Protection
    await requireCSRF(req);

    // 2. Rate Limiting (5 requests per 15 minutes)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    await checkRateLimit(ip, 'feature-action');

    // 3. Authentication
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 4. Input Validation
    const body = await req.json();
    const data = schema.parse(body);

    // 5. Business Logic with RLS
    const { data: result, error } = await serverSupabase
      .from('feature_table')
      .insert({
        ...data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // 6. Success Response
    return NextResponse.json({ data: result });

  } catch (error) {
    console.error('[API] Feature error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pattern 4: Cross-Platform Components

**Rule:** Create platform-specific implementations with shared types

```
packages/shared-ui/src/components/Feature/
├── Feature.tsx           # Shared types and exports
├── Feature.web.tsx       # Web implementation
├── Feature.native.tsx    # React Native implementation
└── types.ts             # Component-specific types
```

**Example:**

```typescript
// Feature.tsx (shared)
export * from './Feature.web';
export type { FeatureProps } from './types';

// Feature.web.tsx
import React from 'react';
import { FeatureProps } from './types';

export const Feature: React.FC<FeatureProps> = ({ title, onPress }) => {
  return (
    <button onClick={onPress} className="btn-primary">
      {title}
    </button>
  );
};

// Feature.native.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { FeatureProps } from './types';

export const Feature: React.FC<FeatureProps> = ({ title, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};
```

### Pattern 5: Service Layer (Singleton)

**Rule:** Services use singleton pattern with comprehensive logging

```typescript
// apps/web/lib/services/feature/FeatureService.ts
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/supabase-server';

export class FeatureService {
  private static instance: FeatureService;

  private constructor() {}

  public static getInstance(): FeatureService {
    if (!FeatureService.instance) {
      FeatureService.instance = new FeatureService();
    }
    return FeatureService.instance;
  }

  public async performAction(params: ActionParams): Promise<ActionResult> {
    logger.info('[FeatureService] Starting action', { params });

    try {
      // Business logic
      const result = await this.executeLogic(params);

      logger.info('[FeatureService] Action completed', { result });
      return result;

    } catch (error) {
      logger.error('[FeatureService] Action failed', { error, params });
      throw error;
    }
  }

  private async executeLogic(params: ActionParams): Promise<ActionResult> {
    // Implementation
  }
}
```

### Pattern 6: React Query Data Fetching

**Rule:** Use React Query for ALL data fetching on both web and mobile

```typescript
// Web: apps/web/lib/hooks/useFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const res = await fetch('/api/features');
      if (!res.ok) throw new Error('Failed to fetch features');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFeatureInput) => {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create feature');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });
}
```

## User Roles & Business Rules

### Three User Types

1. **Homeowner** 🏠
   - Posts jobs with photos/descriptions and AI damage assessment
   - Manages multiple properties
   - Receives and compares bids from contractors
   - Makes payments via Stripe (escrow with 7-day hold)
   - Reviews completed work and leaves ratings
   - **Key Flow**: Register → Add Property → Create Job → Upload Photos (AI Analysis) → Receive Bids → Accept Bid → Payment → Review

2. **Contractor** 🔧
   - Discovers jobs via map interface, swipe mode, or push notifications
   - Submits detailed bids with line-item breakdowns
   - Performs work and uploads progress photos (before/after)
   - Receives payments via Stripe Connect after 7-day escrow
   - Builds portfolio from completed jobs (auto-added if rating ≥ 4 stars)
   - **Key Flow**: Register → Get Verified → Discover Jobs → Submit Bid → Perform Work → Upload Photos → Get Paid → Receive Review

3. **Admin** 👨‍💼
   - Verifies contractor credentials and licenses
   - Monitors platform health and ML model performance
   - Resolves disputes during escrow period
   - Handles platform settings and manages users
   - Reviews Building Surveyor AI accuracy

### User Journey Reference

For complete end-to-end user flows, see: [USER_INTERACTION_FLOW_COMPLETE.md](../../../USER_INTERACTION_FLOW_COMPLETE.md)

**Key Workflows Documented:**
- Homeowner: 14-step journey from registration to job completion
- Contractor: 10-step journey from registration to payout
- Communication system with real-time messaging
- Payment & escrow flow with automatic release
- Review & rating system with mutual reviews
- AI/ML damage assessment integration

### Job Lifecycle States

```typescript
type JobStatus =
  | 'posted'        // Homeowner created, visible to contractors on map/swipe
  | 'assigned'      // Bid accepted by homeowner, contractor assigned
  | 'in_progress'   // Contractor marked work started, uploading photos
  | 'completed'     // Contractor marked complete, awaiting homeowner confirmation
  | 'cancelled';    // Job cancelled by either party

// Detailed workflow per status:
// posted → Contractors discover via map/swipe/notifications → Submit bids
// assigned → Homeowner accepts bid → Contractor receives notification → Pre-work communication
// in_progress → Contractor uploads before photos → Performs work → Uploads after photos
// completed → Homeowner inspects → Confirms work → Makes payment (escrow) → Leaves review
```

### Complete User Workflow Examples

#### Homeowner Job Creation Workflow
```typescript
// Step 1: Create job with AI analysis
POST /api/jobs {
  title: "Fix leaking kitchen tap",
  description: "Tap has been dripping for a week...",
  photos: ["photo1.jpg", "photo2.jpg"], // Triggers AI analysis
  category: "plumbing",
  budget: 350,
  urgency: "medium"
}

// Step 2: AI Building Surveyor automatically analyzes photos
// Returns: {
//   damageType: "Water Damage - Plumbing Leak",
//   severity: "Moderate",
//   confidence: 87,
//   estimatedCost: { min: 250, max: 450 },
//   urgency: "Medium",
//   safetyScore: 75
// }

// Step 3: Job posted, nearby contractors notified
// Notification sent to contractors within 10-mile radius matching "plumbing" skill

// Step 4: Contractors submit bids (3 received)
// Homeowner compares using BidComparisonTable2025 component

// Step 5: Homeowner accepts best bid
POST /api/jobs/{job_id}/bids/{bid_id}/accept
// Status: posted → assigned
// Other bids auto-rejected
// Contractor receives "🎉 Your bid was accepted!" notification

// Step 6: Work performed
PUT /api/jobs/{job_id}/start // Contractor marks started
POST /api/jobs/{job_id}/photos/before // Before photos
POST /api/jobs/{job_id}/photos/after // After photos
POST /api/jobs/{job_id}/complete // Contractor marks complete

// Step 7: Homeowner confirms and pays
POST /api/jobs/{job_id}/confirm-completion
POST /api/payments/create-intent // Creates escrow payment

// Step 8: 7-day escrow period
// Automatic release via cron job after 7 days (if no disputes)

// Step 9: Both parties leave reviews
POST /api/reviews {
  rating: 5,
  comment: "Excellent work!",
  categories: { quality: 5, timeliness: 4, ... }
}
```

#### Contractor Job Discovery Workflow
```typescript
// Method 1: Map-based discovery
GET /api/contractor/discover/jobs?latitude=51.5014&longitude=-0.1419&radius=10&categories=["plumbing"]
// Returns jobs with distance calculated via PostGIS ST_Distance

// Method 2: Swipe interface (Tinder-style)
// Component: ContractorDiscoverClient with swipe gestures
// Swipe Right → Save job for later
// Swipe Left → Pass on job
// Tap card → View full details

// Method 3: Push notifications
// New job posted → Nearby contractors receive instant notification
// Click notification → Opens job detail page

// Contractor submits bid with line items
POST /api/bids {
  job_id: "...",
  bid_amount: 375,
  proposal_text: "15 years experience...",
  line_items: [
    { description: "Call-out", quantity: 1, unit_price: 50 },
    { description: "Labour", quantity: 2, unit_price: 80 }
  ],
  estimated_duration: 2,
  proposed_start_date: "2025-01-16"
}

// Wait for acceptance, then perform work, get paid after escrow
```

### Payment Flow

1. **Escrow on Bid Acceptance:** Homeowner pays upfront, held in Stripe escrow
2. **Work Completion:** Contractor marks job complete
3. **Auto-Release:** Payment auto-releases after 7-14 days if no disputes
4. **Platform Fee:** 10% (configurable in admin settings)

### Subscription Tiers

```typescript
type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

// Feature access by tier
const TIER_FEATURES = {
  free: {
    maxJobs: 5,
    portfolio: false,
    analytics: false,
  },
  basic: {
    maxJobs: 20,
    portfolio: true,
    analytics: false,
  },
  professional: {
    maxJobs: Infinity,
    portfolio: true,
    analytics: true,
    prioritySupport: true,
  },
  enterprise: {
    maxJobs: Infinity,
    portfolio: true,
    analytics: true,
    prioritySupport: true,
    whiteLabel: true,
    dedicatedSupport: true,
  },
};
```

## Security Best Practices

### 1. Authentication Flow

**Web:** Custom JWT with refresh token rotation
```typescript
// Token cookies
mintenance-auth: {
  value: '<access_token>',
  maxAge: 3600, // 1 hour
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
}

mintenance-refresh: {
  value: '<refresh_token>',
  maxAge: 2592000, // 30 days
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
}
```

**Mobile:** Supabase Auth with session persistence

### 2. Row Level Security (RLS)

**Every table MUST have RLS enabled:**

```sql
-- Always enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Policies based on auth.uid()
CREATE POLICY "Users see own data" ON public.table_name
  FOR SELECT USING (auth.uid() = user_id);
```

### 3. CSRF Protection

**Every mutating API route requires CSRF token:**

```typescript
import { requireCSRF } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  await requireCSRF(req); // Throws if invalid
  // ... rest of handler
}
```

### 4. Rate Limiting

**Protect endpoints from abuse:**

```typescript
import { checkRateLimit } from '@/lib/rate-limiter';

await checkRateLimit(userId, 'action-type'); // 5 per 15 min default
```

## Testing Strategy

### Test Coverage Requirements

- **Target:** 80%+ coverage
- **Current:** 87.7% (804/917 tests passing)

### Testing Stack

**Web:**
- Unit/Integration: Vitest
- E2E: Playwright
- Component: React Testing Library

**Mobile:**
- Unit: Jest with jest-expo
- Integration: React Native Testing Library

### Test Pattern

```typescript
// __tests__/api/feature.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('POST /api/feature', () => {
  beforeEach(async () => {
    // Setup test data
  });

  it('should require authentication', async () => {
    const res = await fetch('/api/feature', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('should validate input', async () => {
    const res = await fetch('/api/feature', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
      body: JSON.stringify({ invalid: 'data' }),
    });
    expect(res.status).toBe(400);
  });

  it('should create feature successfully', async () => {
    const res = await fetch('/api/feature', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
      body: JSON.stringify({ valid: 'data' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('id');
  });
});
```

## Environment Variables

### Required for All Environments

```env
# Database
SUPABASE_URL=https://*.supabase.co
SUPABASE_ANON_KEY=<public_key>
SUPABASE_SERVICE_ROLE_KEY=<secret_key>

# Authentication (Web only)
JWT_SECRET=<64-char-minimum>
JWT_REFRESH_SECRET=<64-char-minimum>

# Payments
STRIPE_SECRET_KEY=sk_*
STRIPE_WEBHOOK_SECRET=whsec_*
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_*

# AI Services
GOOGLE_CLOUD_PROJECT_ID=<project>
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account.json>
ROBOFLOW_API_KEY=<key>

# Optional
REDIS_URL=<upstash-redis-url>
SENTRY_DSN=<sentry-dsn>
```

## Common Commands

```bash
# Database migrations
npx supabase db diff --local          # Generate migration
npx supabase db push                  # Apply to remote
npx supabase db reset                 # Reset local database

# Development
npm run dev                           # Start web dev server
npm run dev:mobile                    # Start mobile dev server

# Testing
npm run test                          # Run all tests
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
npm run test:e2e                      # Playwright E2E

# Build
npm run build                         # Build web app
npm run build:mobile                  # Build mobile app (EAS)

# Type checking
npm run type-check                    # Check TypeScript
npm run lint                          # Run ESLint

# Bundle analysis
npm run analyze                       # Web bundle analyzer
```

## Key Gotchas & Pitfalls

### 1. Middleware Order Matters
```typescript
// CORRECT order in middleware.ts
CSRF → Rate Limit → Authentication → Authorization
```

### 2. RLS Policies Must Match JWT Claims
```typescript
// JWT payload structure must align with RLS policies
{
  sub: user_id,        // Maps to auth.uid()
  email: string,
  role: 'homeowner' | 'contractor' | 'admin'
}
```

### 3. Platform-Specific File Resolution
```typescript
// Webpack MUST resolve .web.tsx BEFORE .tsx
// Metro MUST resolve .native.tsx BEFORE .tsx
```

### 4. Token Rotation Race Conditions
```sql
-- MUST use atomic PostgreSQL function
-- Located in: supabase/migrations/*_refresh_token_rotation.sql
CREATE OR REPLACE FUNCTION rotate_refresh_token(...)
```

### 5. Mobile Requires Dev Client for Native Modules
```bash
# Cannot use Expo Go for Stripe, native maps, etc.
npx expo run:ios     # Requires expo-dev-client
npx expo run:android
```

## Resources

- **Codebase:** `c:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\`
- **Documentation:** See README.md in project root
- **API Routes:** `apps/web/app/api/*/route.ts`
- **Database Schema:** `supabase/migrations/`
- **Shared Types:** `packages/types/src/index.ts`
- **AI Services:** `apps/web/lib/services/building-surveyor/`
- **Agents:** `apps/web/lib/services/agents/`

## When to Use This Skill

This skill should be loaded for:
- Creating new features for the platform
- Understanding architectural patterns
- Implementing business logic
- Setting up new API routes
- Creating database migrations
- Building cross-platform components
- Integrating with platform services
- Following security best practices
- Understanding the codebase structure
