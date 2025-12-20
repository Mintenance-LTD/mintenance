# Mintenance SaaS - Agent Usage Guide

**Last Updated**: December 2025
**Purpose**: Practical guide for using all 11 specialized agents to build the best home maintenance SaaS

---

## Table of Contents

1. [Agent Overview & Mapping](#agent-overview--mapping)
2. [Real-World Workflows](#real-world-workflows)
3. [Feature Development Examples](#feature-development-examples)
4. [Agent Orchestration Patterns](#agent-orchestration-patterns)
5. [Daily Development Scenarios](#daily-development-scenarios)
6. [Team Collaboration Patterns](#team-collaboration-patterns)
7. [Quality Assurance Workflows](#quality-assurance-workflows)
8. [Production Deployment](#production-deployment)

---

## Agent Overview & Mapping

### Your 11 Specialized Agents

| Agent | Primary Use Cases in Mintenance | Key Files They Know |
|-------|--------------------------------|---------------------|
| **frontend-specialist** | React components, design system, UI/UX | `apps/web/components/`, `apps/web/app/` |
| **performance-optimizer** | Core Web Vitals, bundle size, caching | `next.config.js`, `lib/cache.ts` |
| **database-architect** | Supabase schema, RLS, queries | `supabase/migrations/`, `lib/api/supabaseServer.ts` |
| **devops-engineer** | CI/CD, deployment, monitoring | `.github/workflows/`, Docker configs |
| **testing-specialist** | Unit, integration, E2E tests | `__tests__/`, `jest.config.js` |
| **security-expert** | Auth, encryption, OWASP | `lib/auth.ts`, `middleware.ts` |
| **mobile-developer** | React Native app | `apps/mobile/`, Expo configs |
| **api-architect** | REST/GraphQL APIs, real-time | `apps/web/app/api/`, Supabase functions |
| **ui-designer** | Design system, rapid prototyping | `design-system/`, UI components |
| **building-surveyor-ai** | Basic damage assessment | `lib/services/building-surveyor/` (legacy) |
| **ai-building-engineer** | Advanced self-learning AI | `lib/services/building-surveyor/` (full system) |

---

## Real-World Workflows

### Workflow 1: Adding a New Feature (End-to-End)

**Scenario**: Add "Smart Job Recommendations" feature

#### Phase 1: Planning & Architecture (Day 1)

**Step 1: API Design**
```bash
You: @api-architect Design the API for smart job recommendations based on
     user preferences, location, and past jobs. Include real-time updates
     when new matching jobs are posted.
```

**What you get**:
```markdown
API Design for Smart Job Recommendations:

1. REST Endpoint:
   GET /api/jobs/recommendations
   Query params: ?userId=xxx&limit=10&offset=0

2. GraphQL Query (alternative):
   query GetRecommendations($userId: ID!, $limit: Int) {
     recommendations(userId: $userId, limit: $limit) {
       score
       job { ...jobFields }
       reasons
     }
   }

3. Real-time Subscription:
   // Using Supabase real-time
   supabase
     .channel('job-recommendations')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'jobs',
       filter: `matches_user_id=eq.${userId}`
     }, handleNewRecommendation)

Files to create:
- apps/web/app/api/jobs/recommendations/route.ts
- apps/web/lib/queries/recommendations.ts
- apps/web/hooks/useRecommendations.ts
```

**Step 2: Database Schema**
```bash
You: @database-architect Design the database schema for storing user
     preferences, job matching scores, and recommendation history.
     Include indexes for performance.
```

**What you get**:
```sql
-- Migration: 20251201000001_add_job_recommendations.sql

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories JSONB DEFAULT '[]',
  max_distance_km INTEGER DEFAULT 50,
  min_budget INTEGER,
  max_budget INTEGER,
  notification_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Recommendation Scores (Materialized View for performance)
CREATE MATERIALIZED VIEW job_recommendation_scores AS
SELECT
  j.id AS job_id,
  u.id AS user_id,
  -- Score calculation
  (
    CASE WHEN j.category = ANY(up.preferred_categories) THEN 30 ELSE 0 END +
    CASE WHEN ST_Distance(j.location, u.location) <= up.max_distance_km * 1000 THEN 25 ELSE 0 END +
    CASE WHEN j.budget BETWEEN up.min_budget AND up.max_budget THEN 20 ELSE 0 END +
    CASE WHEN j.urgency = 'urgent' THEN 15 ELSE 5 END +
    -- Past job similarity (if user has completed similar jobs)
    (SELECT COUNT(*) * 10 FROM jobs WHERE homeowner_id = u.id AND category = j.category LIMIT 1)
  ) AS recommendation_score
FROM jobs j
CROSS JOIN users u
LEFT JOIN user_preferences up ON up.user_id = u.id
WHERE j.status = 'open'
  AND j.homeowner_id != u.id -- Don't recommend own jobs
WITH DATA;

-- Indexes
CREATE INDEX idx_job_rec_scores_user_score ON job_recommendation_scores(user_id, recommendation_score DESC);
CREATE INDEX idx_job_rec_scores_job ON job_recommendation_scores(job_id);

-- Refresh function (called on job INSERT/UPDATE)
CREATE OR REPLACE FUNCTION refresh_recommendation_scores()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY job_recommendation_scores;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_recommendations
AFTER INSERT OR UPDATE ON jobs
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_recommendation_scores();

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Phase 2: Frontend Implementation (Day 2-3)

**Step 3: UI Design**
```bash
You: @ui-designer Create a recommendations feed component with:
     - Card-based layout showing recommended jobs
     - Match score indicator (0-100%)
     - Reasons for recommendation
     - Quick actions (Save, Apply, Dismiss)
     - Real-time badge when new recommendations arrive
```

**What you get**:
```typescript
// apps/web/app/contractor/recommendations/components/RecommendationsFeed.tsx

import { UnifiedCard } from '@/components/ui/UnifiedCard';
import { UnifiedBadge } from '@/components/ui/UnifiedBadge';
import { UnifiedButton } from '@/components/ui/UnifiedButton';
import { motion } from 'framer-motion';

interface Recommendation {
  score: number;
  job: Job;
  reasons: string[];
  isNew?: boolean;
}

export function RecommendationsFeed({
  recommendations
}: {
  recommendations: Recommendation[]
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Jobs for You
        </h2>
        <UnifiedBadge variant="info">
          {recommendations.filter(r => r.isNew).length} new
        </UnifiedBadge>
      </div>

      {/* Feed */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <RecommendationCard recommendation={rec} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { score, job, reasons, isNew } = recommendation;

  return (
    <UnifiedCard className="relative overflow-hidden">
      {/* New Badge */}
      {isNew && (
        <div className="absolute top-2 right-2">
          <UnifiedBadge variant="success" className="animate-pulse">
            NEW
          </UnifiedBadge>
        </div>
      )}

      {/* Match Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Match Score</span>
          <span className="text-lg font-bold text-teal-600">{score}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Job Details */}
      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
        {job.title}
      </h3>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <MapPinIcon className="w-4 h-4 mr-2" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <CurrencyPoundIcon className="w-4 h-4 mr-2" />
          <span>£{job.budget.toLocaleString()}</span>
        </div>
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Why we recommend this:</p>
        <div className="flex flex-wrap gap-1">
          {reasons.map((reason, i) => (
            <UnifiedBadge key={i} variant="neutral" size="sm">
              {reason}
            </UnifiedBadge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <UnifiedButton
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={() => handleApply(job.id)}
        >
          Apply Now
        </UnifiedButton>
        <UnifiedButton
          variant="outline"
          size="sm"
          onClick={() => handleSave(job.id)}
        >
          Save
        </UnifiedButton>
        <UnifiedButton
          variant="ghost"
          size="sm"
          onClick={() => handleDismiss(job.id)}
        >
          ✕
        </UnifiedButton>
      </div>
    </UnifiedCard>
  );
}
```

**Step 4: Frontend Logic**
```bash
You: @frontend-specialist Implement the React hook for fetching
     recommendations with real-time updates, pagination, and optimistic UI
     updates when user dismisses recommendations.
```

**What you get**:
```typescript
// apps/web/hooks/useRecommendations.ts

import { useState, useEffect } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { supabase } from '@/lib/supabase';
import type { Recommendation } from '@/types';

interface UseRecommendationsOptions {
  limit?: number;
  autoRefresh?: boolean;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { limit = 20, autoRefresh = true } = options;
  const { user } = useCurrentUser();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch recommendations
  const fetchRecommendations = async (offset = 0) => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/jobs/recommendations?userId=${user.id}&limit=${limit}&offset=${offset}`
      );

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();

      if (offset === 0) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations(prev => [...prev, ...data.recommendations]);
      }

      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for new recommendations
  useEffect(() => {
    if (!user || !autoRefresh) return;

    const channel = supabase
      .channel(`recommendations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
        },
        async (payload) => {
          // Check if this job matches user preferences
          const response = await fetch(
            `/api/jobs/${payload.new.id}/match-score?userId=${user.id}`
          );
          const { score, reasons } = await response.json();

          if (score >= 60) {
            // Add to recommendations with "new" badge
            setRecommendations(prev => [
              {
                score,
                job: payload.new,
                reasons,
                isNew: true,
              },
              ...prev,
            ]);

            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Job Match!', {
                body: `${score}% match: ${payload.new.title}`,
                icon: '/logo.png',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, autoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  // Dismiss recommendation (optimistic update)
  const dismissRecommendation = async (jobId: string) => {
    // Optimistic update
    setRecommendations(prev => prev.filter(r => r.job.id !== jobId));

    try {
      await fetch(`/api/jobs/recommendations/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, userId: user?.id }),
      });
    } catch (err) {
      // Rollback on error
      fetchRecommendations();
    }
  };

  // Load more (pagination)
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchRecommendations(recommendations.length);
    }
  };

  return {
    recommendations,
    loading,
    error,
    hasMore,
    dismissRecommendation,
    loadMore,
    refresh: () => fetchRecommendations(0),
  };
}
```

#### Phase 3: Backend Implementation (Day 4)

**Step 5: API Route**
```bash
You: @api-architect Implement the recommendations API route with caching,
     rate limiting, and proper error handling. Use the materialized view
     from the database architect.
```

**What you get**:
```typescript
// apps/web/app/api/jobs/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCached, setCache } from '@/lib/cache';
import { rateLimit } from '@/lib/rate-limiter';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Rate limiting (10 requests per minute per user)
    const rateLimitResult = await rateLimit({
      key: `recommendations:${userId}`,
      limit: 10,
      window: 60,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.reset },
        { status: 429 }
      );
    }

    // Check cache (2 min TTL)
    const cacheKey = `recommendations:${userId}:${limit}:${offset}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      logger.info('Cache hit for recommendations', { userId, duration: Date.now() - startTime });
      return NextResponse.json(cached);
    }

    // Fetch from materialized view
    const { data: scores, error: scoresError } = await serverSupabase
      .from('job_recommendation_scores')
      .select('job_id, recommendation_score')
      .eq('user_id', userId)
      .gte('recommendation_score', 60) // Only show matches >= 60%
      .order('recommendation_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scoresError) throw scoresError;

    // Fetch full job details
    const jobIds = scores.map(s => s.job_id);
    const { data: jobs, error: jobsError } = await serverSupabase
      .from('jobs')
      .select(`
        *,
        homeowner:users!homeowner_id(id, full_name, avatar_url)
      `)
      .in('id', jobIds);

    if (jobsError) throw jobsError;

    // Combine scores with job details
    const recommendations = scores.map(score => {
      const job = jobs.find(j => j.id === score.job_id);
      return {
        score: score.recommendation_score,
        job,
        reasons: generateReasons(score, job),
        isNew: false, // Only real-time updates are marked as new
      };
    }).filter(r => r.job); // Remove any missing jobs

    const response = {
      recommendations,
      hasMore: scores.length === limit,
      total: recommendations.length,
    };

    // Cache for 2 minutes
    await setCache(cacheKey, response, 120);

    logger.info('Recommendations fetched', {
      userId,
      count: recommendations.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Failed to fetch recommendations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

function generateReasons(score: any, job: any): string[] {
  const reasons: string[] = [];

  // This would be more sophisticated with actual preference matching
  if (score.recommendation_score >= 90) {
    reasons.push('Perfect match');
  }

  reasons.push('In your area');
  reasons.push('Matches your skills');

  if (job.urgency === 'urgent') {
    reasons.push('Urgent job');
  }

  if (job.budget >= 1000) {
    reasons.push('High budget');
  }

  return reasons;
}
```

#### Phase 4: Testing (Day 5)

**Step 6: Write Tests**
```bash
You: @testing-specialist Write comprehensive tests for the recommendations
     feature including:
     - Unit tests for the hook
     - Integration tests for the API
     - E2E test for the full user flow
```

**What you get**:
```typescript
// apps/web/hooks/__tests__/useRecommendations.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useRecommendations } from '../useRecommendations';
import { useCurrentUser } from '../useCurrentUser';

jest.mock('../useCurrentUser');
jest.mock('@/lib/supabase');

describe('useRecommendations', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: mockUser });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches recommendations on mount', async () => {
    const mockRecommendations = [
      { score: 85, job: { id: 'job-1', title: 'Test Job' }, reasons: ['Match'] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations, hasMore: false }),
    });

    const { result } = renderHook(() => useRecommendations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.recommendations).toEqual(mockRecommendations);
  });

  it('handles dismiss with optimistic update', async () => {
    const mockRecommendations = [
      { score: 85, job: { id: 'job-1', title: 'Job 1' }, reasons: [] },
      { score: 75, job: { id: 'job-2', title: 'Job 2' }, reasons: [] },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: mockRecommendations, hasMore: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.recommendations).toHaveLength(2);
    });

    // Dismiss job-1
    result.current.dismissRecommendation('job-1');

    // Optimistic update should remove it immediately
    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.recommendations[0].job.id).toBe('job-2');
  });

  it('loads more recommendations on pagination', async () => {
    const page1 = [{ score: 85, job: { id: 'job-1' }, reasons: [] }];
    const page2 = [{ score: 75, job: { id: 'job-2' }, reasons: [] }];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: page1, hasMore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: page2, hasMore: false }),
      });

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.recommendations).toHaveLength(1);
    });

    result.current.loadMore();

    await waitFor(() => {
      expect(result.current.recommendations).toHaveLength(2);
    });
  });
});
```

**API Integration Test**:
```typescript
// apps/web/app/api/jobs/recommendations/__tests__/route.test.ts

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';

jest.mock('@/lib/api/supabaseServer');
jest.mock('@/lib/cache');
jest.mock('@/lib/rate-limiter');

describe('/api/jobs/recommendations', () => {
  it('returns recommendations for valid user', async () => {
    const mockScores = [
      { job_id: 'job-1', recommendation_score: 85 },
    ];
    const mockJobs = [
      { id: 'job-1', title: 'Test Job', budget: 1000 },
    ];

    (serverSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockScores, error: null }),
      in: jest.fn().mockResolvedValue({ data: mockJobs, error: null }),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/jobs/recommendations?userId=user-123&limit=20'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recommendations).toHaveLength(1);
    expect(data.recommendations[0].score).toBe(85);
  });

  it('returns 400 for missing userId', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/jobs/recommendations'
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
```

**E2E Test**:
```typescript
// apps/web/e2e/recommendations.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Job Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as contractor
    await page.goto('/login');
    await page.fill('[name="email"]', 'contractor@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/contractor/dashboard');
  });

  test('displays recommendations feed', async ({ page }) => {
    await page.goto('/contractor/recommendations');

    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="recommendation-card"]');

    // Check that at least one recommendation is displayed
    const cards = await page.locator('[data-testid="recommendation-card"]').count();
    expect(cards).toBeGreaterThan(0);

    // Check match score is displayed
    const matchScore = await page.locator('[data-testid="match-score"]').first().textContent();
    expect(matchScore).toMatch(/\d+%/);
  });

  test('can dismiss a recommendation', async ({ page }) => {
    await page.goto('/contractor/recommendations');
    await page.waitForSelector('[data-testid="recommendation-card"]');

    const initialCount = await page.locator('[data-testid="recommendation-card"]').count();

    // Click dismiss button on first card
    await page.locator('[data-testid="recommendation-card"]').first()
      .locator('button[aria-label="Dismiss"]').click();

    // Wait for optimistic update
    await page.waitForTimeout(500);

    const newCount = await page.locator('[data-testid="recommendation-card"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('shows real-time notification for new match', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);

    await page.goto('/contractor/recommendations');
    await page.waitForSelector('[data-testid="recommendation-card"]');

    // Simulate new job being created (would be done by admin in real scenario)
    // For E2E, we can use a test endpoint
    await fetch('http://localhost:3000/api/test/create-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Test Job',
        category: 'plumbing',
        location: 'London',
      }),
    });

    // Wait for real-time update
    await page.waitForSelector('[data-testid="new-badge"]', { timeout: 5000 });

    // Check that new badge is displayed
    const newBadge = await page.locator('[data-testid="new-badge"]').isVisible();
    expect(newBadge).toBe(true);
  });
});
```

#### Phase 5: Performance Optimization (Day 6)

**Step 7: Optimize Performance**
```bash
You: @performance-optimizer Review the recommendations feature for
     performance issues. Focus on:
     - Database query optimization
     - Caching strategy
     - Bundle size impact
     - Real-time update efficiency
```

**What you get**:
```markdown
Performance Audit: Smart Job Recommendations

## Issues Found:

### 1. Database Query Performance
**Problem**: Materialized view refresh on every job INSERT is too slow (200ms+)
**Impact**: Delays job creation, blocks user experience

**Solution**: Implement incremental refresh
```sql
-- Instead of full refresh, update only affected rows
CREATE OR REPLACE FUNCTION incremental_refresh_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update scores for the new job
  INSERT INTO job_recommendation_scores (job_id, user_id, recommendation_score)
  SELECT
    NEW.id,
    u.id,
    calculate_recommendation_score(NEW, u, up)
  FROM users u
  LEFT JOIN user_preferences up ON up.user_id = u.id
  WHERE u.role = 'contractor'
  ON CONFLICT (job_id, user_id) DO UPDATE
  SET recommendation_score = EXCLUDED.recommendation_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace trigger
DROP TRIGGER trigger_refresh_recommendations ON jobs;
CREATE TRIGGER trigger_incremental_refresh
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION incremental_refresh_recommendations();
```
**Impact**: Reduces latency from 200ms → 20ms (10x improvement)

### 2. Real-time Subscription Efficiency
**Problem**: Subscribing to entire jobs table creates unnecessary traffic
**Impact**: Client receives updates for ALL jobs, filters client-side

**Solution**: Use filtered subscriptions
```typescript
// Before (inefficient)
supabase
  .channel('all-jobs')
  .on('postgres_changes', { table: 'jobs', event: 'INSERT' }, handler)

// After (efficient)
supabase
  .channel('user-recommendations')
  .on('postgres_changes', {
    table: 'job_recommendation_scores',
    event: 'INSERT',
    filter: `user_id=eq.${userId}`  // Server-side filter
  }, handler)
```
**Impact**: Reduces network traffic by 95%, eliminates client-side filtering

### 3. Bundle Size
**Problem**: Framer Motion adds 50KB to bundle
**Impact**: Slower initial page load

**Solution**: Lazy load animations
```typescript
// Before
import { motion } from 'framer-motion';

// After
import dynamic from 'next/dynamic';
const MotionDiv = dynamic(() => import('framer-motion').then(m => m.motion.div), {
  ssr: false,
});
```
**Impact**: Reduces bundle by 50KB, improves FCP by 200ms

### 4. Cache Strategy
**Problem**: 2-minute cache TTL is too aggressive, causes frequent DB hits
**Impact**: Increased database load during peak hours

**Solution**: Implement stale-while-revalidate
```typescript
// Cache for 5 minutes, serve stale for 10 minutes
await setCache(cacheKey, response, 300, { staleWhileRevalidate: 600 });
```
**Impact**: Reduces database queries by 80% during peak hours

## Performance Metrics After Optimization:

- **API Response Time**: 150ms → 30ms (5x faster)
- **Database Load**: -80% queries
- **Bundle Size**: -50KB
- **First Contentful Paint**: 1.8s → 1.6s
- **Largest Contentful Paint**: 2.5s → 2.1s

## Next Steps:
1. Implement incremental refresh (critical)
2. Add filtered subscriptions (high priority)
3. Lazy load animations (medium priority)
4. Update cache strategy (medium priority)
```

#### Phase 6: Security Review (Day 7)

**Step 8: Security Audit**
```bash
You: @security-expert Audit the recommendations feature for security
     vulnerabilities. Check for SQL injection, authorization issues,
     data leakage, and rate limiting.
```

**What you get**:
```markdown
Security Audit: Smart Job Recommendations

## Vulnerabilities Found:

### 🔴 CRITICAL: SQL Injection in User Preferences
**Location**: `apps/web/app/api/jobs/recommendations/dismiss/route.ts`
**Issue**: User input directly concatenated into SQL query

```typescript
// VULNERABLE CODE (DO NOT USE)
const query = `DELETE FROM user_dismissed_jobs WHERE job_id = '${jobId}'`;
```

**Fix**: Use parameterized queries
```typescript
// SECURE CODE
const { error } = await serverSupabase
  .from('user_dismissed_jobs')
  .delete()
  .eq('job_id', jobId)
  .eq('user_id', userId);
```

### 🟡 HIGH: Authorization Bypass
**Location**: `/api/jobs/recommendations`
**Issue**: API doesn't verify userId matches authenticated user

```typescript
// VULNERABLE: User can request recommendations for ANY user
GET /api/jobs/recommendations?userId=another-user-id
```

**Fix**: Verify authorization
```typescript
// Extract authenticated user from session
const session = await getServerSession();
const authenticatedUserId = session.user.id;

// Reject if userId doesn't match
if (userId !== authenticatedUserId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### 🟡 HIGH: Data Leakage in Real-time Subscriptions
**Location**: Real-time channel setup
**Issue**: Job data includes sensitive homeowner information

**Fix**: Filter sensitive fields
```typescript
const { data: jobs } = await serverSupabase
  .from('jobs')
  .select(`
    id,
    title,
    description,
    category,
    budget,
    location,
    -- EXCLUDE sensitive fields
    -- homeowner_phone
    -- homeowner_address
  `)
  .in('id', jobIds);
```

### 🟢 MEDIUM: Rate Limiting Too Permissive
**Location**: `/api/jobs/recommendations`
**Issue**: 10 requests/min allows scraping

**Fix**: Implement stricter limits with exponential backoff
```typescript
const rateLimitResult = await rateLimit({
  key: `recommendations:${userId}`,
  limit: 5,  // Reduced from 10
  window: 60,
  exponentialBackoff: true,  // Increase delay after violations
});
```

### 🟢 MEDIUM: Missing CORS Headers
**Location**: All API routes
**Issue**: No CORS headers, vulnerable to CSRF from malicious sites

**Fix**: Add CORS middleware
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}
```

## Security Checklist:
- [x] SQL injection prevention (parameterized queries)
- [x] Authorization checks (user owns resource)
- [x] Data leakage prevention (filter sensitive fields)
- [x] Rate limiting (5 req/min with backoff)
- [x] CORS configuration
- [ ] Input validation (add Zod schemas)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF tokens (for mutations)

## Recommended Actions:
1. **URGENT**: Fix SQL injection and authorization bypass
2. **HIGH**: Filter sensitive data in real-time subscriptions
3. **MEDIUM**: Implement stricter rate limiting
4. **MEDIUM**: Add CORS headers
5. **LOW**: Add input validation with Zod
```

---

### Workflow 2: Fix a Production Bug

**Scenario**: Users report that job search is returning incorrect results

#### Diagnosis Phase

**Step 1: Understand the Problem**
```bash
You: @database-architect Help me debug why job search is returning jobs
     from wrong locations. Users in London are seeing jobs in Manchester.
```

**What you get**:
```sql
-- Diagnostic queries to run

-- 1. Check if location indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'jobs' AND indexname LIKE '%location%';

-- 2. Check location data quality
SELECT
  location,
  COUNT(*) as count,
  AVG(ST_X(location_point)) as avg_lng,
  AVG(ST_Y(location_point)) as avg_lat
FROM jobs
GROUP BY location
HAVING COUNT(*) > 10;

-- 3. Check search query (likely issue)
EXPLAIN ANALYZE
SELECT *
FROM jobs
WHERE ST_DWithin(
  location_point,
  ST_MakePoint(-0.1276, 51.5074),  -- London coordinates
  50000  -- 50km radius in meters (this might be the bug!)
)
LIMIT 20;

-- ISSUE FOUND: Distance is in meters, but query uses 50000 (50km)
-- If users expect 10km, this is 5x too large!

-- Fix: Update search to use correct distance
WHERE ST_DWithin(
  location_point,
  ST_MakePoint(-0.1276, 51.5074),
  10000  -- 10km = 10,000 meters
)
```

**Step 2: Fix the Code**
```bash
You: @api-architect Fix the job search API to use the correct distance
     calculation. The distance should be in kilometers, not meters.
```

**What you get**:
```typescript
// apps/web/app/api/jobs/search/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusKm = parseInt(searchParams.get('radius') || '10');  // Default 10km

  // Convert km to meters for PostGIS
  const radiusMeters = radiusKm * 1000;  // THIS WAS MISSING!

  const { data, error } = await serverSupabase.rpc('search_jobs_nearby', {
    search_lat: lat,
    search_lng: lng,
    radius_meters: radiusMeters,  // Pass meters to database
  });

  // ... rest of code
}
```

**Step 3: Add Tests to Prevent Regression**
```bash
You: @testing-specialist Write a test to ensure job search distance
     filtering works correctly and doesn't regress.
```

**What you get**:
```typescript
// apps/web/app/api/jobs/search/__tests__/distance.test.ts

describe('Job Search Distance Filtering', () => {
  it('only returns jobs within specified radius', async () => {
    // London coordinates
    const londonLat = 51.5074;
    const londonLng = -0.1278;

    // Create test jobs
    await createTestJob({ lat: 51.5074, lng: -0.1278, title: 'London Job' }); // 0km
    await createTestJob({ lat: 51.5580, lng: -0.1276, title: 'Close Job' }); // 5km
    await createTestJob({ lat: 51.6074, lng: -0.1278, title: 'Far Job' }); // 12km

    // Search with 10km radius
    const response = await fetch(
      `/api/jobs/search?lat=${londonLat}&lng=${londonLng}&radius=10`
    );
    const data = await response.json();

    // Should return only jobs within 10km
    expect(data.jobs).toHaveLength(2);
    expect(data.jobs.map(j => j.title)).toEqual(['London Job', 'Close Job']);
    expect(data.jobs.map(j => j.title)).not.toContain('Far Job');
  });

  it('converts kilometers to meters correctly', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/jobs/search?lat=51.5074&lng=-0.1278&radius=5'
    );

    // Spy on database call
    const rpcSpy = jest.spyOn(serverSupabase, 'rpc');

    await GET(request);

    // Verify meters conversion
    expect(rpcSpy).toHaveBeenCalledWith('search_jobs_nearby', {
      search_lat: 51.5074,
      search_lng: -0.1278,
      radius_meters: 5000,  // 5km = 5000 meters
    });
  });
});
```

---

### Workflow 3: Add Mobile Support for a Feature

**Scenario**: The web recommendations feature needs to work on React Native mobile app

**Step 1: Adapt for Mobile**
```bash
You: @mobile-developer Port the recommendations feed from web to React Native.
     Maintain feature parity but optimize for mobile UX (pull-to-refresh,
     infinite scroll, native animations).
```

**What you get**:
```typescript
// apps/mobile/src/screens/RecommendationsScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useRecommendations } from '../hooks/useRecommendations';
import { RecommendationCard } from '../components/RecommendationCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function RecommendationsScreen() {
  const {
    recommendations,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    dismissRecommendation,
  } = useRecommendations();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: new Animated.Value(0).interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <RecommendationCard
          recommendation={item}
          onDismiss={() => dismissRecommendation(item.job.id)}
          onApply={() => handleApply(item.job.id)}
        />
      </Animated.View>
    ),
    [dismissRecommendation]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return <LoadingSpinner />;
  }, [hasMore]);

  if (loading && !refreshing && recommendations.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Unable to Load Recommendations"
        description="Please try again later"
        action={{ label: 'Retry', onPress: refresh }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recommendations}
        renderItem={renderItem}
        keyExtractor={(item) => item.job.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0D9488']} // Teal color
            tintColor="#0D9488"
          />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase"
            title="No Recommendations Yet"
            description="We'll notify you when we find jobs that match your preferences"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
});
```

**Mobile-specific optimizations**:
```typescript
// apps/mobile/src/components/RecommendationCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export function RecommendationCard({ recommendation, onDismiss, onApply }) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Swipe-to-dismiss gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      // Fade out as user swipes
      opacity.value = 1 - Math.abs(event.translationX) / 300;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 150) {
        // Swipe threshold reached - dismiss
        translateX.value = withTiming(event.translationX > 0 ? 400 : -400);
        opacity.value = withTiming(0, {}, () => {
          runOnJS(onDismiss)();
        });
      } else {
        // Snap back
        translateX.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* New badge */}
        {recommendation.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        {/* Match score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Match</Text>
          <Text style={styles.scoreValue}>{recommendation.score}%</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${recommendation.score}%` }]}
          />
        </View>

        {/* Job details */}
        <Text style={styles.title} numberOfLines={2}>
          {recommendation.job.title}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{recommendation.job.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              £{recommendation.job.budget.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Reasons */}
        <View style={styles.reasonsContainer}>
          {recommendation.reasons.slice(0, 3).map((reason, index) => (
            <View key={index} style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={onApply}
            android_ripple={{ color: '#0D9488' }}
          >
            <Text style={styles.primaryButtonText}>Apply Now</Text>
          </Pressable>
        </View>

        {/* Swipe hint */}
        <Text style={styles.swipeHint}>Swipe to dismiss →</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D9488',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0D9488',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  reasonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reasonText: {
    fontSize: 12,
    color: '#4B5563',
  },
  actions: {
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
```

---

## Daily Development Scenarios

### Scenario 1: Morning Code Review

**Task**: Review yesterday's PR before merging

```bash
# Step 1: Check frontend code quality
You: @frontend-specialist Review this PR for React best practices:
     https://github.com/yourorg/mintenance/pull/123

# Agent checks for:
# - Component structure and naming
# - Custom hooks usage
# - TypeScript types
# - Accessibility
# - Error boundaries

# Step 2: Check performance impact
You: @performance-optimizer Analyze the bundle size impact of PR #123

# Agent analyzes:
# - New dependencies added
# - Component lazy loading
# - Code splitting impact
# - Asset optimization

# Step 3: Security review
You: @security-expert Check PR #123 for security issues, especially the new
     payment form component

# Agent reviews:
# - Input validation
# - XSS vulnerabilities
# - Data encryption
# - API security
```

### Scenario 2: Debugging a CI/CD Failure

**Task**: Build is failing on production deployment

```bash
You: @devops-engineer The production build is failing with this error:
     "Module not found: Can't resolve '@/lib/auth'"

     Help me diagnose and fix it.
```

**What you get**:
```markdown
Build Failure Analysis:

## Root Cause:
Import path alias `@/` is not configured in production build

## Diagnosis Steps:
1. Check tsconfig.json paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./apps/web/*"]  // ✓ Configured
       }
     }
   }
   ```

2. Check next.config.js (ISSUE FOUND):
   ```javascript
   // Missing in production config!
   module.exports = {
     // ... other config
     // MISSING: webpack alias configuration
   }
   ```

## Fix:
Add webpack alias to next.config.js:

```javascript
module.exports = {
  // ... existing config
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'apps/web'),
    };
    return config;
  },
};
```

## Prevention:
1. Add build test to CI:
   ```yaml
   - name: Test production build
     run: NODE_ENV=production npm run build
   ```

2. Add path alias test:
   ```typescript
   // __tests__/path-aliases.test.ts
   import { something } from '@/lib/auth';
   expect(something).toBeDefined();
   ```
```

### Scenario 3: Optimizing a Slow API

**Task**: `/api/jobs/search` is taking 3+ seconds

```bash
You: @database-architect The job search API is slow (3s response time).
     Here's the query:

     SELECT * FROM jobs
     WHERE category = 'plumbing'
     AND ST_DWithin(location_point, ST_MakePoint(-0.1276, 51.5074), 10000)
     ORDER BY created_at DESC
     LIMIT 20;

     How do I optimize this?
```

**What you get**:
```sql
-- Performance Analysis:

-- 1. Check current query plan
EXPLAIN ANALYZE
SELECT * FROM jobs
WHERE category = 'plumbing'
AND ST_DWithin(location_point, ST_MakePoint(-0.1276, 51.5074), 10000)
ORDER BY created_at DESC
LIMIT 20;

-- Result shows:
-- Seq Scan on jobs (cost=0.00..15000.00 rows=100 width=500) (actual time=0.123..2847.456 rows=20)
-- ^ Sequential scan is SLOW! Need indexes

-- 2. Add composite GiST index for spatial + category
CREATE INDEX CONCURRENTLY idx_jobs_category_location_created
ON jobs
USING GIST (category, location_point, created_at DESC);

-- 3. Add partial index for open jobs (most common query)
CREATE INDEX CONCURRENTLY idx_jobs_open_category_location
ON jobs
USING GIST (category, location_point)
WHERE status = 'open';

-- 4. Update statistics
ANALYZE jobs;

-- 5. Test optimized query
EXPLAIN ANALYZE
SELECT * FROM jobs
WHERE category = 'plumbing'
AND status = 'open'  -- Added status filter to use partial index
AND ST_DWithin(location_point, ST_MakePoint(-0.1276, 51.5074), 10000)
ORDER BY created_at DESC
LIMIT 20;

-- Result after optimization:
-- Index Scan on idx_jobs_open_category_location (cost=0.42..125.45 rows=20) (actual time=0.032..45.123)
-- ^ 60x faster! (3000ms → 50ms)

-- 6. Add query result caching
-- In API route:
const cacheKey = `jobs:search:${category}:${lat}:${lng}:${radius}`;
const cached = await getCached(cacheKey);
if (cached) return cached;

-- Cache for 5 minutes
await setCache(cacheKey, results, 300);
```

---

## Agent Orchestration Patterns

### Pattern 1: The Full Stack Symphony

**Use Case**: Building a complete feature from scratch

**Orchestration Flow**:
```
1. @api-architect      → Design API endpoints
2. @database-architect → Design database schema
3. @ui-designer        → Design UI components
4. @frontend-specialist → Implement React components
5. @mobile-developer   → Port to React Native
6. @testing-specialist → Write tests
7. @security-expert    → Security audit
8. @performance-optimizer → Performance audit
9. @devops-engineer    → Deploy to production
```

**Example Command**:
```bash
You: I need to build a "Contractor Reviews & Ratings" feature.
     Orchestrate all agents to design and implement this feature
     from API to deployment.
```

### Pattern 2: The Bug Hunter

**Use Case**: Investigating and fixing a production bug

**Orchestration Flow**:
```
1. @database-architect → Check database for data integrity issues
2. @api-architect     → Review API logs and error patterns
3. @frontend-specialist → Check client-side error handling
4. @security-expert   → Rule out security-related issues
5. @testing-specialist → Add regression test
```

**Example Command**:
```bash
You: Users report that job bids are not appearing after submission.
     Coordinate @database-architect, @api-architect, and
     @frontend-specialist to debug this issue.
```

### Pattern 3: The Performance Squad

**Use Case**: Optimizing a slow feature

**Orchestration Flow**:
```
1. @performance-optimizer → Identify bottlenecks
2. @database-architect    → Optimize queries
3. @api-architect         → Add caching
4. @frontend-specialist   → Optimize rendering
5. @testing-specialist    → Add performance tests
```

**Example Command**:
```bash
You: The dashboard is slow to load (5+ seconds).
     Assemble @performance-optimizer, @database-architect,
     and @frontend-specialist to fix this.
```

---

## Team Collaboration Patterns

### Pattern 1: Sprint Planning

**Monday Morning - Sprint Kickoff**:

```bash
# 1. Review backlog
You: @api-architect Review the upcoming features and identify which need
     new API endpoints:
     - Contractor portfolio galleries
     - Job milestone tracking
     - Automated invoicing

# 2. Estimate complexity
You: @database-architect Estimate the database changes needed for each feature

# 3. Design UI
You: @ui-designer Create mockups for the three features

# 4. Identify risks
You: @security-expert Identify security considerations for each feature

# 5. Plan sprint
You: Based on agent feedback, create a sprint plan with:
     - Feature breakdown
     - Story points
     - Dependencies
     - Risk mitigation
```

### Pattern 2: Daily Standup Automation

**Every morning at 9 AM**:

```bash
# Create a script that runs daily
#!/bin/bash

echo "🌅 Morning Standup Report"
echo "========================="

# Check CI/CD status
@devops-engineer What's the status of all CI/CD pipelines?

# Check production health
@performance-optimizer Are there any performance regressions in production?

# Check security alerts
@security-expert Any security alerts from yesterday?

# Check test coverage
@testing-specialist What's our current test coverage?
```

### Pattern 3: Pre-Release Checklist

**Before every production deployment**:

```bash
# 1. Security audit
You: @security-expert Perform final security check on PR #156

# 2. Performance check
You: @performance-optimizer Verify no performance regressions

# 3. Database migrations
You: @database-architect Review and approve database migrations

# 4. API compatibility
You: @api-architect Verify API backward compatibility

# 5. Mobile testing
You: @mobile-developer Confirm mobile app still works with changes

# 6. Deployment plan
You: @devops-engineer Create deployment runbook for release v2.5.0
```

---

## Production Deployment

### Deployment Workflow

**Step-by-Step with Agents**:

#### Pre-Deployment (1 hour before)

```bash
# 1. Final testing
You: @testing-specialist Run full E2E test suite and report results

# 2. Performance baseline
You: @performance-optimizer Capture current production metrics as baseline

# 3. Database backup
You: @database-architect Verify latest backup completed successfully

# 4. Rollback plan
You: @devops-engineer Prepare rollback procedures for this deployment
```

#### Deployment (30 minutes)

```bash
# 1. Deploy database migrations
You: @database-architect Execute migrations in this order:
     1. Add new columns (non-breaking)
     2. Migrate data
     3. Remove old columns (after verification)

# 2. Deploy backend
You: @devops-engineer Deploy API with zero-downtime strategy

# 3. Deploy frontend
You: @devops-engineer Deploy web app with canary release (10% traffic)

# 4. Monitor metrics
You: @performance-optimizer Watch metrics dashboard for anomalies
```

#### Post-Deployment (1 hour after)

```bash
# 1. Verify functionality
You: @testing-specialist Run smoke tests on production

# 2. Check error rates
You: @devops-engineer Monitor error rates and alert if > 1%

# 3. Performance comparison
You: @performance-optimizer Compare metrics to pre-deployment baseline

# 4. Security scan
You: @security-expert Run production security scan

# 5. Mobile app compatibility
You: @mobile-developer Verify mobile app works with new API version
```

---

## Advanced Agent Combinations

### Combination 1: The AI Building Engineer + Database Architect

**Use Case**: Setting up the self-learning damage assessment system

```bash
You: I need @ai-building-engineer and @database-architect to work together
     to implement the Safe-LinUCB critic with Mondrian CP.

     @database-architect: Create the database schema for:
     - Calibration data storage (mondrian_calibration_data)
     - Critic model parameters (ab_critic_models)
     - FNR tracking (ab_critic_fnr_tracking)

     @ai-building-engineer: Review the schema and ensure it supports
     the full learning pipeline with proper indexes for performance.
```

### Combination 2: The Frontend + Performance + Security Trio

**Use Case**: Building a secure, fast payment form

```bash
You: Build a payment form with:
     @frontend-specialist: React component with validation
     @performance-optimizer: Minimize re-renders and bundle size
     @security-expert: PCI compliance and secure data handling

     Work together to create the optimal implementation.
```

### Combination 3: The Mobile + API + Database Team

**Use Case**: Adding offline support for mobile app

```bash
You: Implement offline job creation in mobile app:
     @mobile-developer: Add local storage and sync mechanism
     @api-architect: Design conflict resolution API
     @database-architect: Handle concurrent updates and data integrity
```

---

## Best Practices Summary

### 1. **Start with Architecture Agents First**
Always consult `@api-architect` and `@database-architect` before coding:
```bash
# ✅ Good
You: @api-architect Design the API first
You: @database-architect Design the schema
You: @frontend-specialist Implement the UI

# ❌ Bad
You: @frontend-specialist Build the UI
# (Now you might need to redesign when API changes)
```

### 2. **Always End with Testing & Security**
Every feature should be reviewed by:
```bash
You: @testing-specialist Write tests for this feature
You: @security-expert Audit for vulnerabilities
You: @performance-optimizer Check for performance issues
```

### 3. **Use Agents for Code Reviews**
Before merging PRs:
```bash
You: @frontend-specialist Review PR #123 for React best practices
You: @security-expert Check PR #123 for security issues
```

### 4. **Combine Agents for Complex Tasks**
Don't be afraid to use multiple agents:
```bash
You: I need @api-architect, @database-architect, and @security-expert
     to design a secure, scalable authentication system
```

### 5. **Keep Agents Updated**
As your codebase evolves, update agent files:
```bash
# Add new patterns you discover
echo "## New Pattern: GraphQL Subscriptions" >> .claude/agents/api-architect.md
echo "- Use graphql-ws for WebSocket connections" >> .claude/agents/api-architect.md
echo "- Implement authentication via connection params" >> .claude/agents/api-architect.md
```

---

## Quick Reference

### Agent Selection Guide

| Need | Use This Agent |
|------|----------------|
| API design | `@api-architect` |
| Database schema | `@database-architect` |
| React components | `@frontend-specialist` |
| UI/UX design | `@ui-designer` |
| Performance issues | `@performance-optimizer` |
| Security audit | `@security-expert` |
| Test writing | `@testing-specialist` |
| CI/CD & deployment | `@devops-engineer` |
| React Native | `@mobile-developer` |
| AI damage assessment | `@ai-building-engineer` |

### Common Commands

```bash
# Feature development
@api-architect Design API for [feature]
@database-architect Design schema for [feature]
@frontend-specialist Implement [feature] component
@testing-specialist Write tests for [feature]

# Bug fixing
@database-architect Debug this SQL query
@frontend-specialist Fix this React error
@devops-engineer Debug CI/CD failure

# Optimization
@performance-optimizer Optimize [feature]
@database-architect Optimize this query
@frontend-specialist Reduce bundle size

# Security
@security-expert Audit [feature]
@security-expert Review authentication flow

# Deployment
@devops-engineer Create deployment plan
@devops-engineer Setup monitoring
```

---

**You now have the complete playbook for using all 11 agents to build the best Mintenance SaaS! 🚀**

Start with any workflow above and adapt to your needs. The agents are your specialized team members - use them freely and frequently!
